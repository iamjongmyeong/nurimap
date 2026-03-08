# PRD: Plan 09 리뷰와 별점 평가

## Goal
로그인 사용자의 리뷰 작성과 별점 평가 기능을 함께 완성한다.

## Source Documents
### Required Common Docs
- `AGENTS.md`
- `docs/project-overview.md`
- `docs/plans.md`
- `docs/definition-of-done.md`

### Included Specs
- `docs/specs/10-review.md`

### Primary Architecture Docs
- `docs/architecture/domain-model.md`
- `docs/architecture/ui-design.md`
- `docs/architecture/user-flow.md`

## Expected Outcomes
- 리뷰+별점 작성
- 중복 리뷰 방지
- 평균 별점/별점 수 갱신

## Implementation Guardrails
- 현재 Plan의 included spec을 직접 source of truth로 사용한다.
- 공통 규칙은 관련 architecture 문서로 보정한다.
- `docs/todos.md`의 내용을 현재 요구사항으로 끌어오지 않는다.
- React 프론트엔드 작업에서는 `vercel-react-best-practices`를 적용한다.
- spec과 architecture가 충돌하면 구현하지 말고 충돌을 보고한다.

## Commit Gate
- Plan 내부에서 atomic commit은 자유롭게 만들 수 있다.
- 단, 이 Plan을 완료 처리하기 전에는 반드시 **완료 상태를 대표하는 commit**이 최소 1개 있어야 한다.
- commit 없이 다음 Plan으로 넘어가면 안 된다.
- commit 후 `git log -1 --stat`를 확인하고 commit hash를 기록한다.

## Verification Gate
- 현재 Plan의 spec acceptance criteria 충족
- required test cases 대응
- manual QA checklist 확인
- QA evidence 확보
- `docs/definition-of-done.md` 통과
- commit 완료

## Autonomous Decision Log
- 이 Plan 진행 중 비자명한 자율 의사결정이 필요하면 `docs/decisions.md`에 기록한다.
- 최소 기록 항목: context, options considered, decision, rationale, impact, revisit trigger, related docs, related commit.
- Plan 종료 전 관련 decision entry에 실제 commit hash를 반영한다.

## Exit Condition
이 Plan의 구현/검증/문서 반영/commit이 모두 끝난 뒤에만 다음 Plan으로 이동한다.
