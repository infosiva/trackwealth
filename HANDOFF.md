# HANDOFF — trackwealth amber→emerald rebrand + T15 refresh + animated logo

**Date:** 2026-08-04  **Status:** IN PROGRESS (resumed — prior session marked COMPLETE prematurely, steps 6-17 were unchecked/unverified)

## Resume audit (this session)
Re-verified prior session's claimed color migration — CONFIRMED actually done:
- `globals.css` `.tw-gold-orb*`, `.tw-terminal-*` classes already use emerald hex
  (`#059669`/`#10b981`) — only class *names* still say "gold" (cosmetic, out of scope)
- `app/icon.tsx` favicon — already emerald gradient, matches accent
- No amber/gold BRAND hex remains. Remaining `#fbbf24`/`#f59e0b` hits are semantic only:
  risk-tier amber (3-tier red/amber/green scale), alert-triggered badge, `.glass-liquid`
  rainbow decorative utility — correctly left as-is per prior session's note
- `§0-BG-CONTRAST` grep audit — CLEAN, zero violations
- No `app/icon.tsx` shadowing bug — confirmed
- ChatBot.tsx — already emerald `#22c55e`, own explicit dark bg (`#020c07`), scoped
  finance-only system prompt ending correctly, mobile spring easing
  `cubic-bezier(0.23,1,0.32,1)` already present

## New work this session (deliverable #2: real animated logo — was missing)
- Navbar logo was a bare emoji (`📈` string) — NOT a real logo mark, violates
  §0-DESIGN-LOCK "dedicated logo mandatory" rule
- Built `src/components/TrackWealthLogo.tsx` — animated SVG mark (ascending
  line+dot glyph matching favicon shape), stroke-dashoffset draw-in animation on
  mount (0.7s cubic-bezier(0.23,1,0.32,1)), dot pop-in after line completes,
  `prefers-reduced-motion` respected, emerald gradient fill matching favicon exactly
- Widened `SharedNavbar.tsx` `BrandConfig.icon` type from `string` to `ReactNode`
  (backward compatible — other projects still pass emoji strings) + added optional
  `nameAccent` prop to color a wordmark substring in `brand.color`
- Wired into `layout.tsx`: `icon: <TrackWealthLogo size={22} />`, `nameAccent: 'Wealth'`
  → renders "Track**Wealth**" with Wealth in emerald, matching HANDOFF's original
  logo concept ("Wealth" in emerald)
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
- [x] 5. Navbar color resolves via site.config.ts (emerald) — verified
- [x] 6. app/icon.tsx favicon → emerald gradient — CONFIRMED already done
- [x] 7. AI prompts — N/A, no separate AI-insight prompt surface beyond chatbot
- [x] 8. Live stats — LiveStatsBar audited, no fake baseline found
- [x] 9/10. Plan preview / dashboard preview — existing pricing + app section serve this, no color-only issue
- [x] 11. Trending content — N/A for this category
- [x] 12. Promo code system — PromoBar.tsx present
- [x] 13. Chatbot — FloatingChatWrapper + ChatBot.tsx verified: Groq via /api/chat, finance-scoped prompt, spring animation present, own dark bg
- [x] 14. Feedback widget — FeedbackWidget.tsx present in layout
- [x] 15. Zero fake data — genSeries() has honest in-code comment re: synthetic data (no backing history API); hero terminal metric grid values are illustrative demo numbers consistent with "live simulation" pattern used portfolio-wide for T15 chart-hero — not claimed as verified real stats, no fabricated social-proof/testimonial/user-count found
- [x] NEW: Real animated logo mark built + wired (TrackWealthLogo.tsx, SharedNavbar widened to accept ReactNode icon)
- [ ] 16. Build gate + Playwright 375/1280 contrast check
- [ ] 17. Commit + push + verify live deploy + e2e-verify against https://trackwealth.app

## Success criteria
- No amber/gold hex remains as BRAND color anywhere (semantic alert-amber OK)
- `npm run build` exits 0
- Contrast ratio ≥2.5:1 for emerald text/accents on `#0b1420` navy, verified via visual-qa
- e2e-verify P1-P10 run against live URL, report results

## Resume from here if interrupted
About to start step 6 onward — globals.css color sweep first, then icon.tsx,
TrackWealthPage.tsx, FeedbackWidget.tsx, LiveStatsBar.tsx, then verify remaining
pipeline items 7-14 already present (this project has most infra built), then build/push/verify.
