# Ralph Sequence: Plan 01 To Plan 11

## Purpose
이 문서는 Nurimap의 전 범위를 Ralph 또는 Team으로 순차 실행할 때 사용할 운영 기준을 정리한다.

## Global Rules
- Plan은 반드시 `docs/plans.md` 순서를 따른다.
- 한 번에 하나의 Plan만 진행한다.
- 각 Plan 시작 전 `prd-*.md`, `test-spec-*.md`를 점검한다.
- 각 Plan 종료 전 검증과 commit을 완료한다.
- commit 없는 Plan 완료는 허용하지 않는다.
- 비자명한 자율 의사결정은 `docs/decisions.md`에 기록하고, Plan 종료 전 관련 commit hash를 반영한다.

## Per-Plan Loop
1. 현재 Plan 관련 문서 읽기
2. `.omx/plans/prd-*.md`, `test-spec-*.md` 갱신
3. `$ralph` 또는 `$team`으로 실행
4. 필요했던 자율 의사결정을 `docs/decisions.md`에 기록
5. spec + DoD 기준 검증
6. `/prompts:git-master` 또는 동등한 git 절차로 commit
7. `git log -1 --stat` 확인
8. decision log에 final commit hash 반영
9. commit hash 기록
10. 다음 Plan 이동

## Plan Checkpoints
- Plan 01: 앱 셸 골격 + 초기 스택 세팅
- Plan 02: 지도/목록 연동 기본 탐색
- Plan 03: 상세 화면 탐색
- Plan 04: URL 정규화
- Plan 05: place 데이터 추출
- Plan 06: 등록/병합
- Plan 07: 로컬 통합 QA
- Plan 08: 인증/접근 제어
- Plan 09: 리뷰/별점
- Plan 10: 추천
- Plan 11: release hardening

## Stop Conditions
아래 상황이면 현재 Plan에서 멈춘다.
- 문서 충돌
- 외부 서비스 자격 증명 부재
- 테스트/빌드/QA 실패
- decision log 정리 불가
- 커밋 불가
- 사용자 변경사항과 안전하게 분리 불가
