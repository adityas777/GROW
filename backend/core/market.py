"""
backend/core/market.py
Market valuation snapshot and tactical asset allocation intelligence.
"""
from pydantic import BaseModel
from typing import List, Dict, Any

class AllocationBucket(BaseModel):
    category: str
    target_percentage: int
    amount: float
    rationale: str
    vehicles: List[str]

class MarketContext(BaseModel):
    nifty_pe_regime: str
    market_tone: str
    headline: str
    suggested_allocations: List[Dict[str, Any]]

def get_current_market_scene(investable_surplus: float) -> MarketContext:
    headline = "Market in Fair-Valuation Zone (Nifty PE ~22.4)"
    tone = "Nifty is trading within historical fair ranges. Staggered Index/Flexi-cap SIPs + Liquid safety buffer are ideal."
    
    allocations = [
        {
            "category": "Core Long-term Equity",
            "percentage": 50,
            "amount": round(investable_surplus * 0.50),
            "rationale": "Steady compounding in broad market Nifty 50 and Flexi-cap funds",
            "vehicles": ["Nifty 50 Index Fund", "Parag Parikh Flexi Cap Fund"]
        },
        {
            "category": "Liquid and Emergency Buffer",
            "percentage": 30,
            "amount": round(investable_surplus * 0.30),
            "rationale": "High-liquidity buffer generating ~6.8-7.2% yield with zero lock-in",
            "vehicles": ["Arbitrage Fund", "High-Yield Liquid Fund"]
        },
        {
            "category": "Inflation Hedge and Gold",
            "percentage": 20,
            "amount": round(investable_surplus * 0.20),
            "rationale": "Portfolio stabilizer against macroeconomic and currency swings",
            "vehicles": ["Gold ETF / SGB", "Multi-Asset Allocation Fund"]
        }
    ]

    return MarketContext(
        nifty_pe_regime="Fair",
        market_tone=tone,
        headline=headline,
        suggested_allocations=allocations
    )
