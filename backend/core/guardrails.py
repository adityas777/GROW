"""
Guardrails — pre-check and post-check for LLM messages.
Two layers:
1. Pre-check: keyword + regex blocking before LLM call
2. Post-check: scan reply for banned patterns, require risk disclosure on plans
"""
import re
import logging

logger = logging.getLogger(__name__)

# ── Pre-check banned patterns ──────────────────────────────────────────────────
PRE_BLOCK_PATTERNS = [
    (r"guaranteed?\s*(return|profit|income|gain)", "guaranteed_returns"),
    (r"pakka\s*(return|profit|paisa milega)", "guaranteed_returns"),
    (r"sure\s*shot", "guaranteed_returns"),
    (r"(100|100%)%?\s*(safe|profit|return)", "guaranteed_returns"),
    (r"double\s*(ho|kar|jaaye|karoge)", "double_money"),
    (r"(stock|share)\s*(tip|bata|batao|recommend)", "stock_tip"),
    (r"kaunsa\s+stock\s+(lu|khareedu)", "stock_tip"),
    (r"(futures|options|f&o|f and o|derivatives)", "fno"),
    (r"(bitcoin|crypto|nft|token|web3)", "crypto"),
    (r"(loan|udhar|borrow|credit card)\s*(lekar|se|mein)\s*(invest|lagao)", "leverage_invest"),
    (r"emergency\s*(fund|paisa|savings)\s*(invest|lagao|lagana)", "emergency_invest"),
    (r"ignore\s*(previous|above|all|instructions|rules)", "prompt_injection"),
    (r"jailbreak|bypass|override\s*(rules|guardrails|policy)", "prompt_injection"),
    (r"tax\s*(advice|bata|calculation|plan)", "tax_advice"),
    (r"legal\s*(advice|help|opinion)", "legal_advice"),
]

# Post-check patterns — replies must NOT contain these
POST_BLOCK_PATTERNS = [
    r"guaranteed?\s*(return|profit)",
    r"pakka\s*(milega|profit|return)",
    r"sure\s*shot",
    r"(will|definitely|certainly)\s*(give|return|earn|make)\s*\d+",
    r"ignore\s*(rules|previous|instructions)",
]

RISK_REQUIRED_INTENTS = {"start_sip", "compare_options", "how_much_to_invest"}

SAFE_ALTERNATIVES = {
    "guaranteed_returns": "Koi bhi investment 100% guaranteed nahi hoti. Main tumhe risk ke saath options dikhata hoon.",
    "double_money": "Paisa double karna magic nahi — compounding se hota hai, time ke saath. Main ek realistic plan dikha sakta hoon.",
    "stock_tip": "Main individual stock tips nahi de sakta — yeh SEBI guidelines ke against hai aur tumhare liye safe nahi. Index fund explore karte hain?",
    "fno": "F&O bahut risky hai beginners ke liye — leverage se losses bhi multiply hote hain. Basics se shuru karte hain?",
    "crypto": "Crypto unregulated aur highly volatile hai. Pehle mutual funds mein solid base banao.",
    "leverage_invest": "Loan lekar invest karna dangerous hai — agar market giri toh tum debt mein bhi rahoge. Sirf apna paisa lagao.",
    "emergency_invest": "Emergency fund kabhie invest nahi karna chahiye — woh 3-6 months ki zaroorat ke liye reserve hoti hai.",
    "prompt_injection": "Main apne guidelines follow karta hoon. Koi aur sawaal?",
    "tax_advice": "Tax ke liye ek CA se milna best rahega. Main sirf basic info de sakta hoon.",
    "legal_advice": "Legal advice ke liye ek advocate se milna chahiye. Main financial basics mein madad kar sakta hoon.",
}


class GuardrailResult:
    def __init__(self, blocked: bool, reason: str = "", alt: str = "", intent: str = ""):
        self.blocked = blocked
        self.reason = reason
        self.alt = alt
        self.intent = intent


class PostCheckResult:
    def __init__(self, ok: bool, safe_rewrite: str = ""):
        self.ok = ok
        self.safe_rewrite = safe_rewrite


def pre_check(text: str) -> GuardrailResult:
    """Check user message before sending to LLM."""
    text_lower = text.lower()
    for pattern, intent in PRE_BLOCK_PATTERNS:
        if re.search(pattern, text_lower):
            alt = SAFE_ALTERNATIVES.get(intent, "Main sirf legal aur safe investment guidance de sakta hoon.")
            logger.warning(f"[GUARDRAIL PRE] blocked intent={intent} text={text[:80]}")
            return GuardrailResult(blocked=True, reason=intent, alt=alt, intent=intent)
    return GuardrailResult(blocked=False)


def post_check(reply: str, intent: str = "", lang: str = "hinglish") -> PostCheckResult:
    """Check LLM reply before sending to user."""
    reply_lower = reply.lower()

    # Check for banned patterns in reply
    for pattern in POST_BLOCK_PATTERNS:
        if re.search(pattern, reply_lower):
            if lang == "en":
                safe = (
                    "Investments involve market risk. Past performance does not guarantee future returns. "
                    "Please evaluate your risk profile or consult a financial advisor."
                )
            else:
                safe = (
                    "Yeh investment mein risk hoti hai. Past performance future returns guarantee nahi karti. "
                    "Apna financial situation dekh kar decide karo, ya ek advisor se baat karo."
                )
            logger.warning(f"[GUARDRAIL POST] banned pattern in reply intent={intent}")
            return PostCheckResult(ok=False, safe_rewrite=safe)

    # Require risk disclosure on plan recommendations (not short questions)
    if intent in RISK_REQUIRED_INTENTS and len(reply.split()) > 25:
        risk_keywords = ["risk", "galat", "drop", "volatile", "loss", "gir", "neeche", "fluctuat"]
        has_risk = any(kw in reply_lower for kw in risk_keywords)
        if not has_risk:
            if lang == "en":
                disclaimer = "\n\nNote: Mutual fund investments are subject to market risks. Only invest funds you can keep invested for 3+ years."
            else:
                disclaimer = "\n\nYaad rakho: Mutual funds market risk ke saath aate hain. Invest karo sirf woh paisa jo 3+ saal ke liye spare kar sako."
            reply = reply + disclaimer
            return PostCheckResult(ok=True, safe_rewrite=reply)

    return PostCheckResult(ok=True, safe_rewrite=reply)

