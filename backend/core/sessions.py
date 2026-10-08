"""
Session Manager — in-memory session state.
Tracks: user profile (amount, horizon, risk), conversation history, plan proposals.
"""
import uuid
import time
import logging

logger = logging.getLogger(__name__)

# In-memory store (replace with Redis/Airtable for production)
SESSIONS: dict[str, dict] = {}

MAX_HISTORY = 20


def create_session(user_id: str = None) -> str:
    """Create a new session and return session_id."""
    session_id = str(uuid.uuid4())
    SESSIONS[session_id] = {
        "session_id": session_id,
        "user_id": user_id or f"anon-{session_id[:8]}",
        "created_at": time.time(),
        "last_active": time.time(),
        "profile": {
            "amount": None,
            "horizon": None,
            "risk": None,
            "income": None,
            "monthly_expense": None,
            "name": None,
        },
        "messages": [],
        "pending_plan": None,
        "pending_token": None,
        "onboarding_step": 0,
        "language": "hinglish",
        "guardrail_violations": 0,
    }
    logger.info(f"[SESSION] created session_id={session_id}")
    return session_id


def load_session(session_id: str) -> dict | None:
    """Load a session by ID. Returns None if not found."""
    session = SESSIONS.get(session_id)
    if session:
        session["last_active"] = time.time()
    return session


def save_session(session_id: str, state: dict):
    """Save/update session state."""
    SESSIONS[session_id] = state
    state["last_active"] = time.time()


def add_message(session_id: str, role: str, text: str, intent: str = "", confidence: float = 0.0, guardrail_flag: str = ""):
    """Add a message to session history."""
    session = SESSIONS.get(session_id)
    if not session:
        return
    session["messages"].append({
        "role": role,
        "text": text,
        "intent": intent,
        "confidence": confidence,
        "guardrail_flag": guardrail_flag,
        "timestamp": time.time(),
    })
    # Keep history bounded
    if len(session["messages"]) > MAX_HISTORY:
        session["messages"] = session["messages"][-MAX_HISTORY:]


def update_profile(session_id: str, updates: dict):
    """Update user profile slots from intent slots."""
    session = SESSIONS.get(session_id)
    if not session:
        return
    for key, val in updates.items():
        if val is not None and key in session["profile"]:
            session["profile"][key] = val


def get_profile(session_id: str) -> dict:
    """Get user profile."""
    session = SESSIONS.get(session_id)
    return session["profile"] if session else {}


def is_profile_complete(session_id: str) -> bool:
    """Check if we have enough profile data to recommend a plan."""
    profile = get_profile(session_id)
    return all([
        profile.get("amount"),
        profile.get("horizon"),
        profile.get("risk"),
    ])


def set_pending_plan(session_id: str, plan: dict, token: str):
    """Store a pending plan awaiting confirmation."""
    session = SESSIONS.get(session_id)
    if session:
        session["pending_plan"] = plan
        session["pending_token"] = token


def clear_pending_plan(session_id: str):
    """Clear pending plan after confirmation or rejection."""
    session = SESSIONS.get(session_id)
    if session:
        session["pending_plan"] = None
        session["pending_token"] = None


def get_all_sessions() -> list[dict]:
    """Get all sessions (for ops dashboard)."""
    return [
        {
            "session_id": s["session_id"],
            "user_id": s["user_id"],
            "created_at": s["created_at"],
            "last_active": s["last_active"],
            "message_count": len(s["messages"]),
            "guardrail_violations": s["guardrail_violations"],
            "profile_complete": is_profile_complete(s["session_id"]),
            "language": s["language"],
        }
        for s in SESSIONS.values()
    ]
