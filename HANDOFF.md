# HANDOFF — trackwealth design lock + cleanup
**Date:** 2026-10-05  **Status:** COMPLETE (uncommitted)
**Goal:** Unique emerald identity, honest data, working pricing/feedback/chat, zero dead links.

## DESIGN LOCK
- Archetype: `finance-terminal` (design-system/layout-archetypes.ts) — terminal hero + tool-first workbench below
- Background: deep forest-ink #07130f base (hub-overridable via theme-loader `background`), emerald aurora orbs, grain
- Accent: #0b6e4f (checked free via check-palettes.mjs); text-on-dark tint #34d399 for 4.5:1
- Logo: ascending line + end node inside rounded square, emerald gradient, wordmark "Track" + accent "Wealth"; app/icon.svg + app/apple-icon.svg-derived png

## Steps
- [x] accent swap, icon.svg/apple-icon, delete icon.tsx
- [x] dead links (about, contact missing) / fake data removal / pricing always on
- [x] feedback/chat verify, tsc, build, screenshots

## Resume from here if interrupted
Done. Files changed: src/components/Hero.tsx (new compact one-viewport hero, rotating 6 sample questions typewriter, chips clickable, reduced-motion static), src/app/TrackWealthPage.tsx (hero/steps/features/tour removed, Hero wired), src/app/globals.css (.tw-hero*), icon.svg + apple-icon.tsx added, icon.tsx removed, about/contact pages exist. Verified: tsc clean, build ok, scrollHeight 1280x800=2414/800, 375x812=3020/812 (hero fits fold; tool+pricing below), scrollWidth==innerWidth.

## ai-core status (2026-10-07)
- Not on ai-core yet (exemption, stated honestly): AI calls use the local free-first chain in `src/lib/ai.ts` / `src/app/api/chat`. No document upload, RAG, memory or per-tenant budgets in this app today, so no ai-core feature applies. If any of those are added, extend/consume ai-core (`agents/ai-core`) instead of a local copy.


## OWASP LLM Top 10 dispositions (gate item 45, 2026-10-07; list recalled from memory, unverified)
- LLM01 prompt injection: lib/guard.ts present, NOT yet wired into routes; no output filtering or tool sandbox review done. PARTIAL.
- LLM02 sensitive info disclosure: `redact()` helper available; not applied to every log. PARTIAL.
- LLM04/10 DoS / unbounded consumption: per-IP rate limit where present; token budgets not enforced. PARTIAL.
- LLM05 improper output handling: model output rendered as text; not audited for HTML sinks. UNVERIFIED.
- LLM06 excessive agency: no tool-calling agents audited. UNVERIFIED.
- Others (supply chain, poisoning, embeddings, misinformation): not assessed.


## ANIMATED SCOPE (gate items 19/21, derived from code 2026-10-07)
- Moves: AnimatedBackground (ambient hero/background); CSS keyframes: badgeFloat, blink, borderSpin, fadeIn, fadeSlideUp, fadeUp, flashDown, flashUp; transitions on interactive elements.
- Trigger: page load (ambient) and hover/press (interactive). Reduced motion: honoured via prefers-reduced-motion block.
- STATUS: scope documented from existing code only. Skill-stack passes (ui-ux-pro-max, emil-design-eng, impeccable critique, review-animations) and 375/1280 screenshot review are NOT yet run for this app. Item 21 stays OPEN until they are.
