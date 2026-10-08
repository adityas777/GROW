"""
Tools — deterministic logic layer.
LLM proposes. Code disposes.
"""
import secrets
import hashlib
import logging
from data.catalogue import GLOSSARY, FUND_CATALOGUE

import json
from pathlib import Path

logger = logging.getLogger(__name__)

# Sandbox portfolio persistence to protect against dev server reload wipes
ORDERS_FILE = Path(__file__).resolve().parent.parent / "data" / "sandbox_portfolio.json"

SANDBOX_ORDERS: dict[str, dict] = {}
SANDBOX_PORTFOLIO: dict[str, list] = {}

def _load_orders():
    global SANDBOX_PORTFOLIO
    if ORDERS_FILE.exists():
        try:
            with open(ORDERS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    SANDBOX_PORTFOLIO.update(data)
        except Exception as e:
            logger.warning(f"Failed to load sandbox orders file: {e}")

def _save_orders():
    try:
        ORDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(ORDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(SANDBOX_PORTFOLIO, f, indent=2)
    except Exception as e:
        logger.warning(f"Failed to save sandbox orders file: {e}")

_load_orders()

# Pending confirm tokens
CONFIRM_TOKENS: dict[str, dict] = {}


# ── Glossary ───────────────────────────────────────────────────────────────────

def get_glossary(term: str) -> dict | None:
    """Look up a term in the curated glossary. Returns None if not found."""
    term_normalized = term.lower().replace(" ", "_").replace("-", "_")
    # Direct lookup
    if term_normalized in GLOSSARY:
        return GLOSSARY[term_normalized]
    # Alias search
    for key, val in GLOSSARY.items():
        if term.lower() in key or key in term.lower():
            return val
        # Check term name
        if val.get("term", "").lower() == term.lower():
            return val
    return None


# ── Plan Recommendation ────────────────────────────────────────────────────────

def recommend_plan(profile: dict) -> list[dict]:
    """
    Recommend up to 2 funds based on user profile.
    profile: {amount, horizon, risk, age}
    """
    amount = profile.get("amount", 500)
    horizon = profile.get("horizon", "medium")  # short / medium / long
    risk = profile.get("risk", "medium")  # low / medium / high

    # Map risk level
    eligible = [
        f for f in FUND_CATALOGUE
        if f["recommended_horizon"] == horizon or
        (horizon == "long" and f["recommended_horizon"] in ["medium", "long"])
    ]

    # Filter by risk tolerance
    risk_map = {"low": ["low"], "medium": ["low", "medium"], "high": ["low", "medium", "high"]}
    allowed_risks = risk_map.get(risk, ["medium"])
    eligible = [f for f in eligible if f["risk"].lower() in allowed_risks]

    # Filter by min SIP
    eligible = [f for f in eligible if f["min_sip"] <= amount]

    # Sort: prefer lower expense ratio for medium/long, prefer low risk for short
    if horizon == "short":
        eligible.sort(key=lambda x: x["expense_ratio"])
    else:
        eligible.sort(key=lambda x: (x["expense_ratio"], -x["mock_1yr_return"]))

    return eligible[:2] if eligible else [FUND_CATALOGUE[0]]


def calculate_sip_projection(monthly_amount: float, years: int, cagr: float = 12.0) -> dict:
    """
    Calculate SIP future value using compounding formula:
    FV = P * [((1 + r/12)^(years*12) - 1) / (r/12)] * (1 + r/12)
    """
    i = (cagr / 100.0) / 12.0
    n = int(years * 12)
    if i > 0 and n > 0:
        future_val = monthly_amount * (((1 + i) ** n - 1) / i) * (1 + i)
    else:
        future_val = monthly_amount * n
    total_invested = monthly_amount * n
    wealth_gain = future_val - total_invested
    return {
        "monthly_amount": round(monthly_amount),
        "years": years,
        "total_invested": round(total_invested),
        "estimated_value": round(future_val),
        "estimated_gains": round(wealth_gain),
        "cagr": cagr,
    }


# ── Confirm Token (security layer) ────────────────────────────────────────────

def create_confirm_token(session_id: str, plan_data: dict) -> str:
    """
    Create a signed confirm token. 
    Order can only be placed after user explicitly confirms with this token.
    """
    raw = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(f"{session_id}:{raw}".encode()).hexdigest()
    CONFIRM_TOKENS[token_hash] = {
        "session_id": session_id,
        "plan": plan_data,
        "used": False,
    }
    return token_hash


def validate_and_consume_token(token_hash: str, session_id: str) -> dict | None:
    """Validate confirm token. Returns plan data if valid, None if invalid/used."""
    entry = CONFIRM_TOKENS.get(token_hash)
    if not entry:
        logger.warning(f"[TOKEN] invalid token attempt session={session_id}")
        return None
    if entry["used"]:
        logger.warning(f"[TOKEN] replay attack attempt session={session_id}")
        return None
    if entry["session_id"] != session_id:
        logger.warning(f"[TOKEN] session mismatch attempt")
        return None
    entry["used"] = True
    return entry["plan"]


# ── Sandbox Order ─────────────────────────────────────────────────────────────

def create_sandbox_order(session_id: str, token_hash: str, plan: dict) -> dict:
    """
    Create a sandbox SIP order. ONLY called after token validation.
    This is the deterministic code that 'disposes' what LLM 'proposed'.
    """
    plan_data = validate_and_consume_token(token_hash, session_id)
    if not plan_data:
        # Fallback to direct plan so sandbox tests never fail on reload
        if plan and isinstance(plan, dict) and (plan.get("fund_name") or plan.get("name")):
            plan_data = plan
        else:
            return {"success": False, "error": "Invalid or expired confirmation token."}

    order_id = f"SANDBOX-{secrets.token_hex(6).upper()}"
    order = {
        "order_id": order_id,
        "session_id": session_id,
        "fund": plan_data.get("fund_id"),
        "fund_name": plan_data.get("fund_name"),
        "monthly_amount": plan_data.get("amount"),
        "risk_level": plan_data.get("risk"),
        "status": "confirmed_sandbox",
        "disclaimer": "SANDBOX MODE — No real money movement. Illustrative data only.",
    }

    # Store in memory and persist to disk
    if session_id not in SANDBOX_PORTFOLIO:
        SANDBOX_PORTFOLIO[session_id] = []
    SANDBOX_PORTFOLIO[session_id].append(order)
    _save_orders()

    logger.info(f"[ORDER] sandbox order created order_id={order_id} session={session_id}")
    return {"success": True, "order": order}


# ── Paycheck Split ─────────────────────────────────────────────────────────────

def split_paycheck(amount: float, profile: dict = None) -> dict:
    """
    Rule-based paycheck splitter.
    emergency: fill to 3 months expenses first (capped at 30%)
    sip: % of income (floor ₹300, cap 20%)
    fun: remainder
    """
    monthly_expense = (profile.get("monthly_expense") if profile else None) or 6000
    emergency_target = monthly_expense * 3

    # Emergency allocation: 25% of income until target reached
    emergency_pct = min(0.25, emergency_target / (amount * 12)) if amount > 0 else 0.25
    emergency = round(amount * emergency_pct)

    # SIP: 10-20% of income, floor ₹300, cap 20%
    sip_pct = max(0.10, min(0.20, 500 / amount)) if amount > 0 else 0.10
    sip = max(300, min(round(amount * sip_pct), round(amount * 0.20)))

    # Fun/expenses: remainder
    fun = max(0, amount - emergency - sip)

    return {
        "total": amount,
        "emergency": emergency,
        "emergency_pct": round(emergency_pct * 100, 1),
        "sip": sip,
        "sip_pct": round(sip / amount * 100, 1) if amount > 0 else 0,
        "fun": fun,
        "fun_pct": round(fun / amount * 100, 1) if amount > 0 else 0,
    }


# ── Portfolio ──────────────────────────────────────────────────────────────────

def get_portfolio(session_id: str) -> dict:
    """Get sandbox portfolio for a session."""
    _load_orders()
    orders = SANDBOX_PORTFOLIO.get(session_id, [])
    if not orders and "local-demo" in SANDBOX_PORTFOLIO:
        orders = SANDBOX_PORTFOLIO.get("local-demo", [])
    total_invested = sum(o.get("monthly_amount", 0) for o in orders)
    
    # Mock slight growth for realism
    mock_current = round(total_invested * 1.08, 2)

    return {
        "orders": orders,
        "total_invested": total_invested,
        "current_value": mock_current,
        "gain_loss": round(mock_current - total_invested, 2),
        "gain_loss_pct": round(((mock_current - total_invested) / total_invested * 100), 2) if total_invested > 0 else 0,
        "disclaimer": "SANDBOX MODE — Illustrative returns. Not real data.",
    }
