# Sprint 16 Place Detail UX/UI Refresh - Consensus Draft

## Context
- 목표: Nurimap 장소 상세 화면 UX/UI를 사용자 제공 모바일 스크린샷과 Figma 추출 코드를 기준으로 재설계한다.
- 현재 구현 기준: `src/app-shell/NurimapAppShell.tsx`, `src/app-shell/NurimapDetail.test.tsx`, `src/app-shell/types.ts`
- 현재 source of truth 우선순위: Sprint 16 planning > `docs/03-specs/04-place-detail.md` > `docs/01-product/user-flows/browse-and-detail.md` > `docs/04-design/browse-and-detail.md` > `docs/04-design/foundations.md`
- 계획 범위: planning/docs/QA 전략까지. 구현은 아직 시작하지 않는다.

## RALPLAN-DR Summary
- Mode: SHORT

### Principles
1. 스크린샷/Figma 우선: 사용자 제공 레퍼런스를 시각적 source of truth로 사용한다.
2. 동작 보존 우선: mobile back/history, desktop sidebar 내부 상세, loading/error, legacy 모듈 비노출은 유지한다.
3. 최소 범위 시각 교체: 상태 모델·도메인 로직보다 detail surface 구조/스타일 정렬에 집중한다.
4. 문서-테스트-구현 동기화: planning/spec/design/test/qa 근거가 함께 움직여야 한다.

### Decision Drivers
1. 사용자 레퍼런스가 모바일 기준으로 충분히 구체적이다.
2. 현재 상세 UI는 gradient/card/chip 중심이라 새 레퍼런스와 시각적으로 충돌한다.
3. 기존 테스트가 핵심 동작을 이미 보호하고 있어, UX/UI 리프레시를 bounded하게 수행할 수 있다.

### Viable Options
#### Option A. 모바일 레퍼런스를 canonical UI로 채택하고, 데스크톱은 같은 정보 위계를 기존 sidebar surface에 이식한다.
- Pros:
  - 현재 확보된 reference만으로 바로 착수 가능하다.
  - 모바일/데스크톱 간 시각 언어가 일관된다.
  - 기존 navigation/state contract를 거의 흔들지 않는다.
- Cons:
  - 데스크톱 전용 spacing nuance는 추가 reference 없이 일부 추정이 남는다.

#### Option B. 모바일 상세만 이번 Sprint에서 리프레시하고, 데스크톱은 다음 Sprint로 분리한다.
- Pros:
  - 범위가 가장 안전하다.
  - 모바일 reference fidelity를 높게 유지할 수 있다.
- Cons:
  - 동일 기능의 디바이스 간 UX 일관성이 깨진다.
  - 데스크톱 detail 재작업 비용이 다음 Sprint로 이월된다.

#### Option C. 데스크톱/모바일 모두 별도 시안을 추가로 받은 뒤 완전 재설계한다.
- Pros:
  - 추정 여지가 가장 적다.
  - 데스크톱 전용 최적화까지 명확히 설계할 수 있다.
- Cons:
  - 현재 요청만으로는 plan-ready 상태가 늦어진다.
  - 이번 Sprint 목표가 ‘planning 완료 후 대기’인 상황에서 불필요하게 blocker를 키운다.

### Chosen Direction
- Option A를 선택한다.
- Option B는 구현 범위는 좁지만 device parity를 해친다.
- Option C는 가장 정확하지만, 현재 확보된 모바일 reference와 사용자 의도 대비 과도하게 보수적이다.

## Work Objectives
- 모바일 상세를 screenshot fidelity 기준의 flat 구조로 재설계한다: 고정 header + 정보 block + 리뷰 block.
- 데스크톱 상세는 기존 sidebar/back affordance를 유지하되, 내부 content hierarchy는 모바일과 같은 flat 정보 위계로 정렬한다.
- 기존 동작/상태/제외 모듈 정책은 유지한다.
- Sprint 16 planning/qa/review 문서를 만들고, 구현 전 필요한 open question을 명시한다.

## Guardrails
### Must Have
- 모바일 상세에 `56px` 고정 header, 좌측 back icon only 적용
- 정보 블록: header 아래 `16px`, 좌우 `24px`, 하단 `16px`
- 리뷰 섹션: 상하좌우 `24px`
- 정보 row: 장소명, 주소, 추가자, 장소 유형, 제로페이, 평점/리뷰 수
- 리뷰 item variant 2종: 본문 있음 / 본문 없음
- 회색 메타 icon + 빨간 별점만 accent
- 기존 상세 동작(모바일 뒤로 가기/history, 데스크톱 sidebar 내부 전환, loading/error, legacy UI 비노출) 보존
- `added_by_name` 기존 데이터 필드를 재사용하고 새 도메인 필드를 추가하지 않음

### Must NOT Have
- 새 CTA 추가
- chip/pill 메타 UI 유지
- gradient/card 중심 detail hero 유지
- 추천/내 리뷰/리뷰 작성/네이버 이동 UI 재도입
- 새로운 navigation state 도입
- 리뷰 도메인 로직 변경

## Task Flow
### Step 1. Sprint 16 계획 기준선 고정
- 대상 파일:
  - `docs/05-sprints/sprint-16/planning.md`
  - `docs/05-sprints/sprint-16/qa.md`
  - `docs/05-sprints/sprint-16/review.md`
  - `.omx/plans/open-questions.md`
- 내용:
  - Sprint Goal, In/Out of Scope, Selected Specs, Constraints, Done Criteria, QA Plan 작성
  - desktop 범위와 no-review empty-state를 open question으로 기록
- Acceptance Criteria:
  - Sprint 16 planning 문서가 DoR 구조를 만족한다.
  - qa/review 문서 skeleton이 생성된다.
  - open question 2개가 추적 가능하게 남는다.

### Step 2. Source-of-truth 문서 반영 범위 정의
- 대상 파일:
  - `docs/03-specs/04-place-detail.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/04-design/browse-and-detail.md`
  - 필요 시 `docs/04-design/review.md`
- 내용:
  - 모바일 screenshot 기준의 detail 구조(고정 header, 정보 row 순서, flat review list, optional review content)를 어떤 문서에 반영할지 고정
  - `01-app-shell-and-layout`의 legacy floating wording은 이번 Sprint selected spec에서 비중을 낮추거나 planning constraint로 우회
- Acceptance Criteria:
  - 어떤 문서가 필수 업데이트 대상인지 planning에 명시된다.
  - 동작 변경 없이 시각 구조 변경임이 구분된다.

### Step 3. Detail surface 리프레시 구현 준비
- 예상 코드 touchpoint:
  - `src/app-shell/NurimapAppShell.tsx`
  - 필요 시 공통 아이콘/세부 subcomponent 추출 위치
- 내용:
  - 기존 gradient/card/chip 패턴을 flat layout로 교체할 구현 단위를 정의
  - desktop/mobile 공통 detail body와 각 surface wrapper 책임을 분리해 계획한다
- Acceptance Criteria:
  - 구현자가 어느 컴포넌트/섹션을 어떻게 바꿀지 추정 없이 시작할 수 있다.
  - navigation/state/domain 로직 비수정 원칙이 계획에 적혀 있다.

### Step 4. 테스트 갱신 계획 수립
- 대상 파일:
  - `src/app-shell/NurimapDetail.test.tsx`
  - 필요 시 `src/App.test.tsx`
- 내용:
  - 새 구조를 검증하는 테스트 항목 정의
  - 예: fixed header 존재, info row text/순서, flat review variant, legacy chip/card absence, back/history 회귀
- Acceptance Criteria:
  - 테스트가 구조와 동작을 모두 커버하도록 계획된다.
  - 시각 리프레시 후에도 기존 핵심 회귀 포인트가 보존된다.

### Step 5. QA 및 handoff 계획 수립
- 대상 산출물:
  - `docs/05-sprints/sprint-16/qa.md`
  - `docs/05-sprints/sprint-16/review.md`
- 내용:
  - Automated / AI Agent Interactive / Browser Automation / User QA Required 기준을 정의
  - mobile 390px와 desktop sidebar에서 visual hierarchy 검증 계획 명시
- Acceptance Criteria:
  - 실행자가 구현 후 어떤 명령/시나리오/증빙으로 완료를 증명할지 planning에 적혀 있다.
  - 사용자 확인이 필요한 범위가 `qa.md` handoff 대상로 남는다.

## Success Criteria
- Sprint 16 planning 문서가 구현 전 source of truth로 사용 가능하다.
- 구현 범위가 ‘detail UI refresh’로 bounded되어 있고, 동작 보존 항목이 명확하다.
- desktop 범위와 empty-state만 open question으로 남고 나머지는 착수 가능 상태다.

## ADR
- Decision:
  - Sprint 16은 모바일 레퍼런스를 canonical detail UI로 채택하고, 데스크톱은 기존 sidebar/back affordance를 유지하면서 동일한 content hierarchy만 재사용하는 방향으로 계획한다.
- Drivers:
  - 사용자 제공 reference의 구체성
  - 기존 동작 회귀 리스크를 낮춰야 함
  - 현재 상세 UI와 목표 UI 간 시각적 차이가 큼
- Alternatives considered:
  - 모바일만 변경 후 데스크톱 이월
  - 별도 데스크톱 시안 확보 전까지 전체 보류
- Why chosen:
  - 현재 자료만으로도 bounded한 Sprint planning이 가능하고, cross-device consistency를 유지할 수 있기 때문이다.
- Consequences:
  - desktop spacing/chrome 일부는 추가 reference 없이는 보수적으로 해석하고, mobile chrome 규칙을 그대로 강제하지 않는다.
  - no-review empty-state는 이번 planning에서 fallback 유지 전제로 두되 open question으로 남긴다.
- Follow-ups:
  - 사용자로부터 desktop 시안이 오면 planning/update scope를 재조정한다.
  - empty-state 시안 또는 카피가 오면 review section acceptance criteria를 보강한다.

## Open Questions
1. 데스크톱 상세 화면은 모바일 레퍼런스의 정보 위계만 재사용할지, 별도 desktop visual fidelity까지 같은 Sprint에 포함할지?
2. 리뷰 0건 상태는 현재 fallback copy/layout을 유지할지, flat detail tone에 맞춘 별도 empty-state를 정의할지?
