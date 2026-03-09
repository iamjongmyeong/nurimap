# Docs Structure

## Purpose
이 문서는 `docs/` 폴더의 라이브 구조, 네이밍 규칙, 문서 배치 기준을 정의한다.
문서 구조를 변경하거나 새 문서를 만들 때는 이 문서를 먼저 따른다.

## Structure Overview
현재 라이브 문서 구조는 아래 계층을 기준으로 유지한다.
가변적으로 늘어나는 디렉터리(`user-flows/`, `03-specs/`, `sprint-XX/`)는 예시만 표시한다.

```text
docs/
  00-governance/
  01-product/
    user-flows/
  02-architecture/
  03-specs/
  04-sprints/
    template/
    sprint-XX/
  05-history/
  99-archive/
    qa/
```

## Naming Rules
- 루트 영역 폴더는 `00-`, `01-`, `02-`처럼 숫자를 붙여 정렬 순서를 고정한다.
- 설명형 단일 문서는 숫자를 붙이지 않는다.
  - 예: `product-overview.md`, `definition-of-done.md`
- `03-specs/` 파일은 연속 번호와 slug를 함께 사용한다.
  - 예: `01-app-shell-and-layout.md`
- Sprint 폴더는 `sprint-XX/` 형식을 사용한다.
  - 예: `sprint-12/`
- Sprint 내부 파일은 고정 이름을 사용한다.
  - `planning.md`
  - `qa.md`
  - `review.md`

## Placement Rules

### `00-governance/`
- 문서 구조, workflow, ready/done 같은 운영 규칙을 둔다.
- AI Agent가 문서를 어떻게 해석하고 갱신해야 하는지 정의한다.

### `01-product/`
- 제품의 목표, 비목표, 원칙, 핵심 사용자 흐름을 둔다.
- 자주 바뀌지 않는 상위 문서를 유지한다.

### `02-architecture/`
- 도메인 모델, 시스템 경계, integration, security, UI 구조를 둔다.
- 구현 제약과 공통 규칙은 이 폴더에서 관리한다.

### `03-specs/`
- 장기 기능 spec만 둔다.
- 현재 Sprint에서 선택된 spec만 source of truth로 사용한다.
- QA 전용 일회성 문서는 두지 않는다.

### `04-sprints/`
- 현재 또는 과거 Sprint의 실행 문서를 둔다.
- `template/`에는 새 Sprint를 시작할 때 복사할 기본 문서를 둔다.
- Sprint마다 동일한 파일 세트를 사용한다.
- `planning.md`는 Sprint 시작 전 기준 문서다.
- `qa.md`는 검증 실행 결과 문서다.
- `review.md`는 결과 요약, 미완료 항목, carry-over, 회고를 함께 담는다.

### `05-history/`
- 현재 구현의 source of truth는 아니지만 남겨야 할 이력을 둔다.
- `decisions.md`는 비자명한 의사결정 기록이다.
- `change-log.md`는 변경 요청과 반영 여부 기록이다.

### `99-archive/`
- 더 이상 라이브 source of truth가 아닌 문서를 보관한다.
- retired 된 문서와 legacy QA 기록만 남긴다.
- archive 문서는 현재 구현 기준으로 사용하지 않는다.

## Document Creation Rules
- 새로운 기능 요구사항은 `03-specs/`에 다음 번호로 추가한다.
- 새로운 Sprint를 시작할 때는 `04-sprints/template/`를 기준으로 `04-sprints/sprint-XX/`를 만든다.
- 운영 규칙을 추가할 때는 `00-governance/`에 둔다.
- 제품 설명이나 흐름을 바꿀 때는 `01-product/`를 우선 검토한다.
- 기술 구조나 제약을 바꿀 때는 `02-architecture/`를 우선 검토한다.
- 변경 요청이나 비자명한 판단은 각각 `05-history/change-log.md`, `05-history/decisions.md`에 기록한다.
- 사용자의 명시적 요청이 없으면 `README` 같은 보조 문서를 새로 만들지 않는다.

## Spec Lifecycle
- feature identity가 유지되면 기존 spec을 수정한다.
- 같은 기능의 명확화, acceptance criteria 보강, 예외 처리 추가는 기존 spec 수정으로 처리한다.
- 같은 기능의 정책 변경도 기존 spec 수정으로 처리하되, 변경 사실은 `change-log.md`에 기록한다.
- feature identity가 바뀌거나 하나의 spec이 둘 이상 기능으로 분리되면 새 spec을 만든다.
- 더 이상 라이브 source of truth가 아닌 spec은 `99-archive/`로 이동할 수 있다.
- 현재 Sprint에 영향이 있는 spec 변경은 `planning.md`도 함께 갱신해야 한다.

## Sprint File Contracts

### `planning.md`
이 문서는 Sprint 시작 전 기준 문서다.

필수 섹션:
- Sprint Goal
- In Scope
- Out Of Scope
- Selected Specs
- Related Product / Architecture Docs
- Constraints
- Agent Instructions
- Done Criteria
- QA Plan

### `template/planning.md`
- `planning.md`의 기본 템플릿이다.
- 새 Sprint를 만들 때 이 파일 구조를 먼저 복사한다.

### `qa.md`
이 문서는 `planning.md`의 QA Plan을 실제로 수행한 결과를 기록한다.

필수 섹션:
- Verification Scope
- Automated Checks Result
- Manual QA Result
- Issues Found
- QA Verdict
- Follow-ups

### `template/qa.md`
- `qa.md`의 기본 템플릿이다.
- 검증 결과를 기록하기 전까지는 구조만 유지한다.

### `review.md`
이 문서는 Sprint 종료 시 결과와 남은 항목을 정리한다.

필수 섹션:
- Sprint Summary
- Completed
- Not Completed
- Carry-over
- Risks
- Retrospective

### `template/review.md`
- `review.md`의 기본 템플릿이다.
- Sprint 종료 시 결과 요약과 회고를 같은 형식으로 남기기 위해 사용한다.

## Live And Archive Boundary
- 라이브 문서는 `00-governance/`부터 `05-history/`까지다.
- `99-archive/`는 읽을 수는 있지만 현재 구현 기준이 아니다.
- 라이브 문서를 대체하는 구조 변경이 생기면 먼저 archive snapshot을 만든 뒤 새 구조를 반영한다.
- `99-archive/`의 문서는 파일 상단에 archived 상태와 대체 경로를 명시한다.
