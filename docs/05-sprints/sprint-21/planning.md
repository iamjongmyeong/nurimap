# Sprint Goal

- mobile place-add를 canonical `/add-place` route/page로 승격해 **키보드/회색 화면 문제를 구조적으로 제거**한다.
- mobile에서 `/add-place`의 **기기 뒤로가기 / 브라우저 뒤로가기**가 Nurimap 내부 이전 context를 복원하도록 만든다.
- desktop은 현재 sidebar 내부 place-add UX를 유지하면서, `/add-place` direct entry를 같은 sidebar surface에 매핑한다.

# In Scope

- canonical `/add-place` route contract 정의
- mobile place-add standalone page 도입
- mobile `/add-place` direct entry / refresh contract 정의
- mobile `/add-place` back / browser back / fallback(`/`) contract 정의
- desktop `/add-place` direct entry를 sidebar place-add surface로 매핑
- current browse/detail/add state와 route sync 방식 정리
- source-of-truth 문서(app-shell/list-browse/design/user-flow/runtime) 업데이트
- 관련 테스트 및 QA evidence 계획 정리

# Out Of Scope

- add-rating route 승격
- desktop detail/add 전반 리디자인
- place submission API contract 변경
- place submission backend resource contract 재설계

# Selected Specs

- `docs/03-specs/01-app-shell-and-layout.md`
- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/08-place-registration.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/10-review.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/01-product/user-flows/place-submission.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/place-submission.md`
- `docs/02-architecture/system-runtime.md`
- `docs/00-governance/agent-workflow.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `.omx/specs/deep-interview-mobile-place-add-route.md`

# Constraints

- mobile place-add만 route/page 승격 대상으로 본다.
- desktop rendering은 기존 sidebar internal surface를 유지한다.
- desktop에서도 `/add-place` direct entry는 지원하되, 새 full page가 아니라 sidebar place-add surface를 연다.
- add-rating은 현재 문서 계약대로 detail-owned child surface로 유지한다.
- place submission API contract는 변경하지 않는다.
- direct entry / refresh도 정식 지원 범위에 포함한다.
- mobile success criteria 2개(회색 영역 제거, 내부 이전 context 복원)는 둘 다 필수다.

# Agent Instructions

- 구현 전 source-of-truth 문서 충돌을 먼저 정리한다.
- route 도입은 mobile keyboard/gray issue 해결과 back UX 개선을 위한 구조 변경으로 다룬다.
- desktop은 URL contract만 공유하고 visual restructuring은 하지 않는다.
- direct entry / refresh / back fallback까지 테스트 계획에 포함한다.

# Done Criteria

- `/add-place`가 canonical route로 문서와 구현에서 정의된다.
- mobile에서 `/add-place`는 standalone full page로 열린다.
- mobile에서 `/add-place` 후기 input focus 시 회색 영역이 보이지 않는다.
- mobile에서 `/add-place` 진입 후 기기 뒤로가기/브라우저 뒤로가기가 Nurimap 내부 이전 context를 복원한다.
- direct entry / refresh로 `/add-place`에 진입해도 정상 렌더링된다.
- direct entry/refresh처럼 이전 context가 없을 때는 back fallback이 최소 `/`로 동작한다.
- desktop에서 `/add-place` direct entry 시 sidebar place-add surface가 열린다.
- add-rating이 route로 승격되지 않았고, place submission API contract가 유지된다.
- sprint 문서와 QA evidence가 구현 계약과 일치한다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - `/add-place` route 진입 / refresh
  - mobile `/add-place` back / browser back / fallback(`/`) behavior
  - desktop `/add-place` direct entry sidebar rendering
  - add-rating non-route invariant 유지
  - place submission API contract unchanged
- 실행 주체:
  - AI Agent
- 종료 기준:
  - route/history/viewport 관련 자동 테스트가 새 계약을 통과한다.

## AI Agent Interactive QA
- 대상 시나리오:
  - source-of-truth 문서와 구현 route contract 일치 여부
  - mobile success criteria 2개가 구현과 테스트에서 동시에 반영됐는지
  - desktop `/add-place` URL contract가 current UX를 과도하게 흔들지 않는지
- 실행 주체:
  - AI Agent
- 종료 기준:
  - docs / implementation / tests 사이에 계약 충돌이 없다.

## Browser Automation QA
- 대상 시나리오:
  - mobile viewport에서 `/add-place` 진입, 후기 input focus, 키보드/scroll visible-area 검증
  - mobile viewport에서 app 내부 진입 후 기기/브라우저 back contract 검증
  - mobile direct entry `/add-place` 후 back fallback(`/`) 검증
  - desktop `/add-place` direct entry 후 sidebar place-add 렌더링 검증
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright 우선으로 주요 route/history scenario를 재현하고 결과를 qa evidence에 기록한다.
- 예상 증빙 경로:
  - `artifacts/qa/sprint-21/`

## User QA Required
- 사용자 확인 항목:
  - mobile `/add-place`에서 후기 input focus 시 회색 영역이 사라졌는지
  - mobile에서 `/add-place` 진입 후 기기 뒤로가기 시 기대한 이전 context로 복귀하는지
  - direct entry `/add-place` 또는 refresh 후 back fallback이 어색하지 않은지
- 기대 결과:
  - mobile place-add UX가 route/page 분리 이후 더 안정적이고 예측 가능하다.
- handoff 조건:
  - automated checks, browser automation QA evidence, 남은 blocker/known risk가 함께 정리돼 있다.
