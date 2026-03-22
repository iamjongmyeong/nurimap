# Test Spec: Sprint 19 Mobile UI Tailwind + Review Flow

## Objective
모바일 전 화면 Figma refresh, detail 하단 CTA/add-rating flow, DaisyUI repo-wide 제거를 검증한다.

## References
- `.omx/plans/prd-sprint-19-mobile-ui-tailwind-review-flow.md`
- `.omx/specs/deep-interview-sprint-19-mobile-ui-figma-tailwind-only.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/10-review.md`
- `src/app-shell/NurimapAppShell.tsx`
- `src/app-shell/PlaceAddPanels.tsx`
- `src/app-shell/MapPane.tsx`
- `src/app-shell/placeRepository.ts`
- `src/auth/AuthProvider.tsx`
- `docs/01-product/user-flows/review.md`
- `docs/01-product/user-flows/browse-and-detail.md`

## Verification Scope
- 모바일 map/list/detail/add Figma refresh
- detail 하단 `평가 남기기` CTA visibility rule
- add-rating empty/filled/success/error state
- review 저장 후 detail 즉시 반영
- add-rating state ownership / back / success 복귀
- repo-wide DaisyUI 제거 후 auth/map/app-shell regression
- docs/sprint sync

## Automated Test Matrix
| Area | Assertion |
|---|---|
| Mobile map shell | 모바일 map 화면이 Figma 구조와 맞는 wrapper/height/GNB(or approved navigation affordance)로 렌더된다 |
| Mobile list shell | 모바일 list가 `9:299` 기준 header/list/divider/bottom nav hierarchy를 따른다 |
| Mobile detail CTA visible | `my_review === null`인 place detail에서 `평가 남기기` CTA가 보인다 |
| Mobile detail CTA hidden | `my_review !== null`인 place detail에서 CTA가 보이지 않는다 |
| Add-rating route/state entry | CTA를 누르면 detail-owned child surface로서 add-rating screen이 열린다 |
| Add-rating empty state | `14:388` 기준 textarea empty, rating stars, submit button 구조가 맞다 |
| Add-rating filled state | `14:339` 기준 filled textarea 상태가 맞다 |
| Review policy reuse | 별점 1~5, 후기 선택 입력, 기존 max length policy가 유지된다 |
| Review save success | 저장 성공 후 detail로 복귀하고 새 리뷰가 즉시 목록/집계에 반영된다 |
| Add-rating back behavior | add-rating에서 back 시 `/places/:placeId` detail 맥락으로 안전하게 복귀한다 |
| Existing review block | 이미 review가 있는 사용자는 add-rating flow로 진입하지 않는다 |
| Review save failure | 저장 실패 시 입력값 유지 + 에러 노출 |
| Detail review list | rating-only review / 최신순 / 작성자/작성일 표시 계약 유지 |
| DaisyUI cleanup | source tree에서 DaisyUI dependency/plugin/semantic class 사용이 제거된다 |
| Auth regression | auth request/otp/name/verifying 화면이 Tailwind-only 상태에서도 정상 동작한다 |
| Map regression | map zoom/loading/error/fallback renderer가 Tailwind-only 상태에서도 정상 렌더된다 |

## Proposed Test Files
- `src/App.test.tsx`
- `src/app-shell/NurimapBrowse.test.tsx`
- `src/app-shell/NurimapDetail.test.tsx` (기존 `detail-review-compose` 미노출 assertion을 CTA visibility/hidden 시나리오로 전환)
- `src/app-shell/PlaceLookupFlow.test.tsx`
- `src/app-shell/PlaceRegistrationFlow.test.tsx`
- `src/app-shell/placeRepository.test.ts`
- `src/auth/AuthFlow.test.tsx`

## Static/Repo Checks
- `rg -n 'daisyui|@plugin "daisyui"|btn-(circle|ghost|outline|primary|secondary|warning|sm)|\bbtn\b|form-control|loading(-spinner|-xs|-sm|-md|-lg)|bg-base-[0-9]+|text-error|text-primary|textarea-bordered' src docs package.json`
- `docs/03-specs/01-app-shell-and-layout.md`와 `docs/00-governance/agent-workflow.md`의 DaisyUI baseline 문구 제거 확인
- `pnpm lint`
- `pnpm build`
- 필요 시 `pnpm exec tsc --noEmit`

## AI Agent Interactive QA
- 모바일 390px 기준으로 Figma node `9:299`, `14:182`, `14:388`, `14:339`와 실제 hierarchy 비교
- map frame `9:319`와 실제 mobile map wrapper height/navigation affordance 비교
- detail CTA visibility와 add-rating success->detail 복귀 설명 가능 여부 확인

## Browser Automation QA
- Mobile `390x800`
  1. map → list → detail
  2. detail CTA visible/hidden case
  3. add-rating empty → filled → submit success → detail 복귀
  4. add-rating back/cancel behavior
- Desktop `1280x900`
  1. sidebar browse/detail 유지
  2. Daisy 제거 후 주요 회귀 없음 확인
- Evidence path:
  - `artifacts/qa/sprint-19/`

## User QA Required
- Figma 기준 typography/spacing/icon fidelity 최종 확인
- add-rating empty/filled 시각 상태가 기대와 맞는지 확인
- detail 복귀 후 새 리뷰가 기대 위치에 즉시 보이는지 확인

## Risks To Watch
1. current inline `DetailReviewComposer` 제거/대체 과정에서 review save logic hookup이 깨질 수 있음
2. DaisyUI 제거와 Figma refresh가 동시에 일어나 diff 원인 분리가 어려울 수 있음
3. mobile map wrapper height/navigation affordance가 `9:319` 해석과 어긋날 수 있음
4. auth/map regression이 app-shell 변경 후반에 드러날 수 있음

## Exit Signal
- targeted tests 통과
- lint/build/typecheck green
- DaisyUI grep clean
- browser QA evidence 확보
- sprint docs + live docs sync 반영
