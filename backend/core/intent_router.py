"""
Intent Router — Groq-powered classifier
Returns: {intent, confidence, slots: {amount, horizon, risk, term}}
"""
import os
import json
import logging
from groq import AsyncGroq

logger = logging.getLogger(__name__)

INTENTS = [
    "start_sip",
    "explain_term",
    "compare_options",
    "paycheck_split",
    "check_portfolio",
    "how_much_to_invest",
    "stock_tip_request",
    "guaranteed_returns",
    "fno_or_crypto_interest",
    "panic_or_distress",
    "out_of_scope_or_chitchat",
]

SYSTEM_PROMPT = """You classify messages from first-time Indian investors (Hinglish, Hindi, English mix).
Return ONLY a JSON object with no extra text:
{
  "intent": "<one of the 11 intents below>",
  "confidence": <0.0 to 1.0>,
  "slots": {
    "amount": <number or null>,
    "horizon": "<short|medium|long or null>",
    "risk": "<low|medium|high or null>",
    "term": "<financial term asked about, or null>",
    "fund1": "<fund name if comparing, or null>",
    "fund2": "<fund name if comparing, or null>"
  },
  "language": "<hi|hinglish|en>"
}

Intents:
1. start_sip — wants to start a SIP / investment
2. explain_term — asking what a financial term means (NAV, SIP, XIRR, expense ratio, etc.)
3. compare_options — wants to compare two investment options or funds
4. paycheck_split — income event, wants to split salary/stipend
5. check_portfolio — wants to see their portfolio
6. how_much_to_invest — asking how much they should invest
7. stock_tip_request — asking for stock tips or "which stock to buy"
8. guaranteed_returns — asking for guaranteed/fixed returns (refuse)
9. fno_or_crypto_interest — asking about F&O, crypto, NFT (redirect)
10. panic_or_distress — scared, "market gir raha hai", "sab bech du?", emotional
11. out_of_scope_or_chitchat — anything else, jokes, weather, etc.

Rules:
- horizon: "short" = under 1 year, "medium" = 1-3 years, "long" = 3+ years
- If message is ambiguous, lower confidence to 0.4-0.5
- DO NOT answer the user. Only classify.
- Pay attention to Hinglish patterns: "kaunsa fund lu", "kitna lagaun", "ghabra gaya"
"""

client: AsyncGroq | None = None


def get_client() -> AsyncGroq:
    global client
    if client is None:
        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    return client


async def classify(text: str, session_state: dict = None) -> dict:
    """Classify user message intent using Groq with multi-model fallback and regex slot extraction."""
    c = get_client()
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add session context if available
    if session_state and session_state.get("messages"):
        recent = session_state["messages"][-4:]  # last 4 messages for context
        for m in recent:
            messages.append({"role": m["role"], "content": m["text"]})

    messages.append({"role": "user", "content": text})

    result = None
    for model_name in ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"]:
        try:
            resp = await c.chat.completions.create(
                model=model_name,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=350,
            )
            raw = resp.choices[0].message.content
            if raw and raw.strip():
                data = json.loads(raw)
                if isinstance(data, dict) and data.get("intent"):
                    result = data
                    break
        except Exception as e:
            logger.warning(f"[INTENT] {model_name} failed: {e}")
            continue

    if not result:
        result = {"intent": "out_of_scope_or_chitchat", "confidence": 0.5, "slots": {}, "language": "hinglish"}

    # ── Post-process / Regex Fallback Slot Extraction ─────────────────────
    import re
    lower = text.lower()
    slots = result.setdefault("slots", {})

    # Detect language intent
    if any(w in lower for w in ["english", "in english", "talk in english", "speak in english"]):
        result["language"] = "en"
    elif any(w in lower for w in ["shuddh hindi", "hindi me", "hindi mein"]):
        result["language"] = "hi"

    # Extract monetary amounts (e.g. 500, 2000, 35,000, 35000)
    amt_match = re.search(r'(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:rupees?|rupaye|rs|pm|per month|monthly|\/month)?', lower)
    if amt_match:
        try:
            extracted_num = float(amt_match.group(1).replace(',', ''))
            if extracted_num >= 100:
                if not slots.get("amount") or slots.get("amount") == 500:
                    slots["amount"] = extracted_num
        except Exception:
            pass

    # Extract time horizon & years (e.g. 10 to 15 years, 10 years, 5 saal)
    years_match = re.search(r'(\d+)\s*(?:to|-)\s*(\d+)\s*(?:years?|saal)|(\d+)\s*(?:years?|saal)', lower)
    if years_match:
        slots["horizon"] = "long"
        y = int(years_match.group(1) or years_match.group(3))
        slots["years"] = y
    elif any(w in lower for w in ["10 years", "15 years", "5 years", "3 saal", "3+", "long term", "lambi daud"]):
        slots["horizon"] = "long"
    elif any(w in lower for w in ["1 se 3", "2 saal", "1-3"]):
        slots["horizon"] = "medium"
    elif any(w in lower for w in ["1 saal se kam", "< 1", "kuch mahine"]):
        slots["horizon"] = "short"

    # Extract risk
    if any(w in lower for w in ["safe", "low risk", "kam risk", "fd-type"]):
        slots["risk"] = "low"
    elif any(w in lower for w in ["medium", "moderate", "thoda"]):
        slots["risk"] = "medium"
    elif any(w in lower for w in ["high risk", "bold", "zyada risk", "growth"]):
        slots["risk"] = "high"

    # Fix intent for income budgeting vs SIP
    if "income" in lower or "salary" in lower or "earn" in lower:
        if any(w in lower for w in ["how should i invest", "how much", "plan", "save"]):
            result["intent"] = "how_much_to_invest"
            result["confidence"] = 0.9

    if any(w in lower for w in ["make a plan", "plan for me", "return after", "how should i invest"]):
        if result.get("intent") == "out_of_scope_or_chitchat":
            result["intent"] = "start_sip"
            result["confidence"] = 0.9

    if result.get("intent") not in INTENTS:
        result["intent"] = "out_of_scope_or_chitchat"
        result["confidence"] = 0.5

    logger.info(f"[INTENT] {result['intent']} conf={result.get('confidence', 0):.2f} slots={slots} text={text[:60]}")
    return result
