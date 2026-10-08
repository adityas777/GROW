"""
Auth router — Google OAuth 2.0 + session management.

Flow:
  1. Frontend opens popup to GET /auth/google?session_id=xxx
  2. Backend redirects to Google consent screen (gmail.readonly scope)
  3. User approves → Google calls GET /auth/google/callback?code=xxx&state=xxx
  4. Backend exchanges code for access token, stores in session
  5. Backend returns an HTML page that closes the popup and signals parent
  6. Frontend polls GET /auth/google/status?session_id=xxx to confirm
  7. Frontend hits POST /paycheck/sync-gmail with the session_id (no token needed in body)
"""
import os
import logging
from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv
from core import sessions

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

# In-memory token store: session_id → token dict
# For production this should be Redis or DB-backed
_oauth_tokens: dict = {}
_pending_verifiers: dict[str, str] = {}


def _make_flow() -> Flow:
    client_config = {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_REDIRECT_URI],
        }
    }
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )
    return flow


@router.post("/session")
async def create_session(req: dict = None):
    """Create a new anonymous session."""
    req = req or {}
    session_id = sessions.create_session(req.get("user_id"))
    return {"session_id": session_id}


@router.get("/google")
async def google_login(session_id: str = Query(..., description="Frontend session ID to bind token to")):
    """
    Redirects the user (in a popup) to the real Google OAuth consent screen.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        return JSONResponse(
            status_code=500,
            content={"error": "Google OAuth credentials not configured in backend .env"}
        )

    flow = _make_flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=session_id,          # pass session_id through state param
        prompt="select_account",   # always show account picker
    )
    if hasattr(flow, "code_verifier") and flow.code_verifier:
        _pending_verifiers[session_id] = flow.code_verifier
        logger.info(f"[OAUTH] Stored PKCE code_verifier for session={session_id}")

    return RedirectResponse(auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str = Query(None),
    state: str = Query(None),   # this is our session_id
    error: str = Query(None),
):
    """
    Google redirects here after user approves.
    Exchanges the auth code for an access token and stores it.
    Returns an HTML page that closes the popup and notifies the parent window.
    """
    session_id = state or "unknown"

    if error:
        logger.warning(f"[OAUTH] User denied access: {error}")
        return HTMLResponse(_close_popup_html(success=False, message=f"Access denied: {error}"))

    if not code:
        return HTMLResponse(_close_popup_html(success=False, message="No auth code received from Google."))

    code_verifier = _pending_verifiers.pop(session_id, None)

    try:
        import httpx

        # Direct token exchange via httpx with PKCE verifier
        # This completely avoids urllib3 SSL EOF issues on Windows
        token_payload = {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": GOOGLE_REDIRECT_URI,
        }
        if code_verifier:
            token_payload["code_verifier"] = code_verifier

        token_data = None
        async with httpx.AsyncClient(timeout=30.0) as client:
            token_resp = await client.post("https://oauth2.googleapis.com/token", data=token_payload)
            if token_resp.status_code == 200:
                token_data = token_resp.json()
            else:
                logger.warning(f"[OAUTH] Direct httpx exchange returned {token_resp.status_code}: {token_resp.text}")

        # Fallback to flow.fetch_token if direct httpx did not succeed
        if not token_data:
            flow = _make_flow()
            if code_verifier:
                flow.code_verifier = code_verifier
            flow.fetch_token(code=code, code_verifier=code_verifier)
            creds = flow.credentials
            token_data = {
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "scope": " ".join(creds.scopes or SCOPES),
            }

        access_token = token_data.get("access_token")
        if not access_token:
            err_msg = token_data.get("error_description", "Failed to retrieve access token.")
            return HTMLResponse(_close_popup_html(success=False, message=err_msg))

        # Fetch user profile information (email + name)
        user_email = ""
        user_name = ""
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                info_resp = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if info_resp.status_code == 200:
                    info = info_resp.json()
                    user_email = info.get("email", "")
                    user_name = info.get("name", "")
        except Exception as e:
            logger.warning(f"[OAUTH] Could not fetch userinfo: {e}")

        # Store token keyed by session_id
        _oauth_tokens[session_id] = {
            "token": access_token,
            "refresh_token": token_data.get("refresh_token"),
            "token_uri": "https://oauth2.googleapis.com/token",
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "scopes": token_data.get("scope", "").split() if token_data.get("scope") else SCOPES,
            "email": user_email,
            "name": user_name,
        }

        # Also update sessions profile
        if session_id and session_id != "unknown":
            sessions.update_profile(session_id, {
                "gmail_email": user_email,
                "gmail_name": user_name,
            })

        logger.info(f"[OAUTH] Token successfully stored for session={session_id} email={user_email}")
        return HTMLResponse(_close_popup_html(success=True, email=user_email, name=user_name))

    except Exception as e:
        logger.exception(f"[OAUTH] Token exchange failed: {e}")
        return HTMLResponse(_close_popup_html(success=False, message=str(e)))


@router.get("/google/status")
async def google_status(session_id: str = Query(...)):
    """
    Frontend polls this to check if OAuth completed and get the user's email.
    """
    token_data = _oauth_tokens.get(session_id)
    if not token_data:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "email": token_data.get("email", ""),
        "name": token_data.get("name", ""),
    }


def get_token_for_session(session_id: str) -> dict | None:
    """Used by the paycheck router to get the stored OAuth token."""
    return _oauth_tokens.get(session_id)


def _close_popup_html(success: bool, email: str = "", name: str = "", message: str = "") -> str:
    """Returns a minimal HTML page that closes the OAuth popup and posts a message to the parent."""
    if success:
        payload = f'{{"success": true, "email": "{email}", "name": "{name}"}}'
        status_text = f"✅ Signed in as {email}"
        color = "#22c55e"
    else:
        payload = f'{{"success": false, "message": "{message}"}}'
        status_text = f"❌ {message or 'Sign-in failed'}"
        color = "#ef4444"

    return f"""<!DOCTYPE html>
<html>
<head>
  <title>Google Sign-In</title>
  <style>
    body {{ font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; background: #0f172a; color: #fff; text-align: center; }}
    .msg {{ font-size: 18px; color: {color}; }}
    .sub {{ font-size: 13px; color: #94a3b8; margin-top: 8px; }}
  </style>
</head>
<body>
  <div>
    <div class="msg">{status_text}</div>
    <div class="sub">This window will close automatically...</div>
  </div>
  <script>
    try {{
      window.opener && window.opener.postMessage({payload}, '*');
    }} catch(e) {{}}
    setTimeout(() => window.close(), 1500);
  </script>
</body>
</html>"""
