# HANDOFF — trackwealth production-ready gate docs
**Date:** 2026-10-08  **Status:** IN PROGRESS
**Goal:** record ai-core status and OWASP LLM Top 10 dispositions (gate items 36-45).

## ai-core (AI platform standard)
- EXEMPT for now: chat/portfolio routes use the local free-first cascade in `src/lib/ai.ts`. ai-core (api.prismlane.app) is reachable, but no tenant key is issued (owner approval pending), so it is not wired. No document upload or RAG in this app. Revisit when the tenant key exists.

## OWASP LLM Top 10 dispositions (gate item 45, 2026-10-08; list recalled from memory, unverified)
- LLM01 prompt injection: `sanitizeUserInput` (`src/lib/guard`) applied in `src/app/api/chat/route.ts`; `/api/ai/chat` and `/api/portfolio` not yet guarded. No tool sandbox. PARTIAL.
- LLM02 sensitive info disclosure: portfolio data is user-supplied and sent to providers; no redaction layer. PARTIAL.
- LLM04/10 DoS / unbounded consumption: per-IP rate limits (`AI_LIMITER`, 60/hr chat); no token budgets. PARTIAL.
- LLM05 improper output handling: output rendered as text; not audited for HTML sinks. UNVERIFIED.
- LLM06 excessive agency: no tool-calling agents. NOT APPLICABLE as built.
- Others (supply chain, poisoning, embeddings, misinformation): not assessed.

## Resume from here
Docs written. Remaining for trackwealth: guard `/api/ai/chat` and `/api/portfolio`; item 21 skill-stack passes still open.


## ANIMATED SCOPE (recorded 2026-10-09 sweep)
- What moves: CSS keyframes already shipped: badgeFloat, blink, borderSpin, fadeIn, fadeSlideUp, fadeUp, flashDown, flashUp, float, fw-spin, gateSlideUp, glassShimmer.
- Why: ambient background + entry/press feedback on the product's core action; no motion carries information alone.
- Trigger: page load (ambient/entry), user press/hover (feedback).
- Reduced-motion: `prefers-reduced-motion` handling present in the project's styles (verified by scan 2026-10-09).
- Still open: `/review-animations` run (needs a running app, one at a time).
