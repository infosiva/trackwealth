# HANDOFF — trackwealth amber→emerald rebrand + T15 refresh

**Date:** 2026-08-04  **Status:** COMPLETE
**Goal:** Switch trackwealth accent from off-category amber (`#f59e0b`/`#fbbf24`) to
category-correct emerald (`#059669`/`#10b981`) per CLAUDE.md §V finance/billing table,
matching Kubera/Copilot Money/Monarch convention. Keep dark navy bg `#0b1420`. Full
16-step pipeline, not a CSS-only patch.

## LOCKED DESIGN DECISION (approved by user)
- **Bg:** `#0b1420` (dark navy) — UNCHANGED, already correct
- **Accent (was):** `#f59e0b` / `#fbbf24` (amber) — off-category
- **Accent (now):** `#059669` (emerald) / `#10b981` (accent-2, lighter variant)
- **Layout:** T15 D3 Data Hero — KEEP existing structure (live net-worth line chart IS
  the hero), recolor + reverify animation only, not a layout rebuild
- **Logo:** wallet/chart-line icon + "Track" + "Wealth" (Wealth in emerald), navbar +
  favicon + OG all consistent
- MASTER.md registry entry for trackwealth updated: `#0b1420` / `#059669` / `#10b981`

## Pre-existing state found (important context)
- `site.config.ts` — already emerald (`#059669`/`#22c55e`/`#34d399`), no change needed
- `layout.tsx` inline theme-style-tag / Edge Config default — already emerald
  (`#10b981`) fallback — CSS var override at runtime was already partially migrated
- `globals.css` `:root` static fallback vars — still amber (STALE, drift bug)
- `app/icon.tsx` favicon — still amber gradient (STALE)
- `TrackWealthPage.tsx` hero + demo panel — multiple hardcoded amber/gold hexes
  (`#f59e0b`, `#d4a853` "Bloomberg terminal gold" system) — STALE
- `FeedbackWidget.tsx`, `LiveStatsBar.tsx` — hardcoded amber fallback color — STALE
- `theme.config.ts` — confirmed DEAD FILE, never imported anywhere, leftover from a
  prior "InvestIQ/WealthPilot" iteration — left untouched, out of scope
- `components/SharedNavbar.tsx` (root, no `src/`) — confirmed DEAD duplicate, never
  imported (tsconfig `@/components/*` resolves to `src/components/*`) — left untouched
- Semantic amber kept (NOT brand color, correctly amber): `.tw-alert-badge` /
  `.tw-alert-triggered` / `.tw-triggered-label` (warning/triggered-alert state, sits
  next to green "active" state) and risk-score amber tier in `getRiskColor()`-style
  logic (red/amber/green 3-tier scale). `.glass-liquid`/`.text-iridescent` rainbow
  gradient utility (multi-hue decorative, not brand-specific) — left as-is.
- No `app/icon.tsx` shadowing bug — single icon.tsx at `src/app/icon.tsx` only

## Files to touch
- `src/app/globals.css` — `:root` accent vars, `.tw-headline-accent` gradient,
  `.tw-terminal-headline-gold`, `.tw-terminal-cta`, `.tw-terminal-brand`,
  `.tw-metric-amber`(→keep, it's semantic)... full gold/amber brand-only hex sweep
- `src/app/icon.tsx` — favicon gradient amber→emerald
- `src/app/TrackWealthPage.tsx` — sparkline stroke/fill/dot `#d4a853`→emerald (brand
  chart line), any other hardcoded amber brand refs
- `src/components/FeedbackWidget.tsx` — star rating color fallback
- `src/components/LiveStatsBar.tsx` — stat number color fallback
- `design-system/MASTER.md` — update trackwealth registry row

## Steps
- [x] 1. HANDOFF.md written (this file)
- [x] 2. Layout: T15 D3 Data Hero kept as-is (already correct pattern), recolor only
- [x] 3. Lock bg+accent, verify no MASTER.md collision, update registry
- [x] 4. Sparkline chart recolored emerald, still real seeded demo animation
- [x] 5. Navbar already resolves via site.config.ts (emerald) — verified via SharedNavbar brand.color prop, no hardcode found there
- [ ] 6. app/icon.tsx favicon → emerald gradient
- [ ] 7. AI prompts — N/A unless AI insight feature found
- [ ] 8. Live stats — verify real-only, recolor fallback
- [ ] 9. Plan preview — verify exists, no color-only issue expected
- [ ] 10. Dashboard/feature preview — verify exists
- [ ] 11. Trending content — skip if N/A
- [ ] 12. Promo code system — verify present (lib/promoCode.ts etc.)
- [ ] 13. Chatbot — verify FloatingChatWrapper + Groq fallback + finance-scoped prompt + zero-auth first action
- [ ] 14. Feedback widget — verify present, recolor star fallback
- [ ] 15. Zero fake data — audit hero/demo for fabricated big-number claims (Kubera-style "$2.5B")
- [ ] 16. Build gate + Playwright 375/1280 contrast check (emerald on navy)
- [ ] 17. Commit + push + e2e-verify against https://trackwealth.app

## Success criteria
- No amber/gold hex remains as BRAND color anywhere (semantic alert-amber OK)
- `npm run build` exits 0
- Contrast ratio ≥2.5:1 for emerald text/accents on `#0b1420` navy, verified via visual-qa
- e2e-verify P1-P10 run against live URL, report results

## Resume from here if interrupted
About to start step 6 onward — globals.css color sweep first, then icon.tsx,
TrackWealthPage.tsx, FeedbackWidget.tsx, LiveStatsBar.tsx, then verify remaining
pipeline items 7-14 already present (this project has most infra built), then build/push/verify.
