Deployed Link- https://grow-silk.vercel.app/
# Pehla ₹500 — Groww for Gen-Z Investors 🚀

> **"Bina tension ke, pehla investment."**  
> A Hinglish voice & chat copilot, smart paycheck automation, and deterministic guardrail suite designed specifically for first-time Gen-Z investors aged 20–26 in India.

Built for the **Groww Product Internship Case Study**.

---

## 🌟 Key Highlights & Standout Features

1. **Golden Black Luxury Aesthetics & Camera Lighting:**
   - Cinematic ambient lighting orbs, frosted glassmorphism, and tailored gold badges and cards.
   - Mobile-first responsive PWA layout designed at 390px–480px width.

2. **Hinglish Voice & Chat Copilot ("Paisa Dost"):**
   - Natural code-mixed Hinglish and English conversation.
   - Audio recording with speech-to-text (Gnani / Groq Whisper) and voice playback with browser SpeechSynthesis fallback.
   - Quick-reply interactive chips and jargon decoder popups.

3. **Deterministic Safety Architecture ("LLM Proposes, Code Disposes"):**
   - **Zero hallucinatory transactions:** Orders require an explicit tap or spoken "haan confirm", signing a cryptographic HMAC token before executing in Sandbox mode.
   - **Multi-layer guardrail defense:** Pre-check keyword/regex interceptors block stock tips, F&O, crypto, and return guarantees before hitting the model.

4. **Paycheck-Triggered Automation ("Aise Baantein"):**
   - Interactive 3-way budget allocation slider (Emergency Fund, Monthly SIP, Fun/Kharcha).
   - Live Rupee allocation preview with automated asynchronous email nudges via Gmail SMTP.

5. **Sandbox Portfolio View:**
   - Transparent total invested vs. current value cards.
   - Behavioral coach note ("Dips are normal in equity — rupee cost averaging protects long-term SIPs").

6. **Internal Compliance & Evals Dashboard (`/ops`):**
   - 22-case automated golden evaluation test runner with live pass rates across 6 compliance categories.
   - Real-time KPI monitors, guardrail incident logs, and curated mutual fund catalogue inspection.

---

## 📁 Repository Structure

```
GROW/
├── backend/
│   ├── core/
│   │   ├── guardrails.py        # Pre-check, post-check, and regex filter interceptors
│   │   ├── intent_router.py     # Groq LLM-powered 11-intent classifier
│   │   ├── notifications.py     # Gmail SMTP & Slack webhook alert dispatcher
│   │   ├── responder.py         # Hinglish empathetic tone generator
│   │   ├── sessions.py          # State machine and memory store
│   │   └── tools.py             # Deterministic logic: portfolio, orders, budget split
│   ├── data/
│   │   └── catalogue.py         # Curated 8-fund catalogue & financial jargon glossary
│   ├── routers/
│   │   ├── auth.py              # Session initialization
│   │   ├── chat.py              # Chat orchestration & HMAC confirmation endpoints
│   │   ├── voice.py             # STT and TTS endpoint routing
│   │   ├── paycheck.py          # Income credit simulator & split approval
│   │   ├── portfolio.py         # Sandbox portfolio reader
│   │   └── ops.py               # Ops dashboard & golden eval suite runner
│   ├── requirements.txt
│   ├── main.py                  # FastAPI application entry point
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PlanCard.jsx         # Starter plan recommendation card
│   │   │   ├── ConfirmSheet.jsx     # Explicit confirmation bottom sheet
│   │   │   └── GlossarySheet.jsx    # Interactive jargon decoder modal
│   │   ├── pages/
│   │   │   ├── WelcomePage.jsx      # Cinematic onboarding hero
│   │   │   ├── CopilotPage.jsx      # Voice/chat conversational interface
│   │   │   ├── PortfolioPage.jsx    # Wealth overview & behavioral dip coach
│   │   │   ├── PaycheckPage.jsx     # Smart 3-way income allocation sliders
│   │   │   └── OpsPage.jsx          # Live Evals & Compliance dashboard
│   │   ├── context/
│   │   │   └── SessionContext.jsx   # Client session state manager
│   │   ├── lib/
│   │   │   └── api.js               # Frontend API client
│   │   ├── App.jsx                  # Application routing
│   │   └── index.css                # Golden Black design tokens & global CSS
│   ├── package.json
│   └── vite.config.js
│
├── prompts.md                   # Runtime and meta-prompts log (Artifact #2)
├── evals.md                     # Golden evaluation suite results (Artifact #3)
├── one_pager_writeup.md         # Candidate 1-page writeup (Artifact #1)
├── groww-genz-build-plan.md     # Detailed architecture & feature spec
└── README.md                    # Project overview & running instructions
```

---

## 🚀 How to Run Locally

### 1. Backend Setup (FastAPI)
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # On Windows
# source venv/bin/activate # On macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python -m uvicorn main:app --reload --port 8000
```
Backend will be live at `http://localhost:8000`  
Interactive Swagger docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup (React + Vite)
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
Frontend will be live at `http://localhost:5173`

---

## 🧭 Application Routes

- `/` — **Welcome Screen:** Cinematic gold entry with voice or text choice.
- `/chat` — **Paisa Dost Copilot:** Hinglish chat, voice input, plan cards, jargon decoder, and confirmation sheet.
- `/paycheck` — **Paycheck Automation:** Salary credit simulator, 3-way allocation sliders (Emergency, SIP, Kharcha), and email nudges.
- `/portfolio` — **Sandbox Portfolio:** Total invested wealth, return estimates, and behavioral market dip coach.
- `/ops` — **Compliance & Evals Dashboard:** Run the 22-case golden evaluation suite, view pass rates, guardrail incident logs, and fund catalogue.

---

## 📜 Submission Artifacts Checklist

- [x] **1-Page Candidate Writeup:** [`one_pager_writeup.md`](file:///c:/Users/pglap/OneDrive/Desktop/GROW/one_pager_writeup.md) (~560 words covering problem statement, scope, out-of-scope, and solution rationale).
- [x] **Prompts Log:** [`prompts.md`](file:///c:/Users/pglap/OneDrive/Desktop/GROW/prompts.md) (Intent router, conversational responder, and eval judge runtime prompts).
- [x] **Evals Harness & Report:** [`evals.md`](file:///c:/Users/pglap/OneDrive/Desktop/GROW/evals.md) (22 test cases, 100% pass rate, regulatory guardrails, and adversarial injection tests).
- [x] **Interactive Ops Dashboard:** Accessible in-app at `/ops` for real-time validation.
