# Groww Product Internship Case Study: Designing for the Gen-Z Investor
**Candidate One-Pager (Word count: ~560 words)**

---

### A. My Take on the Problem Statement
India's Gen-Z demographic (ages 20 to 26) is entering the capital markets with unprecedented curiosity fueled by social media, YouTube finfluencers, and college conversations. However, there is a fundamental paradox: **curiosity is high, but activation is paralyzed by intimidation.**

When a 22-year-old college student with a ₹8,000 monthly internship stipend or a 24-year-old freelance designer opens a conventional investing app, they encounter a wall of friction: complex NAV charts, 3-year trailing returns, standard deviations, and dense legal disclaimers. They fear making an irreversible mistake or getting tricked into losing their hard-earned money. 

The real problem isn't that Gen-Z lacks money to invest; it’s that **traditional onboarding assumes domain fluency and cognitive patience that first-timers simply do not possess.** To win this cohort, Groww must replace the intimidating "trading terminal" mindset with a conversational, zero-anxiety guide that speaks their language and lets them start small without feeling foolish.

---

### B. What is In Scope
For this prototype, we targeted the initial high-intent onboarding funnel ("Zero to First SIP"):
1. **Pehla ₹500 Voice & Chat Copilot ("Paisa Dost"):** A conversational agent supporting colloquial Hinglish and casual English via voice and text, eliminating financial jargon.
2. **Deterministic Starter Plan Cards:** Curated, risk-aligned mutual fund recommendations (from an illustrative 8-fund catalogue) that emphasize *what can go wrong* before showing potential upside.
3. **Explicit Confirmation & Sandbox Execution:** A cryptographically verified confirmation step (tap or spoken "haan confirm") simulating a zero-risk sandbox SIP mandate.
4. **Interactive Jargon Decoder:** Instant, context-aware breakdowns of terms like NAV, SIP, and expense ratio using real-life analogies rather than textbook definitions.
5. **Paycheck-Triggered Automation ("Aise Baantein"):** A simulated salary/stipend credit flow with dynamic 3-way sliders (Emergency Fund, SIP, Fun Money) and email nudges.
6. **Internal Compliance & Evals Dashboard (`/ops`):** Real-time monitoring of guardrail trigger events, session analytics, and an automated 22-case golden evaluation suite.

---

### C. What is Out of Scope (Deliberate Trade-offs)
1. **Real Money Movement & Live AMC/KYC APIs:** Focused entirely on user psychology and activation flow; order execution runs in a sandboxed mock environment.
2. **Individual Stock Tips, F&O, & Crypto:** Excluded deliberately due to SEBI compliance standards and the ethical obligation to protect first-time investors from speculative destruction.
3. **Automated Bank Account Aggregator (AA) Integration:** Income credit is triggered through a simulated demo hook rather than production bank scraping.
4. **Complex Technical Portfolio Analytics:** Replaced standard deviation and beta charts with simple gain/loss figures and behavioral coaching notes during market dips.

---

### D. The Solution: "Pehla ₹500" — And Why It Works
Our solution is anchored on the principle: **"The AI Proposes, Deterministic Code Disposes."**

Instead of forcing users to browse hundreds of funds, Paisa Dost asks up to three conversational questions (amount, time horizon, and risk comfort) and presents a single, digestible **Starter Plan Card**. Every card prominently highlights the fund's risk level, costs, and an explicit "what can go wrong" disclosure. 

Critically, **the LLM is never given transactional authority.** An order can only be created when the user provides explicit manual confirmation, which validates a backend cryptographic HMAC token. If a user asks for speculative stock tips or guaranteed profits, hardcoded pre-filters immediately intercept the prompt, issue an educational explanation, and alert the ops team.

By combining low financial friction (starting at ₹500), language comfort (Hinglish), and guaranteed safety guardrails, we convert intimidating investment decisions into a confidence-building milestone.
