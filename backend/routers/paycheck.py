"""
/paycheck router — simulated salary/income event trigger & SMS auto-sync.
"""
import os
import asyncio
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Query
from pydantic import BaseModel
from core import tools, notifications, sessions
from core.sms_parser import parse_bank_sms
from core.market import get_current_market_scene
from core.gmail_scanner import scan_gmail_api_for_salary

logger = logging.getLogger(__name__)
router = APIRouter()

PENDING_SALARY_EVENTS: Dict[str, Any] = {}


class PaycheckEvent(BaseModel):
    amount: float
    source: str = "salary"
    session_id: str | None = None
    user_email: str | None = None
    user_name: str | None = None


class SMSWebhookRequest(BaseModel):
    text: str
    sender: Optional[str] = "BANK"
    session_id: Optional[str] = None


@router.post("/event")
async def paycheck_event(req: PaycheckEvent):
    """
    Simulate a salary/stipend credited event.
    Triggers: split calculation + in-app card + email nudge.
    """
    if req.amount <= 0:
        return {"success": False, "error": "Amount must be positive"}

    profile = {}
    if req.session_id:
        profile = sessions.get_profile(req.session_id) or {}

    split = tools.split_paycheck(req.amount, profile)

    if req.user_email:
        asyncio.create_task(
            notifications.send_email(
                to=req.user_email,
                subject=f"💰 ₹{req.amount:,.0f} aaye! Aise baantein?",
                html_body=notifications.build_paycheck_email(req.user_name, req.amount, split),
            )
        )

    logger.info(f"[PAYCHECK] event amount={req.amount} source={req.source}")

    return {
        "success": True,
        "amount": req.amount,
        "source": req.source,
        "split": split,
        "message": f"₹{req.amount:,.0f} aaye! Main suggest karta hoon: ₹{split['emergency']} emergency, ₹{split['sip']} SIP, ₹{split['fun']} kharcha.",
    }


@router.post("/approve")
async def approve_split(req: dict):
    """User approves (possibly edited) paycheck split and creates a SIP mandate."""
    session_id = req.get("session_id")
    sip_amount = req.get("sip_amount")

    if not sip_amount:
        return {"success": False, "error": "SIP amount required"}

    if session_id:
        sessions.update_profile(session_id, {"amount": sip_amount})

    return {
        "success": True,
        "sip_amount": sip_amount,
        "message": f"₹{sip_amount} SIP approve ho gayi! Aage fund select karte hain.",
        "next_step": "select_fund",
    }


@router.post("/webhook")
async def sms_webhook(payload: SMSWebhookRequest, key: str = Query("demo_user")):
    """
    Public webhook hit by iOS Shortcuts or Android MacroDroid when salary SMS arrives.
    """
    parsed = parse_bank_sms(payload.text, payload.sender or "")
    
    if not parsed.is_salary or not parsed.amount:
        return {
            "success": False,
            "status": "ignored",
            "message": "Message is not recognized as a salary credit"
        }

    salary = parsed.amount
    profile = sessions.get_profile(payload.session_id) if payload.session_id else {}
    split = tools.split_paycheck(salary, profile)
    
    investable_surplus = float(split.get("sip", round(salary * 0.20)))
    market_context = get_current_market_scene(investable_surplus)

    plan_payload = {
        "user_id": key,
        "salary_amount": salary,
        "bank": parsed.bank,
        "account_tail": parsed.account_last4,
        "split": split,
        "market": {
            "headline": market_context.headline,
            "tone": market_context.market_tone,
            "allocations": market_context.suggested_allocations
        }
    }

    PENDING_SALARY_EVENTS[key] = plan_payload
    logger.info(f"[SMS-WEBHOOK] salary detected amount={salary} bank={parsed.bank}")

    return {
        "success": True,
        "status": "success",
        "message": f"Salary of ₹{salary:,.0f} registered and plan generated",
        "data": plan_payload
    }


@router.get("/latest")
async def get_latest_paycheck_event(key: str = Query("demo_user")):
    """Returns the most recent salary event detected via webhook."""
    event = PENDING_SALARY_EVENTS.get(key)
    if not event:
        return {"success": False, "status": "none", "event": None}
    return {"success": True, "status": "success", "event": event}


@router.post("/simulate")
async def simulate_salary_sms(payload: SMSWebhookRequest):
    """Instant simulation endpoint for the frontend paste/test chips."""
    return await sms_webhook(payload, key=payload.session_id or "demo_user")


class GmailSyncRequest(BaseModel):
    session_id: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    max_search: int = 15
    simulate_sample: Optional[str] = None


@router.post("/sync-gmail")
async def sync_gmail_paycheck(req: GmailSyncRequest):
    """
    Scans the connected Gmail inbox via IMAP to detect salary credit emails,
    extracts the salary amount, and builds the personalized 3-way split plan.
    """
    profile = sessions.get_profile(req.session_id) if req.session_id else {}
    
    if req.simulate_sample:
        samples = {
            "infosys": {
                "salary": 120000.0,
                "bank": "HDFC Bank",
                "tail": "4589",
                "subject": "Salary Credit Alert - INFOSYS LTD",
                "sender": "alerts@hdfcbank.net",
                "date": "01 Oct 2026",
                "snippet": "Dear Customer, INR 1,20,000.00 has been credited to your account XX4589 by INFOSYS SALARY on 01-OCT-2026."
            },
            "tcs": {
                "salary": 85000.0,
                "bank": "ICICI Bank",
                "tail": "9921",
                "subject": "Your Account credited with Salary - TCS PAYROLL",
                "sender": "alerts@icicibank.com",
                "date": "30 Sep 2026",
                "snippet": "Dear Customer, Your A/c XX9921 is credited with INR 85,000.00 on 30-SEP-26 by TCS PAYROLL."
            },
            "stipend": {
                "salary": 45000.0,
                "bank": "Axis Bank",
                "tail": "1234",
                "subject": "Credit Alert: Monthly Stipend / Wages",
                "sender": "nodal@axisbank.com",
                "date": "05 Oct 2026",
                "snippet": "INR 45,000.00 deposited to A/c XX1234 by STIPEND / WAGES on 05-OCT."
            },
            "startup": {
                "salary": 30000.0,
                "bank": "Kotak Mahindra Bank",
                "tail": "3456",
                "subject": "Salary Payment Credited - TECH VENTURES",
                "sender": "alerts@kotak.com",
                "date": "02 Oct 2026",
                "snippet": "Your account XX3456 has been credited with INR 30,000.00. Salary payment from CORP."
            }
        }
        chosen = samples.get(req.simulate_sample.lower(), samples["infosys"])
        salary = chosen["salary"]
        split = tools.split_paycheck(salary, profile)
        investable_surplus = float(split.get("sip", round(salary * 0.20)))
        market_context = get_current_market_scene(investable_surplus)

        plan_payload = {
            "user_id": req.session_id or "demo_user",
            "salary_amount": salary,
            "bank": chosen["bank"],
            "account_tail": chosen["tail"],
            "split": split,
            "market": {
                "headline": market_context.headline,
                "tone": market_context.market_tone,
                "allocations": market_context.suggested_allocations
            },
            "source": "gmail",
            "email_info": {
                "subject": chosen["subject"],
                "sender": chosen["sender"],
                "date": chosen["date"],
                "snippet": chosen["snippet"]
            }
        }

        PENDING_SALARY_EVENTS[req.session_id or "demo_user"] = plan_payload
        return {
            "success": True,
            "status": "salary_detected",
            "message": f"Gmail scan: Salary of ₹{salary:,.0f} detected from {chosen['bank']}!",
            "data": plan_payload,
            "connected_email": req.email or os.getenv("SMTP_USER", "user@gmail.com")
        }

    # Get stored OAuth token for this session
    from routers.auth import get_token_for_session
    token_data = get_token_for_session(req.session_id or "")

    if not token_data:
        return {
            "success": False,
            "status": "not_authenticated",
            "message": "Please sign in with Google first to scan your Gmail inbox.",
            "can_simulate": True
        }

    access_token = token_data["token"]
    gmail_email = token_data.get("email", req.email or "")

    loop = asyncio.get_event_loop()
    scan_res = await loop.run_in_executor(
        None,
        lambda: scan_gmail_api_for_salary(access_token, user_email=gmail_email, max_results=req.max_search)
    )

    if scan_res.get("success") and scan_res.get("salary_amount"):
        salary = float(scan_res["salary_amount"])
        split = tools.split_paycheck(salary, profile)
        investable_surplus = float(split.get("sip", round(salary * 0.20)))
        market_context = get_current_market_scene(investable_surplus)

        plan_payload = {
            "user_id": req.session_id or "demo_user",
            "salary_amount": salary,
            "bank": scan_res.get("bank", "Bank Alert"),
            "account_tail": scan_res.get("account_tail"),
            "split": split,
            "market": {
                "headline": market_context.headline,
                "tone": market_context.market_tone,
                "allocations": market_context.suggested_allocations
            },
            "source": "gmail",
            "email_info": {
                "subject": scan_res.get("subject"),
                "sender": scan_res.get("sender"),
                "date": scan_res.get("date"),
                "snippet": scan_res.get("snippet")
            }
        }

        PENDING_SALARY_EVENTS[req.session_id or "demo_user"] = plan_payload
        logger.info(f"[GMAIL-SYNC] Salary detected amount={salary} email={scan_res.get('connected_email')}")

        return {
            "success": True,
            "status": "salary_detected",
            "message": f"Gmail scan: Salary of ₹{salary:,.0f} detected from {scan_res.get('bank', 'Bank')}!",
            "data": plan_payload,
            "connected_email": scan_res.get("connected_email")
        }

    return {
        "success": False,
        "status": "no_salary_found",
        "message": scan_res.get("message") or scan_res.get("error") or "No salary credit email found in recent messages.",
        "connected_email": scan_res.get("connected_email"),
        "scanned_count": scan_res.get("scanned_count", 0),
        "can_simulate": True
    }

