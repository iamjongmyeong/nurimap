# Sprint 19 Mobile UI Tailwind + Review Flow Consensus Plan

## Readiness Assessment

### Planning Readiness — Ready
- deep-interview spec, transcript, context snapshot이 이미 있고 ambiguity가 threshold 이하로 내려갔다.
- 모바일 전 화면 범위, repo-wide DaisyUI 제거, review CTA/add-rating flow, success navigation까지 사용자 결정이 고정됐다.

### Development Readiness — Ready With Surface Sequencing
- app-shell/map/auth/review 저장 로직의 주요 touchpoint가 명확하다.
- Figma node coverage는 list/map/detail/add-rating에 대해 충분한 anchor를 제공한다.
- 다만 `9:319`는 map frame만 제공하므로 mobile map wrapper/navigation affordance는 current contract + approved interpretation으로 bounded handling이 필요하다.

### QA Readiness — Needs Planned Coverage
- review CTA/add-rating와 DaisyUI 제거는 regression 범위가 넓어서 targeted tests + browser QA + grep clean 기준을 함께 써야 한다.

## RALPLAN-DR Summary

### Principles
1. **Figma-first on mobile surfaces** — 제공된 mobile handoff는 시각 source of truth다.
2. **Behavior-preserving refactor** — back/history/selection/review policy/runtime contract는 유지한다.
3. **Tailwind-only end state** — DaisyUI dependency/plugin/class usage는 repo 전체에서 제거한다.
4. **Surface-local change, repo-wide verification** — 구현은 surface 단위로 나누되 검증은 repo-wide로 한다.
5. **Docs/tests/QA lockstep** — source of truth, tests, QA evidence를 함께 갱신한다.

### Decision Drivers
1. 모바일 Figma fidelity
2. repo-wide DaisyUI 제거의 regression risk control
3. 기존 review/domain/runtime contract reuse

### Viable Options

#### Option A — Surface-first integrated refactor (Recommended)
- Pros:
  - Figma refresh와 Daisy 제거를 같은 surface diff 안에서 정리할 수 있다.
  - review CTA/add-rating 같은 새 UI 흐름을 current detail shell에 자연스럽게 연결할 수 있다.
  - regression 원인을 surface 단위로 좁혀 확인하기 쉽다.
- Cons:
  - 중간 단계에 일부 surface만 Daisy 제거된 상태가 생길 수 있다.
  - shared utility/tokens를 잘못 잡으면 class churn이 늘 수 있다.

#### Option B — Daisy-first global cleanup, then mobile redesign
- Pros:
  - 최종 styling system을 먼저 고정할 수 있다.
  - 이후 UI 구현에서 Daisy 잔존 여부를 덜 의식해도 된다.
- Cons:
  - 시각 회귀와 기능 회귀가 동시에 커질 수 있다.
  - 모바일 Figma 비교가 중간 단계에서 의미를 잃는다.

#### Option C — Shared primitive layer first, then feature migration
- Pros:
  - 공용 button/input/loading 규칙을 먼저 정리해 auth/map/app-shell 전반 일관성을 만들기 쉽다.
- Cons:
  - Sprint 19 feature delivery보다 선행 구조 비용이 과하다.
  - 현재 요구사항(모바일 전 화면 + CTA/add-rating)보다 범위가 넓어지기 쉽다.

### Recommendation
- **Option A**를 채택한다.

### Alternative Invalidation Rationale
- Option B는 styling cleanup은 명확하지만 중간 단계 UI 붕괴 위험이 커서 Figma-first Sprint에 불리하다.
- Option C는 장기적으로 매력적이지만 Sprint 19의 bounded delivery보다 foundation work 비중이 너무 크다.
- 따라서 Sprint 19는 surface-first integrated refactor가 delivery/risk 균형이 가장 좋다.

## Work Plan

### Step 1. Sprint 19 source-of-truth 문서와 실행 artifact를 materialize한다
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/docs/05-sprints/sprint-19/planning.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/05-sprints/sprint-19/qa.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/05-sprints/sprint-19/review.md`
- `/Users/jongmyeong/dev/projects/nurimap/.omx/plans/prd-sprint-19-mobile-ui-tailwind-review-flow.md`
- `/Users/jongmyeong/dev/projects/nurimap/.omx/plans/test-spec-sprint-19-mobile-ui-tailwind-review-flow.md`

**Acceptance Criteria**
- Sprint 19 문서에 모바일 전 화면 Figma refresh, repo-wide DaisyUI 제거, review CTA/add-rating scope가 명시된다.
- QA Plan이 automated / AI QA / browser QA / user QA로 분리된다.
- ralph planning gate를 통과할 PRD/test-spec artifact가 존재한다.

### Step 2. detail review flow를 CTA + add-rating screen으로 전환한다
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapAppShell.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/placeRepository.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/mockPlaces.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/appShellStore.ts`

**Acceptance Criteria**
- current inline `DetailReviewComposer`는 새 flow에 맞게 제거/대체된다.
- add-rating은 **detail-owned transient child surface**로 정의하고, durable route는 계속 `/places/:placeId`를 유지한다.
- `appShellStore`에 add-rating 상태 소유권과 back/success 복귀 규칙이 명시된다.
- `my_review === null`일 때만 detail 하단에 `평가 남기기` CTA가 보인다.
- CTA는 Figma 기준 add-rating 화면으로 진입한다.
- add-rating 저장 성공 후 detail로 복귀하고 새 리뷰/집계가 즉시 반영된다.
- `my_review !== null`이면 새 review 작성 UI로 진입하지 않는다.

### Step 3. 모바일 map/list/detail/add/add-rating surface를 Figma 기준으로 정리한다
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapAppShell.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/PlaceAddPanels.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/MapPane.tsx`
- 필요 시 `/Users/jongmyeong/dev/projects/nurimap/public/assets/icons/*`

**Acceptance Criteria**
- list는 node `9:299`, detail CTA는 `14:182`, add-rating은 `14:388`/`14:339` hierarchy를 반영한다.
- map surface는 `9:319`의 frame intent를 따르되 current runtime contract와 충돌하지 않는다.
- Figma에 직접 없는 mobile detail/add visual detail은 desktop UI 언어를 reuse한다.
- 기존 mobile back/history/selection/add contract가 유지된다.

### Step 4. DaisyUI를 repo 전체에서 제거하고 Tailwind-only로 수렴시킨다
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/src/index.css`
- `/Users/jongmyeong/dev/projects/nurimap/package.json`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapAppShell.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/PlaceAddPanels.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/MapPane.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/auth/AuthProvider.tsx`

**Acceptance Criteria**
- `daisyui` dependency 제거, `@plugin "daisyui"` 제거, semantic class usage 제거가 모두 완료된다.
- auth/map/app-shell이 Tailwind-only 상태에서도 정상 렌더/동작한다.
- grep clean 기준이 정의되고 실제 검증 가능하다.

### Step 5. spec/test/QA evidence를 최종 동기화한다
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/docs/03-specs/01-app-shell-and-layout.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/03-specs/04-place-detail.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/03-specs/10-review.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/04-design/browse-and-detail.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/04-design/place-submission.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/00-governance/agent-workflow.md`
- `/Users/jongmyeong/dev/projects/nurimap/src/App.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapBrowse.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapDetail.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/PlaceLookupFlow.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/PlaceRegistrationFlow.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/placeRepository.test.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/auth/AuthFlow.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/docs/01-product/user-flows/review.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/01-product/user-flows/browse-and-detail.md`

**Acceptance Criteria**
- app-shell spec과 governance stack 문구까지 포함해 source-of-truth가 CTA/add-rating 및 Tailwind-only 계약과 충돌하지 않게 갱신된다.
- tests가 CTA visibility/hidden, add-rating success 복귀, 기존 `detail-review-compose` 부정 assertion의 전환, single-review rule, Daisy removal regressions를 포괄한다.
- QA evidence와 review.md가 실제 구현 기준으로 채워진다.

## Acceptance Criteria (Plan-Level)
- 실행자가 scope reduction 없이 Sprint 19 구현 순서와 verification 순서를 이해할 수 있다.
- mobile all-screen Figma refresh, repo-wide DaisyUI removal, detail CTA/add-rating flow가 하나의 bounded plan으로 연결된다.
- file references, tests, QA commands가 concrete하여 architect/critic가 리뷰할 수 있다.

## Verification Plan
- `pnpm exec vitest run src/App.test.tsx src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/app-shell/placeRepository.test.ts src/auth/AuthFlow.test.tsx`
- `pnpm lint`
- `pnpm build`
- 필요 시 `pnpm exec tsc --noEmit`
- `rg -n 'daisyui|@plugin "daisyui"|btn-(circle|ghost|outline|primary|secondary|warning|sm)|\bbtn\b|form-control|loading(-spinner|-xs|-sm|-md|-lg)|bg-base-[0-9]+|text-error|text-primary|textarea-bordered' src docs package.json`
- Browser QA evidence under `artifacts/qa/sprint-19/`

## Risks and Mitigations
- **Risk:** review composer 제거 중 save hookup이 깨질 수 있다.
  - **Mitigation:** `placeRepository.ts` 기반 save contract를 먼저 고정하고 test matrix에 success/error/existing_review를 포함한다.
- **Risk:** Daisy 제거와 Figma refresh가 겹쳐 regressions 원인 분리가 어려워진다.
  - **Mitigation:** surface-first sequencing과 static grep clean을 함께 사용한다.
- **Risk:** map frame `9:319`는 wrapper 전체 정보를 주지 않는다.
  - **Mitigation:** current mobile runtime contract를 유지하면서 frame height/navigation affordance만 bounded interpretation으로 반영한다.
- **Risk:** auth/map regression이 app-shell 변경 후반에 드러날 수 있다.
  - **Mitigation:** Step 4 이후 targeted auth/map regression cluster를 따로 검증한다.

## ADR
- **Decision:** Sprint 19는 surface-first integrated refactor(Option A)로 진행한다.
- **Drivers:** 모바일 Figma fidelity, repo-wide DaisyUI 제거 risk control, existing review/runtime contract reuse.
- **Alternatives considered:** Option B (Daisy-first global cleanup), Option C (shared primitive first).
- **Why chosen:** feature delivery와 regression control의 균형이 가장 좋고 review CTA/add-rating flow를 가장 자연스럽게 current shell에 연결할 수 있기 때문이다.
- **Consequences:** 구현은 surface 단위로 나뉘지만 검증은 repo-wide로 해야 한다.
- **Follow-ups:** desktop-specific review CTA/edit path가 필요해지면 후속 Sprint로 분리한다.
