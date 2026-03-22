# Sprint Goal

- Nurimap을 **예시(mock) 데이터 기반 상태에서 실제 Supabase 데이터 기반 상태**로 옮긴다.
- 사용자가 보는 로그인 경험은 최대한 유지하면서, 내부 구조는 **Frontend -> Backend -> Supabase** 계약으로 정리한다.
- 이번 Sprint에서는 recommendation을 다시 만들지 않고, **제거된 상태를 유지**한다.

# In Scope

- auth/runtime/source-of-truth 문서 정렬
- Supabase CLI 기반 migration 시작
- backend session foundation 정리
- backend OTP verify + session bootstrap contract 도입
- place list/detail, place create, review create/overwrite의 real-data 전환
- recommendation 제거 상태 유지 및 재도입 방지
- `dev / test / production` 분리 기준 정리

# Out Of Scope

- custom auth engine 구축
- staging 실제 운영
- seed data 투입
- recommendation 기능 재도입

# Selected Specs

- `docs/03-specs/01-app-shell-and-layout.md`
- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/05-auth-email-login-link.md`
- `docs/03-specs/08-place-registration.md`
- `docs/03-specs/09-place-merge.md`
- `docs/03-specs/10-review.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/product-overview.md`
- `docs/01-product/user-flows/auth-and-name-entry.md`
- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/01-product/user-flows/place-submission.md`
- `docs/01-product/user-flows/review.md`
- `docs/04-design/auth-and-name-entry.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/place-submission.md`
- `docs/02-architecture/system-runtime.md`
- `docs/02-architecture/security-and-ops.md`
- `docs/02-architecture/domain-model.md`
- `docs/00-governance/agent-workflow.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md`
- `.omx/plans/prd-supabase-place-auth-real-data-migration.md`
- `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`

# Constraints

- frontend는 Supabase에 직접 연결하지 않는다.
- backend가 auth/authz/business logic를 소유한다.
- schema 변경은 migration file로만 수행한다.
- multi-step operation은 backend transaction으로 처리한다.
- environment는 `dev / test / production`으로 구분한다.
- recommendation은 현재 제거된 상태를 유지한다.
- email OTP UX와 90일 same-browser session UX는 유지한다.
- 구현의 상세 SSOT는 `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md` 및 관련 PRD/test spec이다.
- 이 문서와 `.omx` 구현 계획이 충돌하면 `.omx` 계획 문서를 우선한다.

# Agent Instructions

- 구현의 상세 순서와 파일 단위 작업은 `.omx` plan을 따른다.
- recommendation 제거 상태를 baseline invariant로 유지한다.
- `docs/06-history/*` 수정이 필요하면 먼저 사용자에게 설명하고 확인을 받는다.

# Done Criteria

- source-of-truth docs가 backend-owned auth/persistence contract와 일치한다.
- `.omx` plan의 핵심 acceptance criteria를 구현과 검증으로 충족한다.
- frontend direct Supabase usage가 제거된다.
- place/review real-data flow가 동작한다.
- recommendation이 재도입되지 않는다.
- sprint 문서와 QA evidence가 현재 상태와 일치한다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - frontend direct Supabase usage 제거
  - backend auth cookie/session flow
  - place/review real-data persistence
  - recommendation 재도입 방지
  - migration safety (`dev` / `test`)
- 실행 주체:
  - AI Agent
- 종료 기준:
  - `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`에 정의된 automated verification을 충족한다.

## AI Agent Interactive QA
- 대상 시나리오:
  - auth/session bootstrap contract 설명 가능 여부
  - duplicate place/review overwrite semantics 보존 여부
  - recommendation 제거 invariant 유지 여부
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 구현 결과와 `.omx` plan/PRD/test-spec 및 live docs 사이 충돌이 없다.

## Browser Automation QA
- 대상 시나리오:
  - email OTP request -> verify -> name entry -> browse empty state
  - revisit with cookie session -> logout -> relogin
  - empty DB -> place create -> detail -> review overwrite
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright 우선, 실패 시 blocker를 기록한다.
- 예상 증빙 경로:
  - `artifacts/qa/sprint-20/`

## User QA Required
- 사용자 확인 항목:
  - auth UX가 이전과 비교해 어색하지 않은지
  - 빈 상태 browse와 첫 등록 흐름이 기대와 맞는지
  - review overwrite 동작이 의도대로 보이는지
- 기대 결과:
  - backend cutover 이후에도 핵심 흐름이 끊기지 않는다.
- handoff 조건:
  - automated checks, AI Agent QA, browser evidence 또는 blocker가 기록돼 있다.
