"""
Gmail Scanner — uses Gmail API (OAuth 2.0) to scan a user's inbox.
Requires an access token stored via the /auth/google/callback flow.
"""
import re
import base64
import logging
from typing import Optional, Dict, Any
from core.sms_parser import parse_bank_sms

logger = logging.getLogger(__name__)


def _decode_base64(data: str) -> str:
    """Decodes URL-safe base64 encoded Gmail message body."""
    try:
        padded = data + "=" * (4 - len(data) % 4)
        return base64.urlsafe_b64decode(padded).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def _extract_text_from_payload(payload: dict) -> str:
    """Recursively extracts plain text from a Gmail message payload."""
    body = ""
    mime_type = payload.get("mimeType", "")

    if mime_type == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            body = _decode_base64(data)
    elif mime_type == "text/html" and not body:
        data = payload.get("body", {}).get("data", "")
        if data:
            raw = _decode_base64(data)
            body = re.sub(r"<[^>]+>", " ", raw)
    elif "parts" in payload:
        for part in payload["parts"]:
            part_text = _extract_text_from_payload(part)
            if part_text:
                body += part_text + "\n"

    return body.strip()


def scan_gmail_api_for_salary(
    access_token: str,
    user_email: str = "",
    max_results: int = 20,
) -> Dict[str, Any]:
    """
    Uses the Gmail REST API (with a valid OAuth access token) to search the inbox
    for salary credit emails and extract the amount + bank details.
    Uses httpx for rock-solid HTTP/TLS reliability on all platforms.
    """
    import httpx

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    base_url = "https://gmail.googleapis.com/gmail/v1/users/me"

    # Search queries — try specific first, then broad
    queries = [
        "subject:(salary OR credited OR payroll OR deposited OR stipend)",
        "salary credit OR amount credited OR account credited",
        "from:(hdfcbank OR icicibank OR axisbank OR kotak OR sbi OR paytm OR yesbank OR nodal)",
    ]

    try:
        with httpx.Client(timeout=20.0) as client:
            message_ids = []
            for q in queries:
                try:
                    r = client.get(f"{base_url}/messages", params={"q": q, "maxResults": max_results}, headers=headers)
                    if r.status_code == 200:
                        msgs = r.json().get("messages", [])
                        if msgs:
                            message_ids = msgs
                            break
                    elif r.status_code == 401:
                        return {
                            "success": False,
                            "error": "Google session expired or invalid. Please sign in again.",
                            "connected_email": user_email,
                        }
                except Exception as e:
                    logger.warning(f"[GMAIL-API] Query '{q}' failed: {e}")
                    continue

            if not message_ids:
                # Scan most recent inbox messages
                try:
                    r = client.get(f"{base_url}/messages", params={"labelIds": ["INBOX"], "maxResults": max_results}, headers=headers)
                    if r.status_code == 200:
                        message_ids = r.json().get("messages", [])
                except Exception:
                    pass

            if not message_ids:
                return {
                    "success": False,
                    "message": f"No emails found in {user_email or 'inbox'}.",
                    "connected_email": user_email,
                }

            scanned = 0
            for msg_ref in message_ids[:max_results]:
                scanned += 1
                try:
                    r = client.get(f"{base_url}/messages/{msg_ref['id']}", params={"format": "full"}, headers=headers)
                    if r.status_code != 200:
                        continue
                    msg = r.json()

                    payload = msg.get("payload", {})
                    headers_list = payload.get("headers", [])
                    h_dict = {h["name"]: h["value"] for h in headers_list}

                    subject = h_dict.get("Subject", "")
                    sender = h_dict.get("From", "")
                    date_str = h_dict.get("Date", "")

                    body = _extract_text_from_payload(payload)
                    snippet = msg.get("snippet", "")

                    combined = f"{subject}\n{body[:1500]}" if body else f"{subject}\n{snippet}"

                    parsed = parse_bank_sms(combined, sender=sender)

                    if parsed.is_salary and parsed.amount and parsed.amount > 0:
                        logger.info(f"[GMAIL-API] Salary found: ₹{parsed.amount} from {sender}")
                        return {
                            "success": True,
                            "connected_email": user_email,
                            "salary_amount": parsed.amount,
                            "bank": parsed.bank or "Bank Alert",
                            "account_tail": parsed.account_last4,
                            "subject": subject,
                            "sender": sender,
                            "date": date_str,
                            "snippet": (body[:180] if body else snippet).strip(),
                            "confidence": parsed.confidence,
                            "scanned_count": scanned,
                        }

                except Exception as e:
                    logger.warning(f"[GMAIL-API] Failed to parse message {msg_ref['id']}: {e}")
                    continue

            return {
                "success": False,
                "connected_email": user_email,
                "scanned_count": scanned,
                "message": f"Scanned {scanned} emails in {user_email or 'inbox'} — no salary credit detected.",
            }

    except Exception as e:
        logger.exception(f"[GMAIL-API] Error: {e}")
        return {
            "success": False,
            "error": f"Gmail API error: {str(e)}",
            "connected_email": user_email,
        }
