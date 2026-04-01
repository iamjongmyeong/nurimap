# Sprint Goal

- Nurimap의 browse/detail을 anonymous read-open 상태로 전환한다.
- `장소 추가`와 `평가 남기기`는 visible affordance를 유지하되, 로그인 완료 전에는 write-only gate로 막는다.
- security/runtime/spec/user-flow/Sprint 문서를 구현 전 source-of-truth로 동기화한다.

# In Scope

- anonymous `/` browse + `/places/:placeId` detail 정책 정리
- auth_required와 app-shell rendering 분리 계약 문서화
- native confirm 기반 write-intent gating 문서화
- post-login/post-name add-place/add-rating intent restoration 문서화
- desktop/mobile auth control state contract 문서화
- Sprint 24 planning / qa / review artifact 생성

# Out Of Scope

- OTP 인증 방식 변경
- allowed domain / bypass / session duration 정책 변경
- custom auth-required modal 또는 custom button label 작업
- parallel public/private route tree 도입
- search policy 완화 또는 crawler 허용

# Selected Specs

- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/05-auth-email-login-link.md`
- `docs/03-specs/08-place-registration.md`
- `docs/03-specs/10-review.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/user-flows/auth-and-name-entry.md`
- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/01-product/user-flows/place-submission.md`
- `docs/01-product/user-flows/review.md`
- `docs/02-architecture/security-and-ops.md`
- `docs/02-architecture/system-runtime.md`
- `.omx/specs/deep-interview-anonymous-browse-login-gating.md`
- `.omx/plans/plan-anonymous-browse-login-gating-consensus.md`
- `.omx/plans/prd-anonymous-browse-login-gating.md`
- `.omx/plans/test-spec-anonymous-browse-login-gating.md`

# Constraints

- anonymous read-open 범위는 browse/detail read와 read API에 한정한다.
- write API와 mutable workflow는 authenticated session + CSRF boundary를 유지한다.
- auth phase semantics를 바꾸지 않는다. anonymous 사용자를 `authenticated`로 취급하지 않는다.
- write gating prompt는 browser-native confirm을 사용하고, `장소 추가`/direct `/add-place`는 `누가 추가했는지 알 수 있도록 로그인해주세요.`, `평가 남기기`는 `누가 등록했는지 알 수 있도록 로그인해주세요.`를 사용한다.
- desktop auth control은 text `로그인`/`로그아웃`, mobile auth control은 icon-button `로그인`/`로그아웃` contract를 따른다.
- mobile anonymous 로그인 icon은 `public/assets/icons/icon-auth-login.svg`를 사용한다.
- search blocking(`robots.txt`, `noindex`, `X-Robots-Tag`)은 유지한다.
- docs/spec/sprint sync를 구현과 같은 change set으로 유지한다.

# Agent Instructions

- 구현 전 live docs에서 `전체 앱은 로그인 뒤에만 접근 가능` 같은 기존 가정을 먼저 제거한다.
- browse/detail read-open과 write-auth boundary를 분리해 문서화한다.
- direct `/add-place` anonymous entry도 click-based write intent와 같은 gate로 기록한다.
- logout landing은 blocking auth surface가 아니라 anonymous browse/detail 유지로 문서화한다.
- `docs/06-history/*` 수정이 필요하면 workflow 규칙에 따라 먼저 사용자 확인을 받는다.

# Done Criteria

- source-of-truth architecture/spec/user-flow 문서가 anonymous browse + login-only write gating 정책과 일치한다.
- Sprint 24 planning / qa / review artifact가 생성되어 있다.
- anonymous `/` browse, anonymous `/places/:placeId` detail, write CTA confirm, intent restore, logout-to-anonymous contract가 모두 문서에 반영돼 있다.
- live docs 안에 browse/detail 전체 로그인 게이트를 전제로 한 문구가 남아 있지 않다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - anonymous `/` browse render
  - anonymous `/places/:placeId` detail render
  - `장소 추가` / `평가 남기기` native confirm gating
  - post-login/post-name add-place/add-rating intent restoration
  - anonymous list/detail read success + protected write route unauthorized
- 실행 주체:
  - AI Agent
- 종료 기준:
  - focused frontend/backend regressions, full test suite, lint, typecheck, build가 통과한다.

## AI Agent Interactive QA
- 대상 시나리오:
  - auth_required와 browse shell 분리 contract가 docs/code/tests에 일관되게 반영되는지
  - anonymous read-open / write-auth 경계가 security/runtime/spec에서 충돌하지 않는지
  - desktop/mobile auth control, logout landing, native confirm copy가 합의된 contract와 일치하는지
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 구현 결과와 Sprint 24 문서, `.omx` plan/PRD/test spec 사이에 정책 충돌이 없다.

## Browser Automation QA
- 대상 시나리오:
  - anonymous `/` browse와 `/places/:placeId` detail 진입
  - anonymous `장소 추가` / `평가 남기기` confirm cancel/accept path
  - 로그인 + 이름 입력 이후 add-place/add-rating intent restoration
  - authenticated logout -> anonymous browse/detail 유지
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright 우선으로 주요 flow를 캡처하고 결과를 Sprint 24 QA evidence에 남긴다. 불가 시 blocker를 기록한다.
- 예상 증빙 경로:
  - `artifacts/qa/sprint-24/`

## User QA Required
- 사용자 확인 항목:
  - anonymous browse가 의도한 범위(`/`, `/places/:placeId`, 리뷰/작성자 노출)로 동작하는지
  - `장소 추가` / `평가 남기기` 로그인 안내 문구와 흐름이 기대와 맞는지
  - 로그인 후/로그아웃 후 맥락 복귀가 자연스러운지
- 기대 결과:
  - browse friction은 줄고, write safety/auth policy는 유지된다.
- handoff 조건:
  - automated checks, AI Agent QA, browser evidence 또는 blocker가 기록돼 있다.
