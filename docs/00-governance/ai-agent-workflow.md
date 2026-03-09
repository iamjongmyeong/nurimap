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
6. 현재 작업과 관련된 `docs/02-architecture/*.md`
7. 현재 Sprint의 `docs/04-sprints/sprint-XX/planning.md`
8. 현재 Sprint에서 선택된 `docs/03-specs/*.md`
9. `docs/00-governance/definition-of-ready.md`
10. `docs/00-governance/definition-of-done.md`
11. 필요 시 `docs/05-history/decisions.md`, `docs/05-history/change-log.md`

## Source Of Truth Hierarchy
문서 충돌이 없다는 가정에서 아래 순서로 해석한다.

1. 현재 Sprint의 `planning.md`
2. 현재 Sprint에서 명시적으로 선택된 `docs/03-specs/*.md`
3. 관련 `docs/01-product/user-flows/*.md`
4. 관련 `docs/02-architecture/*.md`
5. `docs/01-product/product-principles.md`
6. `docs/01-product/product-overview.md`
7. `docs/00-governance/definition-of-ready.md`
8. `docs/00-governance/definition-of-done.md`
9. `docs/05-history/decisions.md`
10. `docs/05-history/change-log.md`

### Conflict Rule
- 현재 Sprint의 `planning.md`는 이번 실행 범위와 작업 지시를 고정한다.
- `docs/03-specs/*.md`는 기능 요구사항과 검증 기준을 고정한다.
- `docs/01-product/user-flows/*.md`는 사용자 흐름과 실패 흐름을 고정한다.
- `docs/02-architecture/*.md`는 공통 도메인, UI, integration, security 규칙을 고정한다.
- `docs/05-history/*`는 이력 문서이며 현재 범위를 확장하는 근거가 아니다.
- `docs/99-archive/`는 역사 기록이다. 현재 구현의 source of truth로 사용하지 않는다.
- spec과 architecture가 정면충돌하면 추정으로 메우지 말고 문서 충돌로 보고한다.

## Sprint Execution Loop

### 1. Current Sprint 확인
- 한 번에 하나의 Sprint만 진행한다.
- 현재 실행 단위는 `docs/04-sprints/sprint-XX/` 아래 문서로 판단한다.
- 새 Sprint를 열 때는 `docs/04-sprints/template/`를 기준으로 문서를 만든다.
- Sprint가 비어 있거나 아직 범위가 고정되지 않았다면 구현하지 않고 범위 확정부터 요구한다.

### 2. Sprint Ready Gate 확인
- 구현 전에 `definition-of-ready` 기준을 점검한다.
- 아래가 비어 있으면 현재 Sprint는 ready가 아니다.
  - `planning.md`
- 범위가 불완전하면 추정 구현 대신 필요한 문서 보강을 우선한다.

### 3. Relevant Docs 읽기
작업 유형에 따라 관련 문서를 좁혀 읽는다.
- UI/레이아웃: `browse-and-detail`, `ui-design`, `system-context`
- 데이터/등록: `place-submission`, `domain-model`, `integrations`
- 인증/보안: `auth-and-name-entry`, `security-and-ops`, `system-context`
- 리뷰/추천: `review`, `recommendation`, `domain-model`, `ui-design`

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
- 검증 결과는 현재 Sprint의 `qa.md`에 기록한다.
- 완료, 미완료, carry-over, 회고는 현재 Sprint의 `review.md`에 기록한다.

### 6. Change Handling
- 실행 중 새 요청이나 범위 변경이 생기면 바로 구현하지 않는다.
- 먼저 `docs/05-history/change-log.md`에 변경 요청과 처리 결정을 남긴다.
- 현재 Sprint에 반영하기로 결정한 경우에만 `planning.md`와 필요한 spec을 함께 갱신한다.
- 반영하지 않기로 결정한 요청은 change log에 보류 또는 후속 후보로 남긴다.
- feature identity가 유지되면 기존 spec을 수정한다.
- feature identity가 바뀌거나 spec이 분리되면 새 spec을 만들고, 기존 spec의 retired 여부를 판단한다.

### 7. Autonomous Decision Log
- AI Agent는 문서 경계 안에서 스스로 판단해 진행하되, 비자명한 판단은 `docs/05-history/decisions.md`에 기록한다.
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
- commit 이후 필요한 경우 `docs/05-history/decisions.md`의 관련 entry에 실제 commit hash를 반영한다.

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
- `docs/04-sprints/sprint-XX/planning.md`가 실제 구현 기준과 일치함
- `docs/04-sprints/sprint-XX/qa.md` 반영
- `docs/04-sprints/sprint-XX/review.md` 반영
- 필요했던 의사결정이 `docs/05-history/decisions.md`에 기록됨
- 범위 변경이 있었다면 `docs/05-history/change-log.md`에 기록됨
