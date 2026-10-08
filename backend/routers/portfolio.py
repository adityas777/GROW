"""Portfolio router."""
from fastapi import APIRouter
from core import tools, sessions

router = APIRouter()


@router.get("/{session_id}")
async def get_portfolio(session_id: str):
    """Get sandbox portfolio for a session."""
    portfolio = tools.get_portfolio(session_id)
    return portfolio


@router.post("/{session_id}/seed")
async def seed_portfolio(session_id: str):
    """Seed a sample sandbox ₹500 SIP order for instant testing."""
    sample_plan = {
        "fund_id": "nifty_50",
        "fund_name": "Nifty 50 Index Fund",
        "amount": 500,
        "risk": "Low",
        "category": "Large Cap Index",
    }
    result = tools.create_sandbox_order(session_id, "seed_token", sample_plan)
    return result

