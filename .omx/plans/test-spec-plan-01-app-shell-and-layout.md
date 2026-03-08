# Test Spec: Plan 01 앱 셸과 공통 레이아웃

## Purpose
이 문서는 Plan 01의 검증 기준을 고정한다.
구현자는 아래 source spec의 `Required Test Cases`, `Manual QA Checklist`, `QA Evidence`를 반드시 따른다.

## Source Specs
- `docs/specs/00-app-shell-and-layout.md`

## Related Architecture Docs
- `docs/architecture/ui-design.md`
- `docs/architecture/user-flow.md`
- `docs/architecture/system-context.md`

## Verification Focus
- 데스크톱/모바일 공통 레이아웃
- 사이드바/상세 패널/모바일 버튼 골격
- 이후 탐색 기능을 얹을 수 있는 앱 구조

## Automated Verification Expectations
- source spec의 `Required Test Cases`를 최소 기준으로 구현하거나 대응한다.
- 가능하면 자동화 테스트를 우선하고, 부족한 부분은 manual QA로 보강한다.
- lint / typecheck / build / 실행 검증 중 현재 Plan에 필요한 검증을 통과한다.

## Manual QA Expectations
- source spec의 `Manual QA Checklist`를 실제로 확인한다.
- 반응형, 에러 상태, 상태 전이, 성공/실패 UX를 포함한다.

## Evidence To Capture
- 테스트 실행 결과
- 수동 QA 결과
- 필요한 경우 스크린샷 또는 로그
- 결정이 있었다면 `docs/decisions.md` 업데이트 결과
- `git log -1 --stat` 결과

## Decision Log Gate
- 구현 중 비자명한 자율 의사결정이 있었다면 `docs/decisions.md`에 기록한다.
- Plan 종료 전 관련 decision entry에 final commit hash를 반영한다.

## Commit Gate
- Plan 01 완료 전 반드시 commit을 생성한다.
- commit 없이 다음 Plan으로 넘어가면 실패로 간주한다.
- commit hash를 notepad 또는 작업 보고에 남긴다.

## Exit Condition
- source spec acceptance criteria 충족
- definition of done 충족
- QA evidence 확보
- commit 완료
