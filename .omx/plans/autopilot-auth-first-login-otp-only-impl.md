# Autopilot Impl Plan: First-login OTP-only auth mail

## Execution Steps
1. Add an auth helper that ensures an allowed user exists and is email-confirmed before OTP send.
2. Switch OTP send to `shouldCreateUser: false` and reuse the prepared user for bookkeeping.
3. Mirror the same change in `api/_lib/_authService.ts`.
4. Update and extend `src/server/authService.test.ts` for first-login provisioning, existing-user OTP, and duplicate-create fallback.
5. Run focused auth tests, then build.
6. Run review/validation passes and summarize any remaining non-code dashboard follow-up.

## Success Criteria
- New allowed user receives standard OTP path behavior from server contract perspective.
- No auth regressions in request/verify tests.
- Build succeeds.
