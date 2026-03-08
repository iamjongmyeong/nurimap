# PRD: Plan 07 로컬 통합 검증

## Goal
로그인 전 핵심 사용자 기능을 로컬에서 한 흐름으로 검증한다.

## Source Documents
### Required Common Docs
- `AGENTS.md`
- `docs/project-overview.md`
- `docs/plans.md`
- `docs/definition-of-done.md`

### Included Specs
- `docs/specs/12-local-integration-qa.md`

### Primary Architecture Docs
- `docs/architecture/ui-design.md`
- `docs/architecture/user-flow.md`
- `docs/architecture/integrations.md`

## Expected Outcomes
- 등록→지도/목록/상세 통합 검증
- 데스크톱/모바일 반응형 검증
- 주요 실패 상태 검증

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
