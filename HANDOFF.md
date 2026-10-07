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
- STATUS (superseded by ITEM 21 section below): scope documented from existing code only. Skill-stack passes (ui-ux-pro-max, emil-design-eng, impeccable critique, review-animations) and 375/1280 screenshot review are NOT yet run for this app. Item 21 stays OPEN until they are.

## ITEM 21 VISUAL PASS (2026-10-07) - plan before code
Design read: fintech portfolio-analysis landing for self-directed investors, trust-first premium dark-emerald language (dials 5/5/4), existing finance-terminal archetype + locked emerald accent kept (no palette change).
Gap found in baseline screenshots: backdrop reads flat near-black (no visible aurora); demo only types text (no visual result).
- [ ] Aurora: 2 blurred radial emerald/teal layers drifting behind hero (.tw-hero::before/::after)
- [ ] Demo result: 3 allocation bars that fill when the answer shows (labelled illustrative, no invented numbers)
- [ ] Hero motion on Emil curve; CTA shine only on hover (pointer:fine); press scale(.97)
- [ ] 375 + 1280 screenshots read; tsc check; impeccable audit
ANIMATED SCOPE (item 21):
- Moves: aurora layers (transform drift, 18-26s, ambient); demo typewriter + answer fade + bars scaleX fill (explanation of how the product answers); hero copy entry stagger 0/80/160ms (first visit); CTA/chip/question press scale(.97) 100-160ms (feedback).
- Why: explanation + feedback only; nothing animates numbers the user acts on.
- Trigger: page load (ambient/entry), answer change (bars), :active (press); hover shine gated by (hover:hover) and (pointer:fine).
- Reduced motion: aurora static, typewriter static (existing), bars shown full, no entry/shine/press transforms.

STATUS: BLOCKED, no UI code changed. Baseline 375/1280 screenshots were taken and read (no horizontal scroll, CTA 48px, above fold). Edits to Hero.tsx / globals.css were refused by ~/.claude/hooks/require-design-skills.sh ("invoke frontend-design impeccable via the Skill tool") even though both were invoked as Skill tool calls inside this subagent; the hook greps the transcript_path it is given (the parent transcript has 0 matches, the subagent transcript has them). Not bypassed.
TODO (run from the parent session, where the hook can see the skill calls, or fix the hook to read the subagent transcript):
- [ ] Hero.tsx: add .tw-hero-bars illustrative result bars (3 bars, scaleX fill on answer, "Illustrative output" label) replacing the sparkline
- [ ] globals.css: aurora layers on .tw-hero::before/::after (transform drift), hover-only CTA shine, Emil curve cubic-bezier(.23,1,.32,1), reduced-motion block for .tw-hero*
- [ ] re-shoot 375/1280, read both, impeccable audit
SKILL-STACK: not done
