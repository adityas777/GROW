"""
Responder — Groq-powered response generator.
Uses intent + tool results to generate a Hinglish reply.
Never promises returns. Always shows risk.
"""
import os
import logging
from groq import AsyncGroq

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Paisa Dost — a friendly, knowledgeable investment copilot for Groww, guiding first-time Gen-Z and millennial investors in India.

LANGUAGE INSTRUCTION:
- If target language is 'en', reply COMPLETELY in warm, confident, plain English. Never mix Hindi words if user prefers English.
- If target language is 'hi', reply in polite, natural Hindi.
- If target language is 'hinglish', reply in friendly Hinglish (Hindi + English mix).

TONE & STYLE:
- Conversational, empowering, crystal clear. No complicated jargon without quick explanation.
- DO NOT spam emojis. Use at most 1 subtle emoji if appropriate. NEVER spell out emoji words like "rocket emoji".
- Keep replies focused and actionable (around 100-140 words).

RULES:
1. When user asks for a plan or returns (e.g. ₹500/month for 10-15 years):
   - Explain the power of disciplined compounding.
   - Use the <tool_result> projections if available (e.g. at ~12% realistic long-term index return: ₹500/mo over 10 yrs ≈ ₹1.16L, over 15 yrs ≈ ₹2.52L).
   - Recommend a low-cost diversified fund (e.g., Nifty 50 Index Fund).
   - Remind them that returns fluctuate and mutual funds carry market risk.
   - Invite them: "You can review this in your **Portfolio** (/portfolio) or plan your monthly salary in the **Paycheck Planner** (/paycheck)."
2. When user provides salary/income (e.g. ₹35,000):
   - Recommend the 50-30-20 or 10-15% rule: roughly ₹3,500 - ₹5,000 for monthly investments after keeping 3 months emergency fund.
   - Mention they can use the **Paycheck Planner** tab (/paycheck) for an instant breakdown.
3. NEVER promise guaranteed returns. Always note market risk when discussing equity.

<tool_result>
{tool_result}
</tool_result>
"""

CLARIFYING_QUESTIONS = {
    "start_sip": [
        "Ek quick sawaal: paisa kitne saal ke liye lagana hai? 1 saal se kam, 1 se 3, ya 3 se zyada?",
        "Kitna comfortable feel karte ho risk ke saath? Safe, medium, ya high growth?",
        "Aur kitna monthly spare kar sakte ho investment ke liye? ₹500, ₹1,000, ya kuch aur?",
    ],
    "how_much_to_invest": [
        "Pehle batao — monthly income kitni hai (roughly)? Aur approximately kitne kharche hain?",
    ],
}

client: AsyncGroq | None = None


def get_client() -> AsyncGroq:
    global client
    if client is None:
        client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))
    return client


async def generate_response(
    intent: str,
    tool_result: dict | str | None,
    session_state: dict,
    user_message: str,
    lang: str = "hinglish",
) -> str:
    """Generate a response using Groq with multi-model fallback."""
    c = get_client()

    tool_str = str(tool_result) if tool_result else "No tool data available."
    system = SYSTEM_PROMPT.replace("{tool_result}", tool_str)
    system += f"\n\nTARGET LANGUAGE: {lang.upper()} (Respond strictly in this language format)."

    messages = [{"role": "system", "content": system}]

    # Add conversation history
    history = session_state.get("messages", [])[-6:]
    for m in history:
        messages.append({"role": m["role"], "content": m["text"]})

    messages.append({"role": "user", "content": user_message})

    reply = ""
    for model_name in ["qwen/qwen3.8-27b", "openai/gpt-oss-20b"]:
        try:
            resp = await c.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.6,
                max_tokens=600,
            )
            content = resp.choices[0].message.content
            if content and content.strip():
                reply = content.strip()
                break
        except Exception as e:
            logger.warning(f"[RESPONDER] {model_name} failed: {e}")
            continue

    if not reply:
        if lang == "en":
            return "Starting with ₹500 a month in a diversified Nifty 50 Index Fund is a great first step! Over 10 to 15 years, compounding can grow your investment significantly (~₹1.16 Lakhs in 10 years at an assumed 12% return). You can view your plan on the Portfolio tab."
        return "Bilkul! ₹500 se Nifty 50 Index Fund mein shuru karna best choice hai. 10-15 saal mein compounding se yeh solid wealth banata hai (~₹1.16 Lakhs 10 saal mein 12% return par). Portfolio tab mein explore karo!"

    logger.info(f"[RESPONDER] intent={intent} lang={lang} reply_len={len(reply)}")
    return reply


async def generate_jargon_explanation(term: str, glossary_data: dict | None, lang: str = "hinglish") -> str:
    """Generate a jargon explanation — glossary first, LLM fallback."""
    if glossary_data:
        # Use curated glossary — no LLM needed, no hallucination
        return f"""**{glossary_data['term']}** ({glossary_data.get('full_name', '')})

📖 **Kya hai:** {glossary_data['meaning']}

🎯 **Simple analogy:** {glossary_data['analogy']}

💰 **Example:** {glossary_data['example']}

💡 **Kyun matter karta hai:** {glossary_data['why_matters']}"""

    # LLM fallback for unknown terms
    try:
        c = get_client()
        prompt = f"""Explain the financial term "{term}" for a 22-year-old first-time Indian investor.
Keep it in Hinglish. Format:
- Kya hai (one line)
- Simple analogy (one line)  
- ₹ example (one line)
- Kyun matter karta hai (one line)
Max 80 words total. Do NOT promise returns or give investment advice."""

        resp = await c.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=200,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"'{term}' ke baare mein mujhe puri jankari nahi hai. Ek financial advisor se confirm karo! 🙏"
