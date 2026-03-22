# PRD: Sprint 16 Place Detail UX/UI Refresh

## Context
- 현재 상세 화면은 카드/칩 중심의 시각 구조를 사용하지만, 사용자 제공 모바일 레퍼런스는 더 단순한 정보 위계와 고정 header를 사용한다.
- 제공된 reference는 뒤로 가기 button이 있는 상단 고정 header(`56px` 높이), 장소 정보 블록(상단 `16px`, 좌우 `24px`, 하단 `16px` spacing), 평가 및 리뷰 블록(상하좌우 `24px` spacing)으로 구성된다.
- `docs/03-specs/04-place-detail.md`가 요구하는 행동 규칙(모바일 full-screen, desktop sidebar 내부 전환, back 복귀, loading/error 유지)은 그대로 지켜야 한다.
- 구현은 나중에 하고, 지금 단계의 목표는 Sprint 16 실행 문서를 고정하는 것이다.

## Desired Outcome
- Sprint 16에서 place detail UI를 사용자 제공 screenshot/Figma code 기준으로 재정렬하는 실행 계획을 확정한다.
- 구현 단계에서 문서/테스트/QA까지 한 번에 따라갈 수 있도록 source of truth, scope, acceptance criteria, verification plan을 명확히 만든다.

## RALPLAN-DR Summary

### Mode
- SHORT

### Principles
1. Screenshot/Figma-first: 제공된 reference를 시각 source of truth로 사용한다.
2. Behavior-preserving refresh: navigation, back, loading/error, hidden legacy modules 동작은 유지한다.
3. Shared structure, wrapper-specific layout: 모바일/데스크톱은 동일 정보 구조를 공유하되 shell 차이는 각 wrapper가 담당한다.
4. Docs-before-guessing: 구현 전에 spec/design/sprint 문서를 먼저 고정한다.

### Decision Drivers
1. 사용자 제공 reference와의 UI fidelity
2. 기존 상세 행동 회귀 최소화
3. 현재 data model(`added_by_name`, `reviews`, `zeropay_status`) 재사용 가능성

### Viable Options

#### Option A — Mobile-only refresh, desktop는 현 상태 유지
- Pros:
  - reference가 모바일 기준이라 해석 리스크가 가장 낮다.
  - 구현 범위와 테스트 범위가 가장 작다.
- Cons:
  - desktop/mobile 사이 정보 위계 불일치가 커진다.
  - 같은 detail feature 안에서 문서와 UI 언어가 갈라진다.

#### Option B — Shared detail content를 reference 기준으로 재정렬하고, mobile/desktop wrapper는 현 surface를 유지
- Pros:
  - 정보 구조를 한 번에 통일할 수 있다.
  - 현재 `DetailBody`/`DetailCard` 구조를 활용할 수 있어 회귀 범위를 통제하기 쉽다.
  - mobile reference의 시각 언어를 desktop sidebar에도 과도한 재설계 없이 이식할 수 있다.
- Cons:
  - desktop에 대한 별도 reference가 없어서 spacing/tokens 일부는 보수적으로 해석해야 한다.
  - wrapper와 content 분리가 불분명하면 CSS churn이 생길 수 있다.

#### Option C — Mobile/desktop detail을 완전히 분리 구현
- Pros:
  - 각 surface를 독립적으로 최적화할 수 있다.
  - future desktop reference가 와도 충돌이 적다.
- Cons:
  - 코드/테스트 중복이 늘어난다.
  - 현재 Sprint 목적 대비 과한 구조 변경이 된다.

### Preferred Option
- Option B

### Alternative Invalidation Rationale
- Option A는 reference fidelity는 높지만 detail feature 전체의 정보 위계를 통일하지 못한다.
- Option C는 장기적으로 유연하지만 현재 reference와 범위에 비해 구조 비용이 과하다.
- 따라서 Sprint 16은 shared content hierarchy를 기준으로 정리하고, mobile/desktop shell 차이는 wrapper 레벨에서 유지하는 Option B가 가장 균형적이다.

## Guardrails
- 구현 시작 전 `docs/05-sprints/sprint-16/planning.md`를 기준 문서로 고정한다.
- UI fidelity가 중요한 영역은 screenshot/Figma code를 우선하고, 없는 부분만 최소 추정한다.
- 현재 navigation state (`place_detail_open`)와 mobile history back bridge는 바꾸지 않는다.
- `네이버 이동 / 추천 / 내 리뷰 / 리뷰 작성 UI`는 이번 Sprint에 재도입하지 않는다.
- loading/error/empty는 기능 요구를 유지하되, 새 reference가 없는 상태 표현은 기본형을 유지한다.
- desktop detail은 별도 floating overlay로 되돌리지 않는다.

## Work Objectives
1. Sprint 16의 source of truth와 verification plan을 고정한다.
2. detail header / place info / review block의 reference-aligned 구조를 문서화한다.
3. 구현 단계에서 수정할 코드 표면과 테스트 표면을 명확히 한다.
4. 구현 전에 남겨야 할 open question을 분리한다.

## Execution Plan

### Step 1. Sprint 16 실행 문서 생성 및 범위 고정
- 대상 파일:
  - `docs/05-sprints/sprint-16/planning.md`
  - `docs/05-sprints/sprint-16/qa.md`
  - `docs/05-sprints/sprint-16/review.md`
- Acceptance criteria:
  - Sprint Goal / scope / constraints / QA plan이 한국어로 정리된다.
  - screenshot/Figma-first 원칙과 planning-only 상태가 반영된다.
  - User QA Required가 구현 전/후 확인 포인트를 담는다.

### Step 2. Source-of-truth 문서 정렬 계획 수립
- 대상 파일:
  - `docs/03-specs/04-place-detail.md`
  - `docs/04-design/browse-and-detail.md`
  - 필요 시 `docs/01-product/user-flows/browse-and-detail.md`
- Acceptance criteria:
  - 고정 header, info block, review variants, spacing intent를 어떤 문서에 반영할지 명확해진다.
  - behavior 변화가 없는 항목과 문서 업데이트가 필요한 항목이 분리된다.
  - `01-app-shell-and-layout.md`의 legacy floating wording과 충돌하지 않도록 Sprint 16 planning이 우선 기준을 명시한다.

### Step 3. Detail UI 리프레시 구현 범위 정의
- 대상 파일:
  - `src/app-shell/NurimapAppShell.tsx`
  - 필요 시 `public/assets/icons/*`
- Acceptance criteria:
  - fixed top back header(`56px` height, 좌측 back affordance), place info block(`16/24/16` outer spacing), review section(`24px` section padding) variants가 구현 범위로 정의된다.
  - current data model의 `added_by_name`, `road_address`, `place_type`, `zeropay_status`, `average_rating`, `review_count`, `reviews`를 어떻게 매핑할지 정리된다.
  - mobile/desktop 공통 content hierarchy와 wrapper별 차이가 구분된다.

### Step 4. 회귀 방지 테스트 범위 정의
- 대상 파일:
  - `src/app-shell/NurimapDetail.test.tsx`
  - 필요 시 `src/App.test.tsx`
- Acceptance criteria:
  - header/info/review variant에 대한 새 assertion 대상이 정의된다.
  - back behavior, loading/error, hidden legacy modules 회귀 테스트가 유지된다.
  - no-review / rating-only variant 검증 여부가 명시된다.

### Step 5. QA 및 handoff 기준 고정
- 대상 파일:
  - `docs/05-sprints/sprint-16/qa.md`
  - `artifacts/qa/sprint-16/` (예정)
- Acceptance criteria:
  - automated / AI visual / browser automation / user QA 기준이 분리된다.
  - screenshot reference와 실제 구현 결과 비교 기준이 정리된다.
  - 구현 보류 상태와 follow-up 질문이 문서에 남는다.

## Success Criteria
- 실행자가 추정 없이 Sprint 16 구현 범위와 문서 갱신 순서를 이해할 수 있다.
- detail UI reference의 핵심 구조(고정 header, info block, review block variants)가 acceptance criteria로 전환된다.
- 구현 전에 바뀌지 않아야 할 behavior가 명시된다.
- 후속 구현이 시작되면 `.omx/plans/test-spec-sprint-16-place-detail-uxui-refresh.md`만 보고도 검증 범위를 따라갈 수 있다.

## ADR
- Decision:
  - Sprint 16은 mobile reference를 기준으로 shared detail content hierarchy를 재정렬하고, mobile/desktop wrapper behavior는 유지하는 방식으로 계획한다.
- Drivers:
  - Reference fidelity, regression minimization, current data model reuse.
- Alternatives considered:
  - A) mobile-only refresh
  - B) shared content refresh + wrapper 유지
  - C) mobile/desktop 완전 분리
- Why chosen:
  - B가 visual consistency와 implementation risk 사이 균형이 가장 좋다.
- Consequences:
  - desktop는 별도 reference 없이 mobile 시각 언어를 보수적으로 재사용한다.
  - 공통 detail content 구조를 정리해야 하므로 테스트 갱신이 필요하다.
- Follow-ups:
  - desktop-specific reference가 추가되면 Sprint 16 Active Change 또는 후속 Sprint로 분리 검토한다.
  - no-review variant의 최종 카피/형태는 implementation 직전 open question 확인 후 확정한다.
