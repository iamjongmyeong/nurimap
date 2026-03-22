# Test Spec — Sprint 15 Browse/Detail UI Refresh

## Automated Checks
- src/app-shell/NurimapBrowse.test.tsx
- src/app-shell/NurimapDetail.test.tsx
- src/app-shell/PlaceRegistrationFlow.test.tsx
- pnpm lint
- pnpm exec tsc --noEmit

## Browser QA
1. Desktop: list sidebar -> detail sidebar -> back to list
2. Mobile: map -> list -> detail -> back to map
3. Registration: create/merge/overwrite success alert, geocode failure alert, duplicate confirm cancel

## User QA Required
- 없음 (현재 사용자 결정 사항 반영 완료). 단, 최종 시각 피드백은 review/qa 문서에 기록 가능.

## Evidence
- artifacts/qa/sprint-15/
- docs/05-sprints/sprint-15/qa.md
