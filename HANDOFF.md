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
