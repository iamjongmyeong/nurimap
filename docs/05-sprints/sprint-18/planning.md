# Sprint Goal

- Sprint 18에서 Nurimap auth의 canonical contract를 **6자리 email OTP** 기준으로 전면 전환한다.
- 기존 Supabase magic link + app-managed nonce + `/auth/verify` 로그인 성공 경로를 제거하고, allowed domain / resend policy / bypass / session persistence / name-required flow / protected API contract는 유지한다.
- AI Agent가 별도 추정 없이 실행할 수 있도록 문서, 서버, 클라이언트, 테스트, QA handoff를 단계적으로 고정한다.

# In Scope

- auth source-of-truth OTP cutover
  - `docs/03-specs/05-auth-email-login-link.md`를 OTP 기준 live contract로 재작성한다.
  - `docs/01-product/user-flows/auth-and-name-entry.md`, `docs/04-design/auth-and-name-entry.md`, `docs/02-architecture/security-and-ops.md`, `docs/02-architecture/system-runtime.md`를 OTP 계약에 맞게 동기화한다.
  - 기존 magic link / nonce / `/auth/verify` 로그인 성공 경로는 source of truth에서 제거하거나 legacy fallback으로만 남긴다.
- server auth boundary 교체
  - canonical auth request route를 `POST /api/auth/request-otp`로 고정한다.
  - 일반 OTP verify는 별도 앱 서버 route를 두지 않고 client-side `supabaseBrowser.auth.verifyOtp({ email, token, type: 'email' })`를 사용한다.
  - allowed domain, resend burst/cooldown, bypass, ops logging 정책은 계속 server boundary가 소유한다.
  - `src/server/*`와 `api/_lib/*` duplicated auth boundary를 함께 갱신한다.
- client auth state machine / UI 전환
  - 이메일 입력 -> OTP 입력 -> verify -> `name_required | authenticated` 흐름을 canonical auth flow로 만든다.
  - `auth_link_sent`, verify query parsing, `verify-link`/`consume-link` 의존을 제거하고 `otp_required` 중심 phase로 전환한다.
  - refresh / hard refresh / logout 후 재로그인에서도 terminal auth state 수렴을 유지한다.
- legacy magic-link runtime cleanup
  - `verify-link`, `consume-link`, nonce lifecycle, `/auth/verify` 성공 경로 의존을 제거한다.
  - 기존 `/auth/verify` 링크는 query를 정리한 뒤 `auth_failure` surface에서 `새 코드 받기` / `이메일 다시 입력` CTA를 제공하는 graceful fallback entry로만 남긴다.
  - `새 코드 받기`는 query의 `email` 값이 있으면 prefill한 `auth_required`로 복귀하지만 자동 재요청은 하지 않는다.
- verification / QA / Sprint docs 정리
  - OTP happy path, wrong/expired code, resend cooldown, terminal convergence 테스트를 추가/갱신한다.
  - `docs/05-sprints/sprint-18/qa.md`, `review.md`를 OTP 기준 handoff 구조로 준비한다.

# Out Of Scope

- 외부 auth provider(Clerk 등)로 교체
- custom OTP DB / 코드 생성 / 코드 해시 검증 시스템 직접 구현
- auth 외 browse/detail/map/review 도메인의 구조 변경
- live deployed 환경의 실제 이메일 수신/OTP 입력 성공까지 AI Agent가 자동 완료하는 작업
- profile system 재설계 또는 user metadata 구조 확장

# Selected Specs

- `docs/03-specs/05-auth-email-login-link.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/user-flows/auth-and-name-entry.md`
- `docs/04-design/auth-and-name-entry.md`
- `docs/02-architecture/security-and-ops.md`
- `docs/02-architecture/system-runtime.md`
- `docs/00-governance/agent-workflow.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `docs/06-history/decisions.md`
- `docs/05-sprints/sprint-17/planning.md` (magic-link contract and `/auth/verify` migration의 직전 기준 참고용)
- `docs/05-sprints/sprint-17/qa.md` (auth regression / browser QA evidence shape 참고용)

# Constraints

- 이번 Sprint는 **완전 교체 + 즉시 컷오버**다. OTP는 canonical auth flow가 되고, magic link dual support는 유지하지 않는다.
- 기존 `/auth/verify`는 더 이상 로그인 성공 경로가 아니어야 한다. 남긴다면 old link 클릭 시 새 OTP 요청으로 유도하는 fallback surface만 허용한다.
- allowed domain, resend burst 5회 후 cooldown, bypass, ops logging, 90일 세션, auto refresh, name-required flow, 보호 API access token 사용 계약은 regression 없이 유지해야 한다.
- `src/server/*`와 `api/_lib/*`는 duplicated boundary이므로 auth policy/service/route contract 변경 시 항상 함께 수정한다.
- route/상태 모델/카피 변경은 반드시 selected spec과 관련 user-flow / design / architecture 문서까지 같은 Sprint에서 동기화한다.
- live deployed email end-to-end 확인은 Sprint blocking completion이 아니다. `User QA Required` handoff로 남길 수 있다.
- DEV-only bypass auto-login, test auth harness, bypass secret handling 규칙은 가능한 한 유지한다.
- server-side resend/cooldown 상태는 Supabase auth user의 `app_metadata.nurimap_auth`에 유지하되, nonce/token_hash lifecycle 필드는 제거하고 OTP-era bookkeeping 필드만 남긴다.
- bypass는 canonical user auth flow가 아니라 dev/test convenience 예외다. OTP cutover 후에도 `{ status: 'success', mode: 'bypass', message, tokenHash, verificationType }` shape를 유지할 수 있다.
- 일반 OTP verify는 별도 `api/auth/verify-otp` route를 새로 만들지 않고 client-side `verifyOtp({ email, token, type: 'email' })`를 canonical contract로 사용한다.
- 장기적으로 misleading naming을 남기지 않는다. 실제 OTP 발송 경로를 계속 `request-link` 같은 이름으로 숨긴 상태를 canonical contract로 두지 않는다.

# Concrete File Targets

- 문서 계약
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/01-product/user-flows/auth-and-name-entry.md`
  - `docs/04-design/auth-and-name-entry.md`
  - `docs/02-architecture/security-and-ops.md`
  - `docs/02-architecture/system-runtime.md`
- server boundary
  - `src/server/authPolicy.ts`
  - `src/server/authService.ts`
  - `src/server/authPolicy.test.ts`
  - `src/server/authService.test.ts`
  - `api/_lib/_authPolicy.ts`
  - `api/_lib/_authService.ts`
  - `api/auth/request-otp.ts`
  - `api/auth/request-link.ts` (remove or redirect decision)
  - `api/auth/verify-link.ts`
  - `api/auth/consume-link.ts`
- client boundary
  - `src/auth/authContext.ts`
  - `src/auth/AuthProvider.tsx`
  - `src/auth/authVerification.ts`
  - `src/auth/testAuthState.ts`
  - `src/auth/AuthFlow.test.tsx`
  - `src/auth/authVerification.test.ts`

# Agent Instructions

- 구현 순서는 **문서 계약 고정 -> server OTP boundary -> client OTP flow -> legacy cleanup -> verification** 순서를 따른다.
- 문서 계약이 바뀌기 전에는 auth 구현 변경을 시작하지 않는다.
- OTP는 Supabase의 email OTP verification 경로를 사용하고, custom OTP store를 직접 설계하지 않는다.
- `AuthProvider` 리팩터링 시 session restore / `name_required` / `authenticated` / protected API auth contract를 별도 regression cluster로 보호한다.
- `/auth/verify` 제거는 client/server OTP flow가 green 상태가 된 뒤에 진행한다.
- old magic link fallback은 blank screen/404가 아니라 새 OTP 요청으로 수렴하는 terminal UX만 허용한다.
- 브라우저 QA는 live email delivery 자체보다 **OTP UI state, resend, failure copy, terminal convergence, old-link fallback** 확인에 집중한다.
- wrong/expired/invalidated/generic/old-link fallback copy는 selected spec의 exact copy contract를 따른다.
- 비자명한 전환 결정(legacy fallback 형태, route removal 수준, bypass 유지 방식)은 `docs/06-history/decisions.md`에 기록한다.
- 상세 실행 단위는 `.omx/plans/task-list-sprint-18-auth-email-otp-immediate-cutover.md`를 따른다.

# Done Criteria

- source-of-truth 문서가 OTP 기준으로 일관되며, magic link / nonce / `/auth/verify` 성공 경로를 canonical contract로 설명하지 않는다.
- 사용자는 이메일 입력 후 OTP 요청을 보내고, OTP 코드를 입력해 로그인한다.
- OTP verify 성공 시 기존과 동일하게 `name_required` 또는 `authenticated`로 진입한다.
- refresh / hard refresh / logout 후 재로그인 경로가 OTP 기준으로 terminal auth state에 수렴한다.
- 동일 이메일 재요청은 burst 5회까지 즉시 허용되고, 6번째부터 cooldown이 적용되며, countdown copy가 현재 계약과 일치한다.
- bypass / local auto-login / test harness가 필요 범위에서 regression 없이 유지된다.
- `verify-link`, `consume-link`, nonce lifecycle과 관련된 canonical runtime code가 제거되거나 old-link fallback 전용으로 축소된다.
- old `/auth/verify` 진입은 더 이상 로그인 성공을 시도하지 않고, 새 OTP 요청으로 유도하는 graceful fallback으로 동작한다.
- `POST /api/auth/request-otp` request/response contract가 planning/spec와 일치한다.
- 일반 OTP verify는 client-side `verifyOtp({ email, token, type: 'email' })`로 동작하고 별도 canonical verify API route를 사용하지 않는다.
- server-side resend/cooldown bookkeeping이 `app_metadata.nurimap_auth` 기준으로 정리되고 nonce/token_hash canonical state가 제거된다.
- old-link fallback은 query clear, email prefill, CTA label(`새 코드 받기`, `이메일 다시 입력`) 계약을 만족한다.
- automated tests, AI Agent interactive QA, browser QA 계획이 OTP 기준으로 갱신된다.
- live deployed email verification만 `qa.md`의 `User QA Required`에 명시적으로 남는다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - OTP request happy path
  - wrong / expired / generic failure path
  - resend burst 5회 + 6번째 cooldown + countdown formatting
  - session restore / hard refresh / logout 후 재로그인 convergence
  - `name_required` / `authenticated` branching 유지
  - bypass / local auto-login regression
  - old `/auth/verify` fallback 진입 시 새 OTP 요청 유도
  - `POST /api/auth/request-otp` route contract / bypass response shape / no canonical verify-route contract 확인
  - duplicated server boundary(`src/server/*`, `api/_lib/*`) contract alignment
- 실행 주체:
  - AI Agent
- 종료 기준:
  - `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authPolicy.test.ts src/server/authService.test.ts src/App.test.tsx`
  - 필요 시 관련 auth/API route 테스트 추가 후 `pnpm lint`
  - 필요 시 `pnpm build`

## AI Agent Interactive QA
- 대상 시나리오:
  - auth phase가 `auth_required -> otp_required -> verifying -> name_required|authenticated|auth_failure`로 설명 가능하게 수렴하는지 확인
  - OTP resend / error / countdown / fallback 카피가 source-of-truth와 일치하는지 확인
  - old magic link 진입이 blank screen이 아니라 fallback surface로 정리되는지 확인
  - session restore와 protected API access token contract가 유지되는지 코드 레벨로 대조
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 구현 diff와 실제 상태 전이가 planning/source-of-truth 기준으로 설명 가능하다.

## Browser Automation QA
- 대상 시나리오:
  - local/preview 환경에서 OTP 요청 화면, 코드 입력 화면, resend, cooldown, wrong/expired code UX 확인
  - refresh / hard refresh 유사 상황에서 terminal auth state 수렴 확인
  - old `/auth/verify` fallback entry 동작 확인
  - logout 후 재로그인 flow 확인
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright를 우선 사용해 주요 auth flow를 캡처하고 판정을 남긴다. Playwright가 실패하면 `agent-browser`를 다음 fallback으로 사용한다.
- 예상 증빙 경로:
  - `artifacts/qa/sprint-18/`

## User QA Required
- 사용자 확인 항목:
  - deployed 환경에서 실제 이메일로 OTP 수신 후 로그인되는지 확인
  - resend 이후 이전 코드가 의도한 UX로 처리되는지 확인
  - macOS 브라우저에서 hard refresh 후 auth가 terminal state로 수렴하는지 확인
- 기대 결과:
  - live deployed 환경에서도 OTP 요청/입력/로그인이 의도대로 동작한다.
  - old magic link 클릭 시 새 OTP 요청으로 자연스럽게 복귀한다.
  - hard refresh 후 `loading`/`verifying`에 무한 체류하지 않는다.
- handoff 조건:
  - automated / browser QA가 통과했고, live email delivery 및 deployed runtime confirmation만 사용자 확인으로 남는다.

# Active Changes

## CHG-01 Auth source-of-truth OTP cutover
- Why:
  - current live contract가 magic link + nonce + `/auth/verify`를 전제로 해서 구현과 QA를 계속 legacy path로 끌고 간다.
- Outcome:
  - auth spec / user-flow / design / architecture 문서를 OTP 중심 canonical contract로 재정렬한다.
- Touched Docs:
  - `docs/05-sprints/sprint-18/planning.md`
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/01-product/user-flows/auth-and-name-entry.md`
  - `docs/04-design/auth-and-name-entry.md`
  - `docs/02-architecture/security-and-ops.md`
  - `docs/02-architecture/system-runtime.md`
- Verify:
  - 문서 상호 참조와 acceptance criteria가 OTP 기준으로 일치하는지 검토
- Status: draft

## CHG-02 Server auth boundary immediate cutover
- Why:
  - auth policy는 유지해야 하지만, current server contract가 magic-link-specific helpers와 naming에 묶여 있다.
- Outcome:
  - server request path를 OTP 발송/정책 enforcement 중심으로 교체하고 verify/consume runtime을 제거한다.
- Touched Docs:
  - `docs/05-sprints/sprint-18/planning.md`
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/02-architecture/security-and-ops.md`
- Verify:
  - `src/server/authPolicy.test.ts`
  - `src/server/authService.test.ts`
  - 관련 API route tests
- Status: draft

## CHG-03 Client auth phase / UI / legacy cleanup
- Why:
  - current `AuthProvider`는 verify query parsing과 token-hash adoption에 강하게 묶여 있어 OTP cutover의 핵심 리스크 구간이다.
- Outcome:
  - OTP 입력 중심 auth phase와 UI로 교체하고 old `/auth/verify`는 fallback entry로 정리한다.
- Touched Docs:
  - `docs/05-sprints/sprint-18/planning.md`
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/01-product/user-flows/auth-and-name-entry.md`
  - `docs/04-design/auth-and-name-entry.md`
  - `docs/02-architecture/system-runtime.md`
- Verify:
  - `src/auth/AuthFlow.test.tsx`
  - `src/auth/authVerification.test.ts`
  - browser QA auth flow evidence
- Status: draft
