# Task Statement
Execute Sprint 13 from docs/05-sprints/sprint-13/planning.md.

# Desired Outcome
1. Desktop runtime detail panel stays visible after logged-in list click, independent of mouse wheel scrolling.
2. Remove the visible map hero copy and show Kakao zoom controls using official API.
3. Make three user-provided Naver URLs resolve to canonical placeId 1648359924 and complete lookup successfully.
4. Keep docs/specs/tests synchronized and verify with tests + manual/runtime evidence.

# Known Facts / Evidence
- Planning source of truth: docs/05-sprints/sprint-13/planning.md
- Map runtime likely centers around src/app-shell/MapPane.tsx and src/app-shell/NurimapAppShell.tsx
- Current visible hero copy is in src/app-shell/MapPane.tsx
- Current URL parsing exists in src/app-shell/naverUrl.ts and api/_lib/_naverUrl.ts
- Current lookup services/fixtures exist in src/server/placeLookupService.ts, api/_lib/_placeLookupService.ts, src/server/fixtures/placeLookupFixtures.ts, api/_lib/_placeLookupFixtures.ts
- Verified on 2026-03-12: https://naver.me/I55a1Ogw redirects to https://map.naver.com/p/entry/place/1648359924?placePath=%2Fhome
- Official Kakao docs to consult: Map.addControl, ZoomControl, zoom_changed/getLevel

# Constraints
- TDD first
- Codex-only workers
- Do not let workers edit the same files
- Leader owns docs updates unless explicitly delegated
- Must verify runtime-sensitive map behavior, not only JSDOM fallback

# Unknowns / Open Questions
- Exact root cause of detail panel repaint/stacking bug in Kakao runtime
- Whether short-link normalization should become server-authoritative or stay shared helper-based
- Whether map-level test hooks stay visible or become non-visual

# Likely Codebase Touchpoints
- src/app-shell/MapPane.tsx
- src/app-shell/NurimapAppShell.tsx
- src/app-shell/NurimapBrowse.test.tsx
- src/app-shell/NurimapDetail.test.tsx
- src/app-shell/naverUrl.ts
- api/_lib/_naverUrl.ts
- src/server/placeLookupService.ts
- api/_lib/_placeLookupService.ts
- src/server/fixtures/placeLookupFixtures.ts
- api/_lib/_placeLookupFixtures.ts
- src/app-shell/NaverUrlNormalization.test.tsx
- src/app-shell/PlaceLookupFlow.test.tsx
- src/server/placeLookupService.test.ts
