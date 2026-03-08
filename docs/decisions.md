# Decisions

## Purpose
이 문서는 Nurimap 개발 중 AI Agent가 **사용자 개입 없이 스스로 판단한 비자명한 의사결정**을 기록하는 로그다.
요구사항 자체를 대체하는 문서는 아니며, `docs/specs/*.md`, `docs/architecture/*.md`, `docs/plans.md`, `docs/definition-of-done.md`를 해석·적용하는 과정에서 생긴 판단 근거를 남기는 용도다.

## When To Record
아래 중 하나에 해당하면 기록한다.
- 구현 방식에 유효한 선택지가 2개 이상 있었고 하나를 골랐을 때
- 문서 충돌은 아니지만 문서만으로 세부 구현이 완전히 고정되지 않아 합리적 판단이 필요했을 때
- 임시 우회책, fallback, staged rollout, mock 전략을 선택했을 때
- 라이브러리, 상태 구조, 컴포넌트 경계, API shape, 캐시 전략, 테스트 전략 등 이후 작업에 영향을 주는 선택을 했을 때
- 현재는 진행 가능하지만 나중에 재검토가 필요하다고 판단했을 때

기록하지 않아도 되는 경우:
- spec에 이미 명확히 고정된 사항을 그대로 구현한 경우
- 단순 리팩터링, 이름 변경, 기계적 수정처럼 판단 근거를 남길 가치가 낮은 경우

## Entry Format
아래 템플릿으로 append한다.

```md
## YYYY-MM-DD Plan XX - Short Title
- Context:
- Options considered:
  - Option A:
  - Option B:
- Decision:
- Rationale:
- Impact:
- Revisit trigger:
- Related docs:
  - docs/...
- Related commit: TBD
```

## Usage Rules
- 한 Plan에서 여러 번 판단이 필요하면 entry를 여러 개 남겨도 된다.
- `Related commit`은 판단 당시 커밋이 없으면 `TBD`로 두고, Plan 종료 전에 실제 commit hash로 갱신한다.
- 문서 충돌이라면 먼저 충돌을 보고하고, 임의로 해소한 뒤 기록만 남기는 방식으로 처리하지 않는다.
- 다음 Plan으로 넘어가기 전에, 해당 Plan에서 생긴 중요한 판단이 모두 기록되었는지 확인한다.

## Entries
아직 기록된 의사결정이 없다.
