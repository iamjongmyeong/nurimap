# Plan - Docs Thin Contract Execution

## Goal
AI Agent가 external design handoff를 구현할 때 source-of-truth 충돌을 줄이도록 문서 구조를 재편한다.

## Target Structure
### Architecture
- `docs/02-architecture/domain-model.md`
- `docs/02-architecture/system-runtime.md`
- `docs/02-architecture/security-and-ops.md`

### Thin contracts
- `docs/04-design/auth-and-name-entry.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/place-submission.md`

## Main changes
1. `system-context.md` + `integrations.md` + `foundations.md`의 구조 계약을 `system-runtime.md`로 통합한다.
2. `foundations.md`는 제거한다.
3. `review.md`, `recommendation.md`는 `browse-and-detail.md`에 흡수한다.
4. `auth-and-name-entry.md`, `browse-and-detail.md`, `place-submission.md`는 thin contract 문서로 재작성한다.
5. `docs-structure.md`, `agent-workflow.md`를 새 경계에 맞게 갱신한다.

## Thin contract rules
각 contract 문서는 다음만 남긴다.
- Applies when
- Visual source of truth
- Surface contract
- Transition contract
- Hidden invariants
- Failure / context rule
- Out of scope

각 contract 문서에서 제거한다.
- px / color / asset path / hover timing / font-size / opacity 같은 시각 가이드
- 임시 copy
- spec / user-flow / architecture와 중복되는 상세 정책

## Acceptance criteria
- Architecture는 3개 문서로 정리된다.
- Design은 3개 thin contract 문서만 남는다.
- `review.md`, `recommendation.md`, `foundations.md`, `system-context.md`, `integrations.md`는 live docs에서 제거되거나 흡수된다.
- `docs/00-governance/docs-structure.md`와 `docs/00-governance/agent-workflow.md`가 새 구조를 반영한다.
- 새로운 design 문서는 handoff/Figma/screenshot 우선 원칙을 명시한다.
