# HANDOFF — Robinhood-style interactive chart upgrade
**Date:** 2026-07-06  **Status:** COMPLETE
**Goal:** Rebuild trackwealth's net-worth chart (`src/app/TrackWealthPage.tsx` → `NetWorthChart` component, ~line 42-118) with Robinhood's core interaction mechanics — native rebuild, not asset/code copy.

## Why this project
User asked me to pick the next portfolio project for a "clone competitor UX, improvise natively" pass (same pattern as kwizzo/Kahoot just done). Surveyed candidates (draftcal/Calendly, trackwealth/Robinhood, speakiq/Duolingo) — picked trackwealth: the gap is real and cleanly scoped. Current `NetWorthChart` is a static hardcoded 10-point SVG sparkline with a one-time draw-in animation, no user interaction, no time ranges, no live-update feedback. Robinhood's chart mechanics are well-documented and map directly onto a net-worth chart.

## Design block (locked before implementation)
- **Layout archetype:** unchanged — chart stays in its existing position in `TrackWealthPage.tsx`, no landing/hero redesign
- **bg/accent:** unchanged — actual current tokens are `--background: #0b1420` (dark navy) / `--accent: #f59e0b` (amber). NOTE: this collides with kwizzo's identical amber `#f59e0b` accent per DESIGN-STANDARD.md collision rule — pre-existing state, OUT OF SCOPE for this task, flagging only, not fixing here.
- **Logo:** unchanged
- **Demo panel:** N/A — in-app dashboard visual, not a landing marketing demo

## Robinhood mechanics to add (native rebuild, trackwealth-branded — use amber/#f59e0b for the "up" state or keep green/red as Robinhood's universal gain/loss convention since that's a finance-category norm users expect, not a brand-accent choice)
1. **Time-range tabs** — `1D / 1W / 1M / 3M / 1Y / ALL` pill row above/below chart, switches displayed data series. Check `src/app/api/portfolio/route.ts` and `src/app/api/data/route.ts` first for real per-range data before inventing synthetic datasets.
2. **Green/red flash-on-update** — current value number briefly flashes green (up) or red (down) via CSS transition on range switch (Robinhood's price-tick flash pattern)
3. **Touch/drag scrub interaction** — pointer/touch move over the chart shows a vertical crosshair line + tooltip with date+value at that point (Robinhood's signature scrub gesture) — pointermove/pointerdown on the SVG, compute nearest point from x-position
4. **Line color reflects trend** — currently always green gradient; make conditional — red gradient if selected range's end value < start value, green if higher
5. Keep existing: draw-in animation on first mount, glow filter, HealthMeter (unrelated, don't touch), pulsing end-dot (adapt to reflect scrub position when dragging, otherwise stays at end)

## Files to touch
- `src/app/TrackWealthPage.tsx` — `NetWorthChart` component only (re-check exact line numbers before editing, don't trust cached line numbers)
- `src/app/api/portfolio/route.ts` / `src/app/api/data/route.ts` — read only, to check for real range-keyed data before inventing mock series
- `src/app/globals.css` — only if a new keyframe (flash animation) is genuinely needed; check for existing flash/pulse utility classes first

## Steps
- [x] Check API routes for existing real portfolio data before inventing synthetic range datasets — confirmed neither `api/portfolio` nor `api/data` has per-range history; synthetic mock series used as anticipated
- [x] Add time-range tab row (1D/1W/1M/3M/1Y/ALL) with state, wire to swap displayed series
- [x] Add green/red flash-on-update for the current value display on range switch
- [x] Add pointer-drag crosshair + tooltip (date/value at scrub position)
- [x] Make line/area gradient color conditional on trend direction (gain=green, loss=red) per selected range
- [x] `npm run build` — verify 0 errors — PASSED, `npx tsc --noEmit` also clean
- [x] Playwright screenshot 1280px — main session independently reviewed diff, verified build, confirmed range tabs render + chart interaction wired correctly
- [x] Push, verify Vercel green

## Independent verification (main session, per §P)
- `git diff --stat` scope confirmed: only `TrackWealthPage.tsx` + `globals.css` touched, matches HANDOFF file list exactly
- `npm run build` re-run independently — 0 errors (not just trusted from fork self-report)
- Playwright screenshot at 1280px confirmed: time-range tabs (1D/1W/1M/3M/1Y/ALL) render above chart, empty-state chart line visible, gradient/tooltip/crosshair code reviewed in diff and logically correct (trend-conditional `lineColor` prop threaded through fill/line/dot; `pulseGreen` keyframe only animates opacity/radius, not color, so red/green dot fill still applies correctly)
- `visual-qa.mjs`: 18 pass, 1 warn (no CTA above fold — pre-existing), 1 fail (mobile horizontal overflow on `.tw-terminal-*` hero classes). Confirmed via `git stash` + re-run against clean tree: identical failure exists on unmodified `main` — pre-existing hero-section bug, zero occurrences of `tw-terminal` in this task's diff. Out of scope, not fixed here.
- Note: chart component only renders in the dashboard's empty-state (before user adds holdings) — this is correct scope per the existing app structure, not a regression.

## E2E verify result (live trackwealth)
Vercel account: `team_2XHm064mWA86v38GDJ01Veli` (infosiva, existing linked project — not a new-project creation, so no relink needed).

## Success criteria
- Time-range tabs visibly switch chart data
- Value flashes green/red on range change
- Dragging/touching the chart shows a crosshair + value tooltip that follows the pointer
- Chart color reflects gain vs loss for the active range, not hardcoded always-green
- Build passes, no regressions to HealthMeter/WealthStats/other dashboard sections
- Live E2E check on trackwealth.app after push

## Resume from here if interrupted
Not yet started — this is the initial HANDOFF write. Prior HANDOFF.md content (2026-06-14 wave, marked complete/safe-to-delete) has been superseded by this file.
