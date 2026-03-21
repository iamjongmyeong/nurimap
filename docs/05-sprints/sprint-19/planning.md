# Sprint Goal

- Sprint 19에서 Nurimap의 mobile map/list/detail/add surface를 승인된 Figma 방향으로 재정렬하고, detail 하단 `평가 남기기` CTA + add-rating child surface로 review entry를 전환한다.
- repo 전체에서 DaisyUI dependency/plugin/semantic class usage를 제거해 Tailwind-only end state로 수렴한다.
- source-of-truth 문서, 구현, 테스트, QA evidence를 같은 Sprint 안에서 동기화해 후속 작업자가 추정 없이 이어서 작업할 수 있게 한다.

# In Scope

- Sprint 19 source-of-truth 문서 materialization
  - `docs/05-sprints/sprint-19/planning.md`, `qa.md`, `review.md`를 생성하고 current execution brief를 고정한다.
  - `docs/03-specs/01-app-shell-and-layout.md`, `docs/03-specs/04-place-detail.md`, `docs/03-specs/10-review.md`를 Sprint 19 계약과 맞춘다.
  - `docs/01-product/user-flows/browse-and-detail.md`, `docs/01-product/user-flows/review.md`, `docs/04-design/browse-and-detail.md`, `docs/04-design/place-submission.md`, `docs/00-governance/agent-workflow.md`를 Tailwind-only + add-rating flow 기준으로 동기화한다.
- mobile browse/detail/review flow refresh
  - mobile map/list/detail/add/add-rating surface를 approved Figma handoff(`9:299`, `9:319`, `14:182`, `14:388`, `14:339`) 기준으로 정렬한다.
  - detail 하단 `평가 남기기` CTA는 `my_review === null`일 때만 노출한다.
  - add-rating은 detail-owned transient child surface로 열리고, save success 시 같은 detail로 복귀하며 새 review가 즉시 보인다.
- repo-wide DaisyUI cleanup
  - `package.json` dependency, `src/index.css` plugin, source tree semantic class usage를 제거한다.
  - auth/map/app-shell이 Tailwind-only 상태에서도 동일 runtime contract를 유지한다.
- tests / QA / verification sync
  - CTA visibility/hidden, add-rating success/back/failure, single-review rule, Daisy removal regressions를 자동화 테스트로 보호한다.
  - AI Agent QA / Browser QA / User QA handoff를 `docs/05-sprints/sprint-19/qa.md`에 기록한다.

# Out Of Scope

- 이미 review가 있는 사용자를 위한 일반 review edit/delete flow 추가
- mobile 범위를 줄여 일부 surface만 Figma 반영하는 작업
- DaisyUI와 Tailwind를 병행 유지하는 최종 상태
- browse/detail contract와 무관한 새 라우팅 체계 도입
- deploy/live environment 운영 작업 자체

# Selected Specs

- `docs/03-specs/01-app-shell-and-layout.md`
- `docs/03-specs/02-map-rendering.md`
- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/08-place-registration.md`
- `docs/03-specs/09-place-merge.md`
- `docs/03-specs/10-review.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/01-product/user-flows/review.md`
- `docs/01-product/user-flows/place-submission.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/place-submission.md`
- `docs/02-architecture/domain-model.md`
- `docs/00-governance/agent-workflow.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `.omx/plans/plan-sprint-19-mobile-ui-tailwind-review-flow-consensus.md`
- `.omx/plans/prd-sprint-19-mobile-ui-tailwind-review-flow.md`
- `.omx/plans/test-spec-sprint-19-mobile-ui-tailwind-review-flow.md`
- `.omx/specs/deep-interview-sprint-19-mobile-ui-figma-tailwind-only.md`

# Constraints

- DaisyUI는 repo 전체에서 완전히 제거한다. dependency/plugin/class usage가 모두 사라져야 완료로 간주한다.
- mobile 구현 범위는 map/list/detail/add/add-rating 전 화면이다. 일부 surface만 반영하는 scope reduction은 허용하지 않는다.
- `평가 남기기` CTA는 `my_review === null`일 때만 보인다.
- add-rating은 detail-owned child surface이며, durable/shareable route는 계속 `/places/:placeId`를 유지한다.
- add-rating save success 후에는 같은 place detail로 복귀하고 새 review/집계가 즉시 보여야 한다.
- Figma에 직접 없는 mobile detail/add visual detail은 desktop UI 언어를 재사용하되, 새로운 기능은 추가하지 않는다.
- current browse/detail/back/history/runtime contract는 plan이 명시적으로 바꾸지 않는 한 유지한다.
- source-of-truth 문서와 구현, QA evidence는 같은 Sprint 안에서 함께 동기화한다.

# Concrete File Targets

- source-of-truth docs
  - `docs/05-sprints/sprint-19/planning.md`
  - `docs/05-sprints/sprint-19/qa.md`
  - `docs/05-sprints/sprint-19/review.md`
  - `docs/03-specs/01-app-shell-and-layout.md`
  - `docs/03-specs/04-place-detail.md`
  - `docs/03-specs/10-review.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/01-product/user-flows/review.md`
  - `docs/04-design/browse-and-detail.md`
  - `docs/04-design/place-submission.md`
  - `docs/00-governance/agent-workflow.md`
- app-shell / review flow
  - `src/app-shell/NurimapAppShell.tsx`
  - `src/app-shell/appShellStore.ts`
  - `src/app-shell/placeRepository.ts`
  - `src/app-shell/mockPlaces.ts`
- mobile surfaces / add flow
  - `src/app-shell/PlaceAddPanels.tsx`
  - `src/app-shell/MapPane.tsx`
  - 필요 시 `public/assets/icons/*`
- DaisyUI cleanup
  - `package.json`
  - `src/index.css`
  - `src/auth/AuthProvider.tsx`
- tests / verification
  - `src/App.test.tsx`
  - `src/app-shell/NurimapBrowse.test.tsx`
  - `src/app-shell/NurimapDetail.test.tsx`
  - `src/app-shell/PlaceLookupFlow.test.tsx`
  - `src/app-shell/PlaceRegistrationFlow.test.tsx`
  - `src/app-shell/placeRepository.test.ts`
  - `src/auth/AuthFlow.test.tsx`
  - `artifacts/qa/sprint-19/`

# Agent Instructions

- 구현 순서는 **source-of-truth docs 고정 -> detail CTA/add-rating state/route 정리 -> mobile surface refresh -> DaisyUI cleanup -> tests/verification** 순서를 우선한다.
- visual fidelity가 필요한 경우 Figma/handoff를 visual source of truth로 사용하고, 장기 문서에는 px/color/token detail을 복제하지 않는다.
- detail inline review composer는 approved add-rating child surface로 대체하되, single-review rule과 existing place registration overwrite 정책은 유지한다.
- `package.json`, `src/index.css`, source tree semantic class usage를 함께 정리해 DaisyUI가 다시 남지 않도록 한다.
- repo-wide cleanup 후에는 grep clean, lint, typecheck, build, targeted tests, browser QA evidence를 함께 남긴다.
- 비자명한 route/state/fallback 판단이 생기면 `docs/06-history/decisions.md`에 기록한다.

# Done Criteria

- Sprint 19 planning/source-of-truth 문서가 mobile add-rating + Tailwind-only 계약으로 일치한다.
- mobile map/list/detail/add/add-rating surface가 approved handoff 방향과 충돌하지 않는다.
- detail 하단 `평가 남기기` CTA는 `my_review === null`일 때만 보이고, add-rating save success 후 같은 detail로 복귀하며 새 review가 즉시 보인다.
- existing review 사용자는 새 review entry로 진입하지 않는다.
- DaisyUI dependency/plugin/semantic class usage가 repo 전체에서 제거된다.
- targeted tests, lint, typecheck/build, grep clean, QA evidence가 Sprint 문서에 반영된다.
- `docs/05-sprints/sprint-19/qa.md`와 `review.md`가 현재 상태와 남은 handoff를 설명할 수 있다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - mobile map/list/detail/add/add-rating surface rendering
  - detail CTA visible/hidden rule
  - add-rating entry/back/success/failure
  - single-review-per-user policy 유지
  - repo-wide DaisyUI cleanup grep clean
  - auth/map/app-shell Tailwind-only regression
- 실행 주체:
  - AI Agent
- 종료 기준:
  - `pnpm exec vitest run src/App.test.tsx src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/app-shell/placeRepository.test.ts src/auth/AuthFlow.test.tsx`
  - `pnpm lint`
  - `pnpm exec tsc --noEmit`
  - `pnpm build`
  - `rg -n 'daisyui|@plugin "daisyui"|btn-(circle|ghost|outline|primary|secondary|warning|sm)|\bbtn\b|form-control|loading(-spinner|-xs|-sm|-md|-lg)|bg-base-[0-9]+|text-error|text-primary|textarea-bordered' src docs package.json`

## AI Agent Interactive QA
- 대상 시나리오:
  - source-of-truth 문서와 구현 diff가 add-rating child surface / Tailwind-only end state 기준으로 일치하는지 점검
  - detail CTA visibility/hidden, save success return, browse/detail route contract를 코드 레벨로 설명 가능하게 확인
  - DaisyUI cleanup이 dependency/plugin/class usage까지 닫혔는지 정적 검토
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 구현 결과와 source-of-truth의 충돌이 없고, 남은 리스크가 `qa.md`에 명시된다.

## Browser Automation QA
- 대상 시나리오:
  - mobile `390x800` 기준 map → list → detail → add-rating → success/back 흐름
  - mobile detail CTA visible/hidden case
  - desktop `1280x900` 기준 sidebar browse/detail/add regression
  - DaisyUI 제거 후 auth/map 주요 상태 회귀 없음 확인
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright를 우선 사용해 주요 flow를 캡처하고 판정을 남긴다. 실패 시 `agent-browser`를 fallback으로 사용한다.
- 예상 증빙 경로:
  - `artifacts/qa/sprint-19/`

## User QA Required
- 사용자 확인 항목:
  - mobile Figma fidelity(typography/spacing/icon hierarchy) 최종 확인
  - add-rating empty/filled/success 상태의 체감 검토
  - detail 복귀 후 새 review가 기대 위치와 우선순위로 즉시 보이는지 확인
- 기대 결과:
  - mobile surface가 승인된 handoff 방향과 일치하고, review flow가 끊김 없이 detail로 수렴한다.
- handoff 조건:
  - automated checks와 AI Agent QA가 완료됐고, browser evidence 또는 blocker가 `qa.md`에 기록돼 있다.

# Active Changes

## CHG-01 Sprint 19 source-of-truth sync
- Why:
  - current live docs에 Sprint 19 planning/qa/review가 없고, app-shell/detail/review contract가 add-rating + Tailwind-only 방향과 어긋나 있다.
- Outcome:
  - Sprint 19 execution brief와 관련 live docs를 current contract 기준으로 정렬한다.
- Touched Docs:
  - `docs/05-sprints/sprint-19/planning.md`
  - `docs/05-sprints/sprint-19/qa.md`
  - `docs/05-sprints/sprint-19/review.md`
  - `docs/03-specs/01-app-shell-and-layout.md`
  - `docs/03-specs/04-place-detail.md`
  - `docs/03-specs/10-review.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/01-product/user-flows/review.md`
  - `docs/04-design/browse-and-detail.md`
  - `docs/04-design/place-submission.md`
  - `docs/00-governance/agent-workflow.md`
- Verify:
  - 문서 간 cross-reference와 acceptance criteria가 add-rating/Tailwind-only 기준으로 충돌하지 않는지 검토
- Status: in_progress

## CHG-02 Detail CTA + add-rating child surface
- Why:
  - current detail contract는 inline composer 제거, CTA visibility rule, save-success-return behavior를 아직 canonical하게 고정하지 않았다.
- Outcome:
  - detail 하단 CTA와 add-rating child surface를 canonical review entry contract로 고정한다.
- Touched Docs:
  - `docs/05-sprints/sprint-19/planning.md`
  - `docs/03-specs/04-place-detail.md`
  - `docs/03-specs/10-review.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/01-product/user-flows/review.md`
  - `docs/04-design/browse-and-detail.md`
- Verify:
  - `src/app-shell/NurimapDetail.test.tsx`
  - `src/app-shell/placeRepository.test.ts`
  - browser QA detail/add-rating evidence
- Status: draft

## CHG-03 Tailwind-only repo cleanup
- Why:
  - repo에 DaisyUI dependency/plugin/class usage가 남아 있어 Sprint 19 end state와 충돌한다.
- Outcome:
  - source-of-truth와 implementation을 Tailwind-only baseline으로 전환하고 grep clean 기준을 닫는다.
- Touched Docs:
  - `docs/05-sprints/sprint-19/planning.md`
  - `docs/03-specs/01-app-shell-and-layout.md`
  - `docs/00-governance/agent-workflow.md`
- Verify:
  - DaisyUI grep clean
  - `pnpm lint`
  - `pnpm exec tsc --noEmit`
  - `pnpm build`
- Status: draft
