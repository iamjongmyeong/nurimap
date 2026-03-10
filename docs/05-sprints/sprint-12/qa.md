# Verification Scope

- Date: 2026-03-10
- Sprint: Sprint 12 auth login fix and UX simplification
- Source of truth checked in this review: `docs/05-sprints/sprint-12/planning.md`, `docs/03-specs/05-auth-email-login-link.md`, `docs/01-product/user-flows/auth-and-name-entry.md`, `docs/04-design/auth-and-name-entry.md`
- Implementation reviewed: `src/auth/AuthProvider.tsx`, `src/auth/testAuthState.ts`, `src/auth/AuthFlow.test.tsx`, `src/server/authService.ts`, `api/_lib/_authService.ts`, `src/server/authPolicy.test.ts`, `src/server/authService.test.ts`, `src/server/releaseHardening.test.ts`
- Goal of this QA pass: verify the landed Sprint 12 auth FE/BE changes, capture the explicit backend `PUBLIC_APP_URL` behavior, and record the latest auth-focused evidence.

# Automated Checks Result

- PASS — `npx tsc --noEmit`
- PASS — `npx eslint src/auth/AuthProvider.tsx src/auth/AuthFlow.test.tsx src/auth/testAuthState.ts src/server/authService.ts src/server/authService.test.ts src/server/authPolicy.test.ts api/auth/request-link.ts api/auth/verify-link.ts api/_lib/_authService.ts`
- PASS — `npm run test:run -- src/auth/AuthFlow.test.tsx src/server/authPolicy.test.ts src/server/authService.test.ts src/server/releaseHardening.test.ts`
  - Result: `4` test files, `31` tests passed.
  - Included evidence points:
    - FE Sprint 12 auth shell/tests pass (`src/auth/AuthFlow.test.tsx`, `13` tests)
    - auth policy rules pass (`src/server/authPolicy.test.ts`, `7` tests)
    - BE Sprint 12 auth email/env handling tests pass (`src/server/authService.test.ts`, `5` tests)
    - release-hardening regression checks still pass (`src/server/releaseHardening.test.ts`, `6` tests)

# Manual QA Result

- PENDING — This worker session did not run live email delivery / Supabase auth / browser manual QA.
- Static + automated verification confirms:
  - FE now matches the Sprint 12 auth shell contract (`NURIMAP LOGIN`, hidden visual label with accessible label, `example@nurimedia.co.kr` placeholder, `이메일로 로그인 링크 전송`, same-shell sent state with requested email).
  - BE now sends the Sprint 12 email subject/body template and has explicit handling for missing/invalid `PUBLIC_APP_URL`.
  - Missing/invalid `PUBLIC_APP_URL` now returns the existing `delivery_failed` error instead of generating or emailing a broken wrapper link.

# Issues Found

1. No failing automated auth checks remain in the focused verification set.
2. Live manual QA is still outstanding for:
   - real email subject/body rendering,
   - actual login-link origin in delivered mail,
   - email button click and raw URL fallback,
   - successful auth into name-required onboarding when applicable.

# QA Verdict

- Automated auth-focused verification: PASS
- Overall Sprint 12 auth QA: PENDING manual verification
- Reason: the landed FE/BE changes and focused test suite are green, but the Sprint QA plan still requires real email-delivery and login-link manual checks.

# Follow-ups

- Run live manual QA for:
  - email subject/body rendering,
  - actual login-link origin,
  - email button click and raw URL fallback,
  - name-required onboarding after successful auth.
- Once manual QA is complete, append concrete runtime evidence here.
- Decision log added: `docs/06-history/decisions.md` entry for explicit missing/invalid `PUBLIC_APP_URL` behavior.
