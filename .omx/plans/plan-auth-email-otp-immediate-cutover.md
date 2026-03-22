# Auth Email OTP Immediate Cutover Sprint Plan

## Context
Nurimap의 현재 인증은 Supabase magic link + app-managed nonce wrapper + `/auth/verify` verify entry를 중심으로 동작한다. 이 계획의 목표는 이 계약을 **6자리 email OTP 기반 canonical auth flow**로 완전 교체하는 것이다. 이번 Sprint는 임시 dual support가 아니라 즉시 컷오버를 전제로 하며, live deployed email end-to-end 확인은 `User QA Required` handoff로 남길 수 있다.

> Inference: `docs/05-sprints/`에는 현재 `sprint-12`~`sprint-17`만 존재하므로 다음 번호는 18일 가능성이 높다. 다만 `.omx/plans/`에 이미 `sprint-18-supabase-rollout` 관련 draft가 있어, numbering 충돌을 피하려고 우선 unnumbered plan artifact로 저장한다.

## Work Objectives
- magic link / nonce / `/auth/verify` 로그인 성공 경로를 제거하고 OTP를 canonical auth flow로 만든다.
- allowed domain, resend policy, bypass, session persistence, name-required flow, protected API contract는 유지한다.
- source-of-truth 문서, 테스트, QA 계획을 OTP 기준으로 재정렬한다.

## Guardrails

### Must Have
- OTP가 canonical auth flow여야 한다.
- server boundary는 auth request policy(allowed domain, cooldown/burst, bypass, ops logging)를 계속 소유해야 한다.
- client는 OTP 입력/재전송/오류/timeout을 명시적으로 다뤄야 한다.
- name-required, session restore, access token 기반 보호 API 사용은 regression 없이 유지해야 한다.
- old magic-link entry는 로그인 성공 경로가 아니어야 하며, 남긴다면 새 OTP 요청으로 유도하는 graceful fallback만 허용한다.
- duplicated auth boundary(`src/server/*`, `api/_lib/*`)는 함께 갱신해야 한다.

### Must NOT Have
- magic link dual support 유지
- custom OTP DB / 직접 코드 생성 시스템 도입
- 외부 auth provider 교체
- live deploy verification이 끝나기 전까지 완료 보고 금지 같은 과도한 exit criteria
- misleading naming 유지 (`request-link`가 실제로 OTP 발송을 계속 숨기는 상태로 장기 존치)

## Scope
### In Scope
- auth source-of-truth OTP cutover
- server request boundary rename/rework (`request-otp` 중심)
- client auth phase/UI/state machine replacement
- legacy magic-link runtime cleanup
- OTP 기준 automated/browser/user QA plan

### Out Of Scope
- Clerk 등 provider migration
- custom auth storage 구축
- browse/detail/map unrelated redesign
- live production e2e mail verification 자동 완료

## Task Flow (5 Steps)

### 1. Source-of-truth를 OTP 계약으로 먼저 재작성한다
**Why:** 이 Sprint는 full cutover라서 문서 계약이 먼저 고정되지 않으면 구현이 magic-link 잔재를 계속 남긴다.

**TODO**
- auth spec를 OTP 중심 live contract로 교체한다.
- user flow / design / security/runtime 문서에서 `magic link`, `nonce`, `/auth/verify` 기반 성공 경로를 제거하거나 legacy fallback로만 재정의한다.
- `auth_link_sent` / `auth_link_verify` 같은 상태 모델을 OTP에 맞게 `otp_required` 중심으로 재설계한다.
- legacy `/auth/verify`는 더 이상 verify success route가 아니라, old link fallback entry로 처리한다는 계약을 명시한다.

**Acceptance Criteria**
- selected docs 사이에 `nonce` 또는 `verify-link/consume-link`를 canonical contract로 설명하는 문장이 남아 있지 않다.
- docs만 읽어도 OTP happy path, resend, wrong/expired code, fallback behavior를 설명할 수 있다.
- full cutover / immediate cutover / User QA handoff가 문서상 명시돼 있다.

**Likely touched files**
- `docs/03-specs/05-auth-email-login-link.md` 또는 its renamed replacement
- `docs/01-product/user-flows/auth-and-name-entry.md`
- `docs/04-design/auth-and-name-entry.md`
- `docs/02-architecture/security-and-ops.md`
- `docs/02-architecture/system-runtime.md`

---

### 2. Server auth boundary를 OTP request 중심으로 교체한다
**Why:** policy enforcement를 client로 흘리면 현재 auth hardening 자산(allowed domain, cooldown, bypass, ops logs)을 잃는다.

**TODO**
- `requestLoginLink()`를 대체하는 OTP request flow를 도입한다.
- `/api/auth/request-link`를 장기 존치하지 말고 `/api/auth/request-otp` 중심으로 바꾼다.
- magic-link-specific state(`active_nonce`, `active_token_hash`, `active_verification_type`, `last_consumed_nonce`)와 verify/consume helpers를 제거한다.
- `src/server/*`와 `api/_lib/*` duplicated boundary를 함께 정리한다.
- bypass/local auto-login이 필요한 경우 기존 `requireBypass` semantics를 보존한다.

**Acceptance Criteria**
- server layer에서 더 이상 `generateLink({ type: 'magiclink' })`, `verifyLoginLink`, `consumeLoginLink`를 canonical path로 사용하지 않는다.
- allowed domain, cooldown/burst, delivery failure, bypass 관련 regression tests가 OTP flow 기준으로 통과한다.
- auth request route 이름/응답 계약이 실제 동작을 거짓말하지 않는다.

**Likely touched files**
- `src/server/authService.ts`
- `src/server/authPolicy.ts`
- `src/server/authService.test.ts`
- `src/server/authPolicy.test.ts`
- `api/auth/request-link.ts` (remove or replace)
- `api/auth/request-otp.ts` (new)
- `api/auth/verify-link.ts` (delete)
- `api/auth/consume-link.ts` (delete)
- `api/_lib/_authService.ts`
- `api/_lib/_authPolicy.ts`

---

### 3. Client auth state machine과 UI를 OTP 중심으로 교체한다
**Why:** 현재 `AuthProvider`는 verify query parsing과 token-hash adoption에 강하게 묶여 있어서, OTP cutover의 핵심 위험 구간이다.

**TODO**
- `AuthPhase`를 OTP 기준으로 재정의한다 (`auth_required`, `otp_required`, `verifying`, `auth_failure`, `name_required`, `authenticated`).
- 이메일 입력 후 OTP 코드 입력 UI, resend, cooldown 카피, wrong/expired/general failure를 구현한다.
- `getVerifyEntryFromLocation`, `clearAuthEntryUrl`, `/api/auth/verify-link`, `/api/auth/consume-link` 의존을 제거한다.
- `supabaseBrowser.auth.verifyOtp({ email, token, type: 'email' })` 기반 세션 채택으로 바꾼다.
- session restore, refresh/hard refresh terminal convergence, name-required flow는 유지한다.

**Acceptance Criteria**
- 사용자는 이메일 요청 → OTP 입력 → 성공 시 authenticated/name_required로 진입한다.
- refresh / hard refresh / logout -> relogin 경로가 OTP 기준으로 terminal state에 수렴한다.
- old verify query 때문에 `verifying`에 갇히는 흐름이 사라진다.
- bypass/local auto-login regression이 없다.

**Likely touched files**
- `src/auth/AuthProvider.tsx`
- `src/auth/authContext.ts`
- `src/auth/authVerification.ts`
- `src/auth/AuthFlow.test.tsx`
- `src/auth/authVerification.test.ts`
- `src/auth/testAuthState.ts`

---

### 4. Legacy magic-link runtime과 route 흔적을 정리한다
**Why:** 즉시 컷오버인데 legacy path가 canonical contract처럼 남아 있으면 운영과 코드 품질 둘 다 나빠진다.

**TODO**
- `/auth/verify`를 active login success route에서 제거한다.
- 기존 email+nonce 링크는 login success를 시도하지 않고, 새 OTP 요청으로 안내하는 graceful fallback으로 한정한다.
- runtime docs / routing tests / QA scripts에서 magic-link assumptions를 제거한다.
- old route/API 삭제 후 dead code, dead copy, dead tests를 정리한다.

**Acceptance Criteria**
- codebase에서 `nonce` 기반 auth verification이 더 이상 canonical runtime으로 남아 있지 않다.
- `/auth/verify`가 존재하더라도 old-link fallback만 수행하고 로그인 성공 경로가 아니다.
- 관련 테스트와 artifacts가 OTP 기준으로 설명 가능하다.

**Likely touched files**
- `src/App.tsx` / route bridge files if needed
- `docs/02-architecture/system-runtime.md`
- browser QA scripts under `artifacts/qa/` if auth-specific
- legacy auth route handling code/tests

---

### 5. OTP 기준 verification과 Sprint QA handoff를 완성한다
**Why:** 이 Sprint는 deployed email check를 handoff로 남길 수 있지만, 그 전까지의 verification은 더 엄격해야 한다.

**TODO**
- OTP happy path / wrong code / expired code / resend cooldown / terminal convergence 테스트를 추가한다.
- browser automation 시나리오를 OTP 기준으로 바꾼다.
- User QA Required에 live deployed email receive + OTP 입력 확인만 남긴다.
- review 문서에 제거된 legacy contract와 남은 follow-up을 기록한다.

**Acceptance Criteria**
- automated checks가 OTP contract 기준으로 통과한다.
- AI agent interactive QA가 OTP UI/state/runtime을 설명 가능하다.
- browser QA evidence가 남고, live deployed email verification은 handoff 상태로 명확히 분리된다.

**Suggested verification set**
- `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authPolicy.test.ts src/server/authService.test.ts src/App.test.tsx`
- `pnpm lint`
- 필요 시 `pnpm build`

## Risks and Mitigations
- **Risk:** OTP 전환 중 bypass/local auto-login이 깨질 수 있다.  
  **Mitigation:** bypass semantics를 explicit non-goal/non-regression으로 문서와 테스트에 포함한다.
- **Risk:** `/auth/verify` 제거가 old email clicks를 UX dead-end로 만들 수 있다.  
  **Mitigation:** login support는 제거하되, explicit fallback message로 새 OTP 요청을 유도한다.
- **Risk:** duplicated server boundary 중 한쪽만 수정돼 Vercel/runtime mismatch가 날 수 있다.  
  **Mitigation:** `src/server/*` + `api/_lib/*`를 한 change set으로 묶고 짝 테스트를 유지한다.
- **Risk:** deployed live email는 preview/local과 다를 수 있다.  
  **Mitigation:** Sprint exit criteria에서 `User QA Required` handoff를 명시하되, browser QA/preview evidence를 먼저 충분히 남긴다.

## Execution Notes For AI Agents
- 구현 전에 **문서 계약부터 고정**한다. 이 Sprint는 source-of-truth 변경이 핵심이다.
- auth changes는 항상 `src/server/*`와 `api/_lib/*` duplicated boundary를 같이 다룬다.
- magic-link 삭제는 client OTP flow와 server OTP request flow가 green 상태가 된 뒤에 진행한다.
- PR 단위가 아니라 **작업 안정 단위**로 진행한다: doc contract -> server -> client -> cleanup -> verification.
- 각 단계 종료 시 앱이 동작 가능해야 하고, rollback point를 유지한다.

## Success Criteria
- OTP가 Nurimap의 유일한 canonical auth login flow가 된다.
- magic-link verify runtime은 제거되거나 old-link fallback으로만 축소된다.
- source-of-truth docs, tests, QA plan이 OTP 기준으로 일관된다.
- live deployed email verification만 `User QA Required`로 남고 나머지는 AI agent가 자율적으로 실행 가능하다.
