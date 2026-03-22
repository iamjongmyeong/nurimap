# Sprint 15 Browse/Detail UI Refresh Consensus Plan

## Readiness Assessment

### Planning Readiness — **Almost Ready**
- 사용자 결정 사항(시안 우선, 데스크톱 상세 전환 방식, 제외 UI, asset/font, 제로페이 표현)이 고정됐다.
- Sprint 문서와 browse/detail source-of-truth 문서가 Sprint 15 방향으로 갱신됐다.
- 아직 최종 실행 전 관점에서는 PRD / test spec artifact와 registration success alert 전환 반영이 남아 있다.

### Development Readiness — **Ready With Cleanup**
- browse/detail UI refresh 구현이 이미 진행돼 있고, 자산/폰트도 repo로 편입됐다.
- 핵심 browse/detail 파일과 테스트가 새 방향으로 이동했다.
- 남은 개발 이슈는 registration notice 제거에 따른 PlaceAddPanels / appShellStore / registration regression sync와, latent legacy UI 경로 정리다.

### QA Readiness — **Not Yet Ready For Close**
- browse/detail 전용 테스트 통과 보고는 있었지만, Sprint 종료 관점 QA는 아직 부족하다.
- registration flow 회귀 테스트, lint/typecheck/build, 브라우저 QA, sprint qa/review 문서 반영이 필요하다.

## RALPLAN-DR Summary

### Principles
1. **시안 우선, 추정 금지** — Sprint 15에서는 Figma와 사용자 결정이 기존 browse/detail UI보다 우선한다.
2. **동작 안정성 유지** — 목록/상세 전환, 지도 맥락 유지, 로딩/에러 handling 같은 핵심 상호작용은 깨지지 않아야 한다.
3. **이번 스프린트 범위 엄수** — 네이버 CTA, 추천, 내 리뷰, 리뷰 작성은 1차 범위에서 제외한다.
4. **문서-구현-검증 동기화** — planning/spec/design, code, QA evidence가 같은 기준을 봐야 한다.
5. **부분 완료 금지** — browse/detail만 예쁘게 바꾸고 registration/QA가 깨진 상태로 마감하지 않는다.

### Decision Drivers
1. **이미 일부 구현이 진행된 현재 작업 트리를 가장 안전하게 마무리해야 함**
2. **사용자 결정 사항이 충분히 구체적이어서 추가 discovery보다 integration/verification이 우선임**
3. **Sprint 종료 품질은 UI 완성도보다 회귀 방지와 QA 증빙까지 포함해야 함**

### Viable Options

#### Option A — Current-path stabilization (Recommended)
**Approach:** 현재 진행된 browse/detail UI refresh를 기준으로 남은 registration/QA 정리를 이어서 완성한다.
**Pros:**
- 이미 반영된 UI 작업을 버리지 않는다.
- 가장 빠르게 Sprint 15의 실제 완료 상태에 도달한다.
- 문서/자산/테스트를 현 구현과 맞춰 닫기 쉽다.
**Cons:**
- partial implementation에서 생긴 잔여 상태(registrationMessage, old tests)를 정확히 찾아 정리해야 한다.
- browse/detail과 registration flow를 함께 회귀 검증해야 한다.

#### Option B — Freeze and re-plan before touching code
**Approach:** 현재 변경을 더 진행하지 않고 문서/스펙/테스트 계획만 완전히 고정한 뒤, 다음 실행에서 새로 구현한다.
**Pros:**
- 이론적으로 가장 정돈된 출발점이다.
- 합의 문서가 먼저 완성된다.
**Cons:**
- 이미 진행된 구현과 자산 편입을 활용하지 못한다.
- Sprint 속도가 크게 떨어지고, 현재 변경과 문서가 다시 벌어질 수 있다.

#### Option C — Broader shell refactor now
**Approach:** browse/detail 뿐 아니라 registration shell/state 구조까지 큰 폭으로 정리한다.
**Pros:**
- 장기적으로 더 정돈된 UI shell을 만들 수 있다.
**Cons:**
- 이번 Sprint 범위를 넘고 회귀 위험이 크다.
- QA 범위가 급격히 커진다.

### Recommendation
- **Option A**를 채택한다.
- 이유: 현재 사용자 결정이 충분히 확정되었고, 작업 트리에 이미 Sprint 15 구현이 존재하므로 now best move is stabilize + verify + sync.

## Work Plan

### Step 1. Finalize source-of-truth and execution artifacts
**Files / Docs**
-   docs/05-sprints/sprint-15/planning.md
- docs/01-product/user-flows/browse-and-detail.md
- docs/04-design/browse-and-detail.md
- docs/03-specs/04-place-detail.md
- .omx/plans/prd-sprint-15-browse-detail-ui-refresh.md
- .omx/plans/test-spec-sprint-15-browse-detail-ui-refresh.md

**Acceptance Criteria**
- Sprint 15 범위/제외 범위/QA 계획이 문서에 명시된다.
- desktop detail = sidebar 내부 전환, 1차 제외 UI, success alert 정책이 문서와 일치한다.
- execution handoff에 필요한 PRD/test spec artifact가 존재한다.

### Step 2. Stabilize browse/detail implementation and registration success path
**Files**
- src/app-shell/NurimapAppShell.tsx
- src/index.css
- src/app-shell/PlaceAddPanels.tsx
- src/app-shell/appShellStore.ts

**Acceptance Criteria**
- 모바일/데스크톱 목록·상세 UI가 확정된 시안과 사용자 결정을 반영한다.
- 데스크톱 상세는 floating overlay가 아니라 sidebar 내부 전환이다.
- registration notice state/UI가 제거된다.
- `registrationMessage` 상태와 그 의존 경로가 store/UI에서 제거되거나 더 이상 참조되지 않는다.
- phase-1에서 쓰지 않는 legacy detail UI 경로가 남아 있으면 의도적으로 보존할 이유를 문서화하거나 정리한다.
- 등록/병합/반영 성공 시 browser alert가 뜬다.
- font/logo/icon asset 경로가 repo-local path 기준으로 정리된다.

### Step 3. Re-align regression tests to the new phase-1 UI contract
**Files**
- src/app-shell/NurimapBrowse.test.tsx
- src/app-shell/NurimapDetail.test.tsx
- src/app-shell/PlaceRegistrationFlow.test.tsx

**Acceptance Criteria**
- browse/detail tests가 새 UI 구조를 검증한다.
- registration flow tests가 success alert / new detail layout / removed legacy modules 기준으로 갱신된다.
- out-of-scope UI(네이버 CTA, 추천, 내 리뷰/리뷰 작성)가 absence assertion으로 명시된다.

### Step 4. Run layered verification
**Automated**
- pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx
- pnpm lint
- pnpm exec tsc --noEmit
- 필요 시 pnpm build
- modified files diagnostics zero errors

**Interactive / Browser QA**
- 모바일: 목록 진입 → 상세 진입 → 뒤로 가기 → 지도 맥락 유지
- 데스크톱: browse sidebar → detail sidebar 전환 → 목록 복귀
- 등록: 성공 alert, geocode 실패 alert, duplicate confirm cancel 유지

**Acceptance Criteria**
- 관련 자동화 검증이 통과한다.
- 브라우저 QA 증빙 경로가 qa.md에 남는다.
- 실패 시 blocker와 scope-local fix plan이 명시된다.

### Step 5. Close the sprint execution brief
**Files**
- docs/05-sprints/sprint-15/qa.md
- docs/05-sprints/sprint-15/review.md

**Acceptance Criteria**
- QA result, verdict, follow-up이 기록된다.
- 남은 리스크/이월 항목이 있으면 review.md에 분리 기록된다.
- 다음 execution mode로 넘겨도 추가 scope discovery 없이 바로 작업 가능하다.

## Acceptance Criteria (Plan-Level)
- planning/dev/QA 준비 상태가 각각 평가되고 부족한 부분이 작업 단계로 연결된다.
- browse/detail UI refresh 범위와 deferred scope가 문서/코드/테스트 기준에서 일치한다.
- registration success UX(alert) 전환이 Sprint plan에 포함된다.
- verification steps가 실행 가능한 명령과 시나리오 수준으로 구체화된다.

## Verification Plan
- **Diagnostics**: modified files LSP diagnostics zero errors
- **Unit/Component Tests**: browse/detail/registration targeted vitest run
- **Typecheck**: pnpm exec tsc --noEmit
- **Lint**: pnpm lint
- **Browser QA**: local/mobile/desktop interaction capture with artifacts/qa/sprint-15/
- **Docs Sync**: planning/qa/review + source-of-truth docs diff review

## Risks and Mitigations
- **Risk:** browse/detail은 통과하지만 registration flow가 legacy expectation으로 깨질 수 있음
  - **Mitigation:** PlaceRegistrationFlow.test.tsx를 Sprint 15 contract 기준으로 별도 정렬하고 targeted run 포함
- **Risk:** 문서와 working tree가 다시 어긋날 수 있음
  - **Mitigation:** Step 1을 execution 선행 gate로 둠
- **Risk:** partial refactor로 unused state/legacy exports가 남을 수 있음
  - **Mitigation:** diagnostics + grep cleanup + Step 2 acceptance criteria에서 명시적으로 제거/문서화
- **Risk:** Browser QA 없이 시각 완성도를 과신할 수 있음
  - **Mitigation:** Playwright/agent-browser evidence를 qa.md에 기록

## ADR Draft
- **Decision:** Sprint 15는 current-path stabilization 전략(Option A)으로 진행한다.
- **Drivers:** 사용자 결정 사항 확정, 부분 구현 이미 존재, Sprint 종료에 필요한 QA/문서 sync 중요성
- **Alternatives considered:** Option B (freeze and re-plan), Option C (broader shell refactor)
- **Why chosen:** 현재 가장 작은 리스크로 실제 완료 상태에 도달하는 경로이기 때문
- **Consequences:** registration/QA cleanup이 필수 선행 작업이 되며, deferred UI는 다음 변경으로 넘긴다.
- **Follow-ups:** 추천/내 리뷰/리뷰 작성 UI는 후속 시안 수령 후 별도 plan으로 다룬다.
