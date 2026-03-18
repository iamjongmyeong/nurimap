# Verification Scope

- Sprint 18의 검증 범위는 **magic link 제거 + email OTP immediate cutover**다.
- 이번 검증에서 실제로 확인한 항목:
  - OTP request / verify happy path
  - wrong code / expired code / generic failure
  - resend burst 5회 + cooldown formatting
  - `name_required` / `authenticated` branching 유지
  - refresh / hard refresh / logout 후 재로그인 convergence
  - old `/auth/verify` fallback UX
  - bypass / local auto-login / protected API auth contract regression
- live deployed email verification은 이 문서의 `## User QA Required`에 handoff로 남긴다.

# Automated Checks Result

- 실행 명령:
  - `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authPolicy.test.ts src/server/authService.test.ts src/App.test.tsx`
  - `pnpm lint`
  - `pnpm build`
- 결과:
  - PASS — `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authPolicy.test.ts src/server/authService.test.ts src/App.test.tsx` → `Test Files 5 passed (5)`, `Tests 48 passed (48)`
  - PASS — `pnpm exec vitest run` → `Test Files 17 passed (17)`, `Tests 144 passed (144)`
  - PASS — `pnpm lint` exit `0`
  - PASS — `pnpm build` completed (`vite build` success)

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - Sprint 18 planning/spec/user-flow/design/runtime contract와 구현 diff를 직접 대조했다.
  - `POST /api/auth/request-otp`, client-side `verifyOtp({ email, token, type: 'email' })`, bypass 예외 경로, old `/auth/verify` fallback, session restore, `name_required` 진입을 코드 레벨로 점검했다.
- 결과:
  - PASS — 구현된 auth phase와 서버/클라이언트 contract는 Sprint 18 planning 및 selected spec과 일치한다.
  - PASS — canonical normal verify route 없이 client-side OTP verify로 수렴하고, legacy `verify-link` / `consume-link`는 fallback-only 410 route로 축소되었다.

## Browser Automation QA Evidence
- 실행 목적:
  - local/preview 환경에서 OTP request / input / resend / failure / old-link fallback / terminal convergence를 확인한다.
- 실행 명령 또는 스크립트:
  - 아직 실행하지 않음
- 확인한 시나리오:
  - pending
- 판정:
  - pending
- 스크린샷 경로:
  - `artifacts/qa/sprint-18/` 예정

## User QA Required
- 사용자 확인 항목:
  - deployed 환경에서 실제 이메일로 OTP 수신 후 로그인되는지 확인
  - resend 이후 이전 코드 처리 UX 확인
  - old magic link 클릭 시 새 OTP 요청으로 복귀하는지 확인
  - hard refresh 후 auth가 terminal state로 수렴하는지 확인
- 기대 결과:
  - live deployed 환경에서도 OTP 인증이 정상 동작하고, old link는 fallback UX로 정리된다.
- 상태:
  - pending

# Issues Found

- browser automation evidence는 아직 수집하지 않았다.
- live deployed email/OTP smoke test는 아직 사용자 확인이 필요하다.

# QA Verdict

- CONDITIONAL PASS — 코드/테스트/빌드 기준 구현은 통과했다.
- 남은 종료 조건은 browser automation evidence와 사용자 직접 QA handoff다.

# Follow-ups

- browser automation으로 OTP request / verify / old-link fallback 시나리오를 캡처한다.
- live deployed email verification 결과를 사용자 QA handoff로 수집한다.

# Change Verification

## CHG-01 Auth source-of-truth OTP cutover
- Automated:
  - PASS — `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authPolicy.test.ts src/server/authService.test.ts src/App.test.tsx`
- Manual / Browser:
  - PASS — AI Agent Interactive QA
  - Browser pending
- Evidence:
  - OTP contract docs + implementation diff aligned
- Verdict:
  - PASS (browser evidence pending)

## CHG-02 Server auth boundary immediate cutover
- Automated:
  - PASS — `src/server/authPolicy.test.ts`, `src/server/authService.test.ts`
- Manual / Browser:
  - PASS — AI Agent Interactive QA
  - Browser pending
- Evidence:
  - `request-otp` route, OTP-era metadata state, verify/consume legacy fallback route 확인
- Verdict:
  - PASS (browser evidence pending)

## CHG-03 Client auth phase / UI / legacy cleanup
- Automated:
  - PASS — `src/auth/AuthFlow.test.tsx`, `src/auth/authVerification.test.ts`, `src/App.test.tsx`
- Manual / Browser:
  - PASS — AI Agent Interactive QA
  - Browser pending
- Evidence:
  - `auth_required -> otp_required -> verifying -> auth_failure|name_required|authenticated` 흐름과 old-link fallback 동작 확인
- Verdict:
  - PASS (browser evidence pending)
