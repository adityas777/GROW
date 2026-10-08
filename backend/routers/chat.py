"""
/chat router — main conversation endpoint.
Orchestrates: guardrails → intent → tools → response → guardrails.
"""
import asyncio
import logging
import time
from fastapi import APIRouter, Request
from pydantic import BaseModel

from core import guardrails, intent_router, tools, responder, sessions, notifications

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    text: str
    session_id: str | None = None
    lang: str = "hinglish"
    user_email: str | None = None
    user_name: str | None = None


class ChatResponse(BaseModel):
    reply: str
    intent: str
    confidence: float
    session_id: str
    guardrail_fired: bool = False
    plan: dict | None = None
    confirm_token: str | None = None
    needs_confirmation: bool = False
    quick_replies: list[str] = []
    glossary: dict | None = None
    language: str = "hinglish"


# Quick reply suggestions by intent
QUICK_REPLIES = {
    "start_sip": ["₹500 se shuru karun", "₹1,000 invest karun", "Pehle samjhao"],
    "explain_term": ["NAV kya hai?", "SIP kya hota hai?", "Expense ratio?"],
    "check_portfolio": ["Portfolio dikhao", "Kitna return mila?"],
    "paycheck_split": ["Salary aayi hai", "Split dikhao"],
    "out_of_scope_or_chitchat": ["SIP kya hai?", "₹500 se invest karun?", "Salary aayi hai"],
}

ONBOARDING_QUESTIONS = [
    "Kitne saal ke liye paisa lagana chahte ho? 1 saal se kam, 1 se 3, ya 3 se zyada?",
    "Risk ke saath kitna comfortable feel karte ho? 🟢 Safe (FD-type) | 🟡 Medium (thoda upar-neeche) | 🔴 Bold (zyada risk, zyada potential)",
]


@router.post("", response_model=ChatResponse)
async def chat(req: ChatRequest, request: Request):
    start_time = time.time()

    # Get or create session
    session_id = req.session_id
    if not session_id or not sessions.load_session(session_id):
        session_id = sessions.create_session()

    state = sessions.load_session(session_id)

    # Update name/email if provided
    if req.user_name:
        state["profile"]["name"] = req.user_name
    if req.user_email:
        state["user_email"] = req.user_email

    # ── 1. Guardrails PRE-check ──────────────────────────────────────────────
    pre = guardrails.pre_check(req.text)
    if pre.blocked:
        state["guardrail_violations"] = state.get("guardrail_violations", 0) + 1
        sessions.add_message(session_id, "user", req.text, guardrail_flag=pre.reason)

        # Fire Slack alert
        asyncio.create_task(
            notifications.send_slack_alert(
                f"Guardrail PRE fired: `{pre.reason}`\nUser: `{req.text[:100]}`",
                color="warning",
            )
        )

        reply = pre.alt
        sessions.add_message(session_id, "assistant", reply, guardrail_flag=pre.reason)
        sessions.save_session(session_id, state)

        return ChatResponse(
            reply=reply,
            intent="blocked",
            confidence=1.0,
            session_id=session_id,
            guardrail_fired=True,
            quick_replies=["SIP kya hai?", "Safe investment options?", "₹500 se shuru karun"],
        )

    # ── 2. Intent classification ─────────────────────────────────────────────
    intent_result = await intent_router.classify(req.text, state)
    intent = intent_result.get("intent", "out_of_scope_or_chitchat")
    confidence = intent_result.get("confidence", 0.5)
    slots = intent_result.get("slots", {})
    text_lower = req.text.lower()
    # ── Language selection & persistence ─────────────────────────────────────
    lang = intent_result.get("language") or req.lang or state.get("language", "hinglish")
    if any(w in text_lower for w in ["english", "in english", "talk in english", "speak in english"]):
        lang = "en"
    elif any(w in text_lower for w in ["hindi mein", "hindi me", "shuddh hindi"]):
        lang = "hi"
    state["language"] = lang

    # ── Deterministic Slot Fallbacks from user text ─────────────────────────
    if not slots.get("horizon"):
        if any(w in text_lower for w in ["10 years", "15 years", "10-15", "5 years", "5 saal", "10 saal", "3 saal", "3+", "lambi daud", "long term"]):
            slots["horizon"] = "long"
        elif any(w in text_lower for w in ["1 se 3", "2 saal", "2 years", "1-3"]):
            slots["horizon"] = "medium"
        elif any(w in text_lower for w in ["1 saal se kam", "< 1", "kuch mahine"]):
            slots["horizon"] = "short"

    if not slots.get("risk"):
        if any(w in text_lower for w in ["safe", "low", "kam risk", "surakshit"]):
            slots["risk"] = "low"
        elif any(w in text_lower for w in ["medium", "moderate", "madhyam", "thoda"]):
            slots["risk"] = "medium"
        elif any(w in text_lower for w in ["bold", "high", "zyada risk", "growth"]):
            slots["risk"] = "high"

    # Update profile from slots
    if slots.get("amount"):
        sessions.update_profile(session_id, {"amount": slots["amount"]})
    if slots.get("horizon"):
        sessions.update_profile(session_id, {"horizon": slots["horizon"]})
    if slots.get("risk"):
        sessions.update_profile(session_id, {"risk": slots["risk"]})

    sessions.add_message(session_id, "user", req.text, intent=intent, confidence=confidence)

    # ── 3. Tool execution ────────────────────────────────────────────────────
    tool_result = None
    plan = None
    confirm_token = None
    needs_confirmation = False
    glossary_data = None
    custom_quick_replies = None

    if intent == "explain_term":
        term = slots.get("term") or _extract_term(req.text)
        glossary_data = tools.get_glossary(term) if term else None
        reply = await responder.generate_jargon_explanation(term or req.text, glossary_data, lang)
        sessions.add_message(session_id, "assistant", reply, intent=intent)
        sessions.save_session(session_id, state)
        return ChatResponse(
            reply=reply,
            intent=intent,
            confidence=confidence,
            session_id=session_id,
            glossary=glossary_data,
            quick_replies=["Start ₹500 SIP", "Explore Portfolio", "Paycheck Split"] if lang == "en" else ["Kaunsa fund lu?", "SIP shuru karun?", "₹500 invest karun"],
        )

    elif intent == "start_sip":
        profile = sessions.get_profile(session_id)
        # Default fallback for beginners if not provided
        invest_amount = profile.get("amount") or slots.get("amount") or 500
        horizon = profile.get("horizon") or slots.get("horizon") or "long"
        risk = profile.get("risk") or slots.get("risk") or "medium"
        
        # Save inferred slots
        sessions.update_profile(session_id, {"amount": invest_amount, "horizon": horizon, "risk": risk})
        profile = sessions.get_profile(session_id)

        # Calculate projections for 10 and 15 years
        proj_10 = tools.calculate_sip_projection(invest_amount, 10, 12.0)
        proj_15 = tools.calculate_sip_projection(invest_amount, 15, 12.0)

        # Recommend funds
        funds = tools.recommend_plan(profile)
        primary = funds[0] if funds else None

        if primary:
            plan = {
                "fund_id": primary["id"],
                "fund_name": primary["name"],
                "amount": invest_amount,
                "risk": primary["risk"],
                "horizon": horizon,
                "one_line": primary["one_line"],
                "what_can_go_wrong": primary["what_can_go_wrong"],
                "expense_ratio": primary["expense_ratio"],
                "mock_nav": primary["mock_nav"],
                "mock_1yr_return": primary["mock_1yr_return"],
                "category": primary["category"],
                "alternatives": funds[1:],
                "projection_10yr": proj_10,
                "projection_15yr": proj_15,
            }
            confirm_token = tools.create_confirm_token(session_id, plan)
            sessions.set_pending_plan(session_id, plan, confirm_token)
            needs_confirmation = True

            tool_result = {
                "recommended_fund": primary["name"],
                "monthly_amount": invest_amount,
                "expense_ratio": primary["expense_ratio"],
                "10_year_projection": f"Invested: ₹{proj_10['total_invested']:,} -> Est. Value: ₹{proj_10['estimated_value']:,} (Gains: ₹{proj_10['estimated_gains']:,})",
                "15_year_projection": f"Invested: ₹{proj_15['total_invested']:,} -> Est. Value: ₹{proj_15['estimated_value']:,} (Gains: ₹{proj_15['estimated_gains']:,})",
                "risk_profile": primary["risk"],
                "category": primary["category"],
            }
            reply = await responder.generate_response(intent, tool_result, state, req.text, lang)
            custom_quick_replies = [f"Confirm ₹{invest_amount:,.0f} Plan", "View Portfolio", "Paycheck Planner"] if lang == "en" else [f"₹{invest_amount:,.0f} SIP Confirm karo", "Portfolio dekhein", "Paycheck split"]
        else:
            reply = "I couldn't match a fund right now. Please tell me your preferred monthly amount or risk tolerance." if lang == "en" else "Fund dhundhne mein issue hua. Thoda detail batao."

    elif intent == "paycheck_split":
        amount = slots.get("amount") or state["profile"].get("income", 8000)
        split = tools.split_paycheck(float(amount), state["profile"])
        tool_result = split
        reply = await responder.generate_response(intent, tool_result, state, req.text, lang)
        plan = {"type": "paycheck_split", "split": split, "total": amount}
        custom_quick_replies = ["Apply 50-30-20 Split", "View Portfolio", "Start SIP"] if lang == "en" else ["Split apply karo", "Portfolio dikhao", "SIP shuru karo"]

    elif intent == "check_portfolio":
        portfolio = tools.get_portfolio(session_id)
        tool_result = portfolio
        reply = await responder.generate_response(intent, tool_result, state, req.text, lang)
        custom_quick_replies = ["Go to Portfolio (/portfolio)", "Start New SIP", "Salary Split"] if lang == "en" else ["Portfolio tab (/portfolio)", "Naya SIP karo", "Salary split"]

    elif intent in ("stock_tip_request", "guaranteed_returns", "fno_or_crypto_interest"):
        if lang == "en":
            refusals = {
                "stock_tip_request": "I cannot provide specific stock recommendations under SEBI guidelines. Diversified index funds are safer and proven for first-time investors. Would you like to explore index funds?",
                "guaranteed_returns": "Mutual funds never guarantee returns as they fluctuate with market movements. Over the long run, diversified equity has historically outpaced inflation. Let's look at realistic options.",
                "fno_or_crypto_interest": "F&O and crypto carry extreme risks for beginners. It's much safer to build a solid foundation with low-cost index funds first.",
            }
        else:
            refusals = {
                "stock_tip_request": "Main individual stock tips nahi de sakta — yeh SEBI guidelines ke against hai. Index funds safe aur diversified hote hain — explore karte hain? 🌱",
                "guaranteed_returns": "Koi bhi mutual fund guaranteed returns nahi deta — yeh market risk hai. Lekin historically, long-term equity funds ne solid growth di hai. Risk ke saath options dekhein?",
                "fno_or_crypto_interest": "F&O aur crypto bahut risky hain beginners ke liye. Pehle solid foundation banao — index funds se start karo. Main help kar sakta hoon! 🙏",
            }
        reply = refusals.get(intent, "This query is outside my safety scope. Can I help with SIP or mutual funds?")

    elif intent == "panic_or_distress":
        if lang == "en":
            reply = (
                "Market fluctuations can feel unsettling, especially when starting out. "
                "Historically, diversified index funds recover and grow over long time horizons. "
                "Take a breath before making any impulsive moves. Would you like me to explain how market cycles work?"
            )
        else:
            reply = (
                "Samajh sakta hoon — market mein fluctuation scary lagti hai. 😌\n\n"
                "Ek important fact: long-term mein markets historically recover karte hain. "
                "Lekin main tumhe koi action lene ki advice nahi dunga abhi — "
                "pehle thanda ho jao, phir sochna."
            )

    elif intent == "how_much_to_invest":
        income = slots.get("amount") or state["profile"].get("income")
        if not income:
            reply = "Could you tell me roughly your monthly income? That will help calculate a realistic budget." if lang == "en" else "Pehle batao — monthly income roughly kitni hai? (Don't worry, yeh sirf estimate ke liye hai) 🤝"
        else:
            sessions.update_profile(session_id, {"income": income})
            suggested = round(float(income) * 0.10 / 100) * 100
            suggested = max(500, min(suggested, float(income) * 0.20))
            tool_data = {
                "monthly_income": income,
                "suggested_sip": suggested,
                "percentage_of_income": "10-15%",
                "budget_rule": "50% Needs, 30% Wants, 20% Savings/Investments",
                "paycheck_page": "/paycheck",
            }
            reply = await responder.generate_response(intent, tool_data, state, req.text, lang)
            custom_quick_replies = [f"Start ₹{suggested:,.0f} SIP", "Open Paycheck Planner", "Check Portfolio"] if lang == "en" else [f"₹{suggested:,.0f} SIP start karein", "Paycheck Planner kholo", "Portfolio dekhein"]

    else:  # out_of_scope_or_chitchat
        reply = await responder.generate_response(intent, None, state, req.text, lang)

    # ── 4. Guardrails POST-check ──────────────────────────────────────────────
    post = guardrails.post_check(reply, intent, lang=lang)
    if not post.ok:
        reply = post.safe_rewrite
    elif post.safe_rewrite and post.safe_rewrite != reply:
        reply = post.safe_rewrite

    sessions.add_message(session_id, "assistant", reply, intent=intent)
    sessions.save_session(session_id, state)

    elapsed = (time.time() - start_time) * 1000
    logger.info(f"[CHAT] intent={intent} conf={confidence:.2f} time={elapsed:.0f}ms")

    return ChatResponse(
        reply=reply,
        intent=intent,
        confidence=confidence,
        session_id=session_id,
        plan=plan,
        confirm_token=confirm_token,
        needs_confirmation=needs_confirmation,
        quick_replies=custom_quick_replies or QUICK_REPLIES.get(intent, ["SIP kya hai?", "Fund dikhao", "Portfolio check"]),
        glossary=glossary_data,
        language=lang,
    )


@router.post("/confirm")
async def confirm_order(req: Request):
    """Confirm a pending sandbox order."""
    body = await req.json()
    session_id = body.get("session_id")
    token = body.get("confirm_token")
    user_email = body.get("user_email")
    user_name = body.get("user_name")
    plan = body.get("plan")

    if not session_id:
        return {"success": False, "error": "session_id required"}

    state = sessions.load_session(session_id) or {}
    token = token or state.get("pending_token") or "sandbox_token"
    pending = state.get("pending_plan") or plan or {
        "fund_id": "nifty_50",
        "fund_name": "Nifty 50 Index Fund",
        "amount": 500,
        "risk": "Low"
    }

    # Execute sandbox order
    result = tools.create_sandbox_order(session_id, token, pending)
    if result["success"]:
        sessions.clear_pending_plan(session_id)
        order = result["order"]

        # Send confirmation email
        if user_email:
            asyncio.create_task(
                notifications.send_email(
                    to=user_email,
                    subject="✅ Pehla ₹500 — Investment Set! 🎊",
                    html_body=notifications.build_order_confirmation_email(user_name, order),
                )
            )

        sessions.add_message(session_id, "assistant", f"✅ Confirmed! Order ID: {order['order_id']} — SANDBOX MODE", intent="order_confirmed")

    return result


def _extract_term(text: str) -> str:
    """Simple extraction of financial term from text."""
    financial_terms = [
        "sip", "nav", "expense ratio", "mutual fund", "xirr", "elss",
        "index fund", "diversification", "debt fund", "equity", "nifty",
        "sensex", "aum", "exit load", "lock in", "redemption",
    ]
    text_lower = text.lower()
    for term in financial_terms:
        if term in text_lower:
            return term
    return text  # Use full text as fallback
