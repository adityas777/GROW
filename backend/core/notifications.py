"""
Notifications — Gmail SMTP + Slack webhook alerts.
"""
import os
import json
import logging
import asyncio
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import httpx

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


async def send_email(to: str, subject: str, html_body: str):
    """Send an email via Gmail SMTP."""
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("[EMAIL] SMTP credentials not set, skipping email")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_USER,
            password=SMTP_PASS,
        )
        logger.info(f"[EMAIL] sent to={to} subject={subject}")
    except Exception as e:
        logger.error(f"[EMAIL] failed to send: {e}")


async def send_slack_alert(message: str, color: str = "danger", fields: list = None):
    """Send a Slack webhook alert."""
    if not SLACK_WEBHOOK:
        logger.warning("[SLACK] webhook URL not set, skipping alert")
        return

    payload = {
        "attachments": [
            {
                "color": color,
                "title": "🚨 Pehla ₹500 Alert",
                "text": message,
                "fields": fields or [],
                "footer": "Pehla ₹500 Guardrail System",
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(SLACK_WEBHOOK, json=payload, timeout=5.0)
            logger.info(f"[SLACK] alert sent status={resp.status_code}")
    except Exception as e:
        logger.error(f"[SLACK] failed to send alert: {e}")


def build_paycheck_email(user_name: str, amount: float, split: dict) -> str:
    """Build the paycheck nudge email HTML."""
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; padding: 32px; border: 1px solid #D4AF37; }}
    h1 {{ color: #D4AF37; font-size: 24px; margin-bottom: 4px; }}
    .subtitle {{ color: #888; margin-bottom: 24px; }}
    .split-row {{ display: flex; justify-content: space-between; padding: 16px; border-radius: 12px; margin: 8px 0; }}
    .emergency {{ background: #1e2a1e; border-left: 4px solid #4CAF50; }}
    .sip {{ background: #2a1e10; border-left: 4px solid #D4AF37; }}
    .fun {{ background: #1a1a2e; border-left: 4px solid #6c63ff; }}
    .amount {{ font-size: 20px; font-weight: bold; }}
    .label {{ font-size: 12px; color: #888; margin-top: 4px; }}
    .cta {{ background: #D4AF37; color: #000; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 24px; }}
    .disclaimer {{ color: #555; font-size: 11px; margin-top: 24px; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>₹{amount:,.0f} aaye! 🎉</h1>
    <p class="subtitle">Namaste {user_name or 'dost'}! Paisa aaya — aise baantein?</p>
    
    <div class="split-row emergency">
      <div>
        <div class="amount">₹{split['emergency']:,.0f}</div>
        <div class="label">🛡️ Emergency Fund ({split['emergency_pct']}%)</div>
      </div>
    </div>
    
    <div class="split-row sip">
      <div>
        <div class="amount">₹{split['sip']:,.0f}</div>
        <div class="label">📈 SIP Investment ({split['sip_pct']}%)</div>
      </div>
    </div>
    
    <div class="split-row fun">
      <div>
        <div class="amount">₹{split['fun']:,.0f}</div>
        <div class="label">🎮 Kharcha / Fun ({split['fun_pct']}%)</div>
      </div>
    </div>
    
    <a href="{FRONTEND_URL}" class="cta">App mein dekho aur approve karo →</a>
    
    <p class="disclaimer">
      ⚠️ SANDBOX MODE — Yeh illustrative data hai. Koi real money movement nahi hai.<br>
      Mutual fund investments are subject to market risks. Past performance is not a guarantee of future returns.
    </p>
  </div>
</body>
</html>
"""


def build_order_confirmation_email(user_name: str, order: dict) -> str:
    """Build the order confirmation email HTML."""
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; padding: 32px; border: 1px solid #D4AF37; }}
    h1 {{ color: #D4AF37; }}
    .order-box {{ background: #111; border: 1px solid #333; border-radius: 12px; padding: 20px; margin: 16px 0; }}
    .row {{ display: flex; justify-content: space-between; margin: 8px 0; }}
    .label {{ color: #888; }}
    .value {{ font-weight: bold; }}
    .risk-chip {{ padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }}
    .risk-medium {{ background: #2a1e10; color: #D4AF37; }}
    .risk-low {{ background: #1e2a1e; color: #4CAF50; }}
    .risk-high {{ background: #2a1e1e; color: #f44336; }}
    .disclaimer {{ color: #555; font-size: 11px; margin-top: 24px; border-top: 1px solid #222; padding-top: 16px; }}
    .success-icon {{ font-size: 48px; text-align: center; margin: 16px 0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <h1>Pehla investment set ho gaya! 🎊</h1>
    <p>Badhaai ho {user_name or 'dost'}! Tumne pehla kadam utha liya.</p>
    
    <div class="order-box">
      <div class="row">
        <span class="label">Order ID</span>
        <span class="value">{order.get('order_id', 'N/A')}</span>
      </div>
      <div class="row">
        <span class="label">Fund</span>
        <span class="value">{order.get('fund_name', 'N/A')}</span>
      </div>
      <div class="row">
        <span class="label">Monthly SIP</span>
        <span class="value">₹{order.get('monthly_amount', 0):,.0f}</span>
      </div>
      <div class="row">
        <span class="label">Risk Level</span>
        <span class="risk-chip risk-{order.get('risk_level', 'medium').lower()}">{order.get('risk_level', 'Medium')}</span>
      </div>
    </div>
    
    <p class="disclaimer">
      ⚠️ SANDBOX MODE — Yeh illustrative demo hai. Koi real money movement nahi hai.<br>
      Mutual fund investments are subject to market risks. Read all scheme related documents carefully before investing.
    </p>
  </div>
</body>
</html>
"""
