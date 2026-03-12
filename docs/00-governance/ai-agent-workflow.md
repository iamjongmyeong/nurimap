# AI Agent Workflow

## Purpose
이 문서는 Nurimap 프로젝트에서 AI Agent가 문서 구조를 해석하고 Sprint 단위로 실행할 때 따라야 할 운영 절차를 정의한다.
문서 구조 자체는 `docs/00-governance/docs-structure.md`가 기준이며, 이 문서는 그 구조를 실제로 어떻게 사용하는지를 다룬다.

## Mandatory Context
작업 시작 전 반드시 아래 문서를 읽는다.

1. `AGENTS.md`
2. `docs/00-governance/docs-structure.md`
3. `docs/01-product/product-overview.md`
4. `docs/01-product/product-principles.md`
5. 현재 작업과 관련된 `docs/01-product/user-flows/*.md`
6. 현재 작업과 관련된 `docs/04-design/*.md`
7. 현재 작업과 관련된 `docs/02-architecture/*.md`
8. 현재 Sprint의 `docs/05-sprints/sprint-XX/planning.md`
9. 현재 Sprint에서 선택된 `docs/03-specs/*.md`
10. `docs/00-governance/definition-of-ready.md`
11. `docs/00-governance/definition-of-done.md`
12. 필요 시 `docs/06-history/decisions.md`, `docs/06-history/change-log.md`

## Source Of Truth Hierarchy
문서 충돌이 없다는 가정에서 아래 순서로 해석한다.

1. 현재 Sprint의 `planning.md`
2. 현재 Sprint에서 명시적으로 선택된 `docs/03-specs/*.md`
3. 관련 `docs/01-product/user-flows/*.md`
4. 관련 `docs/04-design/*.md`
5. 관련 `docs/02-architecture/*.md`
6. `docs/01-product/product-principles.md`
7. `docs/01-product/product-overview.md`
8. `docs/00-governance/definition-of-ready.md`
9. `docs/00-governance/definition-of-done.md`
10. `docs/06-history/decisions.md`
11. `docs/06-history/change-log.md`

### Conflict Rule
- 현재 Sprint의 `planning.md`는 이번 실행 범위와 작업 지시를 고정한다.
- `docs/03-specs/*.md`는 기능 요구사항과 검증 기준을 고정한다.
- `docs/01-product/user-flows/*.md`는 사용자 흐름과 실패 흐름을 고정한다.
- `docs/04-design/*.md`는 공통 레이아웃, 상태 모델, 화면 구조와 상호작용 규칙을 고정한다.
- `docs/02-architecture/*.md`는 공통 도메인, integration, security 규칙을 고정한다.
- `docs/06-history/*`는 이력 문서이며 현재 범위를 확장하는 근거가 아니다.
- `docs/99-archive/`는 역사 기록이다. 현재 구현의 source of truth로 사용하지 않는다.
- spec, design, architecture가 정면충돌하면 추정으로 메우지 말고 문서 충돌로 보고한다.

## Sprint Execution Loop

### 1. Current Sprint 확인
- 한 번에 하나의 Sprint만 진행한다.
- 현재 실행 단위는 `docs/05-sprints/sprint-XX/` 아래 문서로 판단한다.
- 새 Sprint를 열 때는 `docs/05-sprints/template/`를 기준으로 문서를 만든다.
- Sprint가 비어 있거나 아직 범위가 고정되지 않았다면 구현하지 않고 범위 확정부터 요구한다.

### 2. Sprint Ready Gate 확인
- 구현 전에 `definition-of-ready` 기준을 점검한다.
- 아래가 비어 있으면 현재 Sprint는 ready가 아니다.
  - `planning.md`
- 범위가 불완전하면 추정 구현 대신 필요한 문서 보강을 우선한다.

### 3. Relevant Docs 읽기
작업 유형에 따라 관련 문서를 좁혀 읽는다.
- UI/레이아웃: `docs/04-design/foundations.md`, `docs/04-design/browse-and-detail.md`, `docs/02-architecture/system-context.md`
- 데이터/등록: `docs/04-design/place-submission.md`, `docs/02-architecture/domain-model.md`, `docs/02-architecture/integrations.md`
- 인증/보안: `docs/04-design/auth-and-name-entry.md`, `docs/02-architecture/security-and-ops.md`, `docs/02-architecture/system-context.md`
- 리뷰/추천: `docs/04-design/review.md`, `docs/04-design/recommendation.md`, `docs/02-architecture/domain-model.md`

### 4. Spec 중심 구현
선택된 spec에서 아래 순서로 내용을 소비한다.
1. `Summary`
2. `Scope` / `Out Of Scope`
3. `Functional Requirements`
4. `Acceptance Criteria`
5. `Required Test Cases`
6. `Manual QA Checklist`
7. `QA Evidence`

### 5. Verification And Sprint Docs Sync
- spec의 acceptance criteria를 만족해야 한다.
- `docs/00-governance/definition-of-done.md`를 통과해야 한다.
- Sprint의 `planning.md`, `qa.md`, `review.md`는 한국어로 작성한다.
- 단, 명령어, 파일 경로, 코드 식별자, 환경변수, 외부 서비스의 고유 메시지와 에러명은 원문을 유지할 수 있다.
- 검증 결과는 현재 Sprint의 `qa.md`에 기록한다.
- 완료, 미완료, carry-over, 회고는 현재 Sprint의 `review.md`에 기록한다.

### 6. Change Handling
- 실행 중 새 요청이나 범위 변경이 생기면 바로 구현하지 않는다.
- 현재 Sprint 범위 안의 작은 변경(문구, 스타일, 간격, 버튼 텍스트, 경고 메시지, 이미 합의된 UX의 미세 조정)은 `planning.md`와 관련 source of truth 문서(선택된 `docs/03-specs/*.md`, 관련 `docs/04-design/*.md`)에 직접 반영한다.
- 현재 Sprint 범위 안의 작은 변경은 `docs/06-history/decisions.md`나 `docs/06-history/change-log.md`에 기록하지 않는다.
- 구조, 정책, API/상태 모델, fallback처럼 이유를 남겨야 하는 선택은 `docs/06-history/decisions.md`에 기록한다.
- 요청 추적이 중요하거나 반영 보류/후속 후보를 남겨야 하는 변경은 `docs/06-history/change-log.md`에 기록한다.
- feature identity가 유지되면 기존 spec을 수정하고, 바뀌면 새 spec을 만든다.

원칙: 작은 변경은 source of truth에 흡수하고, 큰 선택만 decision으로 남긴다.

### 7. Autonomous Decision Log
- AI Agent는 문서 경계 안에서 스스로 판단해 진행하되, 비자명한 판단은 `docs/06-history/decisions.md`에 기록한다.
- 아래 상황이면 기록한다.
  - 구현 방식에 여러 유효한 선택지가 있었을 때
  - 문서만으로 세부 구현이 완전히 고정되지 않았을 때
  - 임시 우회책, fallback, staged rollout, mock 전략을 선택했을 때
  - 이후 Sprint나 spec에도 영향을 주는 구조/상태/API/테스트 결정을 했을 때
- 단순 이동, 이름 변경, 기계적 링크 수정은 기록하지 않아도 된다.

## Documentation Rules
- 문서는 `docs/00-governance/docs-structure.md`의 경로 규칙을 따른다.
- 새 문서는 구조 규칙에 맞는 위치에만 생성한다.
- 사용자의 명시적 요청이 없으면 `README`를 새로 만들지 않는다.
- archive 문서는 수정하지 않고, 새 라이브 문서로 대체한다.

## Git And Completion
- 구현과 문서 sync, 검증이 모두 끝난 뒤에만 commit한다.
- commit 전에 관련 테스트와 문서 링크 검증 결과를 확인한다.
- commit 이후 필요한 경우 `docs/06-history/decisions.md`의 관련 entry에 실제 commit hash를 반영한다.

## Suggested Agent Roles
- 구현: `/prompts:executor`
- 설계/충돌 검토: `/prompts:architect`
- 테스트 전략: `/prompts:test-engineer`
- 완료 검증: `/prompts:verifier`

## Exit Criteria
현재 Sprint의 작업을 종료하려면 아래를 모두 만족해야 한다.
- 선택된 spec acceptance criteria 충족
- 필요한 자동화 테스트와 수동 QA 수행
- `docs/00-governance/definition-of-done.md` 통과
- `docs/05-sprints/sprint-XX/planning.md`가 실제 구현 기준과 일치함
- `docs/05-sprints/sprint-XX/qa.md` 반영
- `docs/05-sprints/sprint-XX/review.md` 반영
- 필요했던 의사결정이 `docs/06-history/decisions.md`에 기록됨
- 범위 변경이 있었다면 `docs/06-history/change-log.md`에 기록됨
