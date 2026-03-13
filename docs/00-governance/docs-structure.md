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
  04-design/
  05-sprints/
    template/
    sprint-XX/
  06-history/
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
- `AGENTS.md`에는 OMX runtime/orchestration 규칙과 상위 hard constraints를 둔다.
- AI Agent task guidance는 기본적으로 `agent-workflow.md`에 통합하고, 별도 분리는 예외로 제한한다.

### `01-product/`
- 제품의 목표, 비목표, 원칙, 핵심 사용자 흐름을 둔다.
- 자주 바뀌지 않는 상위 문서를 유지한다.

### `02-architecture/`
- 도메인 모델, 시스템 경계, integration, security 규칙을 둔다.
- 구현 제약과 공통 규칙은 이 폴더에서 관리한다.

### `03-specs/`
- 장기 기능 spec만 둔다.
- 현재 Sprint에서 선택된 spec만 source of truth로 사용한다.
- QA 전용 일회성 문서는 두지 않는다.

### `04-design/`
- 공통 레이아웃, breakpoint, UI 상태 모델, 흐름별 화면 구조를 둔다.
- `foundations.md`에는 전역 디자인 기준을 둔다.
- 흐름별 디자인 문서는 가능한 한 대응하는 `user-flows/` slug와 같은 이름을 사용한다.

### `05-sprints/`
- 현재 또는 과거 Sprint의 실행 문서를 둔다.
- `template/`에는 새 Sprint를 시작할 때 복사할 기본 문서를 둔다.
- Sprint마다 동일한 파일 세트를 사용한다.
- `planning.md`는 Sprint 시작 전 기준 문서다.
- `qa.md`는 검증 실행 결과 문서다.
- `review.md`는 결과 요약, 미완료 항목, carry-over, 회고를 함께 담는다.

### `06-history/`
- 현재 구현의 source of truth는 아니지만 남겨야 할 이력을 둔다.
- `decisions.md`는 비자명한 의사결정 기록이다.
- `change-log.md`는 변경 요청과 반영 여부 기록이다.

### `99-archive/`
- 더 이상 라이브 source of truth가 아닌 문서를 보관한다.
- retired 된 문서와 legacy QA 기록만 남긴다.
- archive 문서는 현재 구현 기준으로 사용하지 않는다.

## Document Creation Rules
- 새로운 기능 요구사항은 `03-specs/`에 다음 번호로 추가한다.
- 새로운 디자인 기준이나 화면 구조를 만들거나 바꿀 때는 `04-design/`을 우선 검토한다.
- 새로운 Sprint를 시작할 때는 `05-sprints/template/`를 기준으로 `05-sprints/sprint-XX/`를 만든다.
- 운영 규칙을 추가할 때는 `00-governance/`에 둔다.
- runtime/orchestration 규칙은 `AGENTS.md`에 두고, repository-specific AI Agent task guidance는 기본적으로 `agent-workflow.md`에 둔다.
- 제품 설명이나 흐름을 바꿀 때는 `01-product/`를 우선 검토한다.
- 기술 구조나 제약을 바꿀 때는 `02-architecture/`를 우선 검토한다.
- 변경 요청이나 비자명한 판단은 각각 `06-history/change-log.md`, `06-history/decisions.md`에 기록한다.
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
- Related Product / Design / Architecture Docs
- Constraints
- Agent Instructions
- Done Criteria
- QA Plan

`# QA Plan` 아래 필수 하위 섹션:
- `## Automated Checks`
- `## AI Agent Interactive QA`
- `## Browser Automation QA`
- `## User QA Required`

규칙:
- `## Browser Automation QA`는 기본 브라우저 QA 기록 섹션이다. Playwright (`playwright` command)를 우선 사용하고, Playwright 실행 실패 시 `agent-browser`를 다음 fallback으로 계획한다.
- 둘 다 사용할 수 없거나 실행에 실패하면 `qa.md`에 blocker를 남기고 사용자에게 알린다.
- 한 sprint 안에 medium 이상 change가 여러 개 있거나, high-risk change 하나를 별도로 추적해야 하면 선택적으로 `# Active Changes` 섹션을 추가해 change ID 단위 추적(`CHG-01` 등)을 할 수 있다.
- tiny/local fix는 change card를 만들지 않아도 된다.
- change card는 요약/추적용으로만 쓰고, spec이나 실행 순서를 길게 복제하지 않는다.

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

`# Manual QA Result` 아래 필수 하위 섹션:
- `## AI Agent Interactive QA Result`
- `## Browser Automation QA Evidence`
- `## User QA Required`

규칙:
- `## Browser Automation QA Evidence`는 기본 브라우저 QA 증빙 섹션이다.
- Playwright (`playwright` command) 또는 `agent-browser`를 실행했다면 `qa.md`에 목적, 실행 명령 또는 사용 도구, 판정, 스크린샷 경로를 남긴다.
- Playwright 스크린샷은 `artifacts/qa/sprint-XX/` 아래처럼 Sprint를 식별할 수 있는 경로에 둔다.
- 사용자 직접 QA 요청은 `qa.md`를 source of truth로 삼고, `review.md`는 blocker 요약만 남긴다.
- `planning.md`에서 `# Active Changes`를 사용했다면, 선택적으로 `# Change Verification` 섹션을 추가해 같은 change ID로 QA 결과를 연결할 수 있다.
- `# Change Verification`은 change card의 짧은 결과 요약만 두고, 상세 evidence는 기존 QA 섹션에 남긴다.

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

규칙:
- 사용자 직접 QA 요청의 기본 기록 위치는 `qa.md`다.
- `review.md`에는 실제 release blocker나 carry-over만 요약한다.
- `planning.md`에서 `# Active Changes`를 사용했다면, 선택적으로 `# Change Outcomes` 섹션을 추가해 change ID별 완료/이월 상태를 짧게 기록할 수 있다.
- `# Change Outcomes`는 상태 요약만 두고, 상세 회고는 기존 섹션에 남긴다.

### `template/review.md`
- `review.md`의 기본 템플릿이다.
- Sprint 종료 시 결과 요약과 회고를 같은 형식으로 남기기 위해 사용한다.

## Live And Archive Boundary
- 라이브 문서는 `00-governance/`부터 `06-history/`까지다.
- `99-archive/`는 읽을 수는 있지만 현재 구현 기준이 아니다.
- 라이브 문서를 대체하는 구조 변경이 생기면 먼저 archive snapshot을 만든 뒤 새 구조를 반영한다.
- `99-archive/`의 문서는 파일 상단에 archived 상태와 대체 경로를 명시한다.
