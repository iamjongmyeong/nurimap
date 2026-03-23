# Plan: Fix production DB TLS verification with Supabase root certificate

## Requirements Summary
- Production `POST /api/auth/verify-otp` currently fails after OTP verification when the app enters the DB transaction path.
- Verified production evidence:
  - latest live deployments return `500`
  - Vercel runtime logs show `SELF_SIGNED_CERT_IN_CHAIN`
  - stack points to:
    - `api/_lib/_database.ts:71`
    - `api/_lib/_authService.ts:582`
    - `api/auth/verify-otp.ts:28`
- Current DB SSL behavior is hard-coded to `rejectUnauthorized: true` for any non-local host:
  - `src/server/database.ts:36-57`
  - `api/_lib/_database.ts:36-57`
- Supabase docs indicate verified SSL connections require the root certificate to be provided alongside strict verification:
  - https://supabase.com/docs/guides/database/psql
  - https://supabase.com/docs/guides/database/pgadmin

## Goal
- Keep strict TLS verification for production DB connections **without** disabling certificate verification.
- Make production `verify-otp` and any other DB-backed server routes work against Supabase using an explicit root certificate input.

## Acceptance Criteria
- `src/server/database.ts` and `api/_lib/_database.ts` support a root-certificate env input for Postgres TLS.
- When a non-local DB connection string is used and the root cert env is present, `pg` receives:
  - `rejectUnauthorized: true`
  - `ca: <root certificate>`
- Local dev behavior remains unchanged (no cert required for localhost/local Supabase).
- Missing DB connection string behavior remains unchanged.
- Existing tests still pass, and new tests cover the root-cert SSL config behavior.
- After rollout, production `/api/auth/verify-otp` no longer fails with `SELF_SIGNED_CERT_IN_CHAIN`.

## Files To Touch
### Required code files
1. `src/server/database.ts`
2. `api/_lib/_database.ts`

### Required tests
3. `src/server/database.test.ts`
4. If mirrored API-layer tests exist or are needed for coverage symmetry, consider:
   - `src/server/releaseHardening.test.ts` only if env expectations need updating

### Optional docs / sprint sync
5. `docs/05-sprints/sprint-20/qa.md`
6. `docs/05-sprints/sprint-20/review.md`

## Implementation Steps
1. **Add explicit DB root-cert env support**
   - In `src/server/database.ts` and `api/_lib/_database.ts`, introduce a helper that reads a root-certificate env, e.g.:
     - `DATABASE_SSL_ROOT_CERT`
     - fallback option if needed: `SUPABASE_DB_ROOT_CERT`
   - Normalize escaped newlines (`\\n`) into actual PEM newlines if stored as a single-line env value.

2. **Build SSL config from connection + cert**
   - Keep current local-host bypass behavior:
     - localhost / 127.0.0.1 => no SSL config
   - For non-local DBs:
     - if root cert env exists:
       - return `{ rejectUnauthorized: true, ca: normalizedCert }`
     - if root cert env is missing:
       - keep current behavior temporarily, but make the code path explicit and testable
   - Do **not** switch to `rejectUnauthorized: false` in this plan.

3. **Add focused tests**
   - Extend `src/server/database.test.ts` to prove:
     - local URL => no SSL
     - remote URL without cert => current fallback behavior
     - remote URL with root cert env => SSL config includes `ca` and `rejectUnauthorized: true`
     - newline normalization works

4. **Verify affected auth path indirectly**
   - Run auth route tests to ensure no regression in `verify-otp` logic:
     - `src/server/authService.test.ts`
     - `src/server/apiAuthVerifyOtp.test.ts`
     - `src/server/releaseHardening.test.ts`

5. **Production rollout / verification**
   - Add the chosen root-cert env to Vercel Production as a sensitive secret.
   - Redeploy.
   - Verify latest production logs no longer show `SELF_SIGNED_CERT_IN_CHAIN` for `/api/auth/verify-otp`.

## Risks And Mitigations
- **Risk:** PEM certificate formatting breaks when pasted into Vercel env.  
  **Mitigation:** support `\\n` -> newline normalization and document expected format.
- **Risk:** mirrored `api/_lib/_database.ts` diverges from `src/server/database.ts`.  
  **Mitigation:** update both in the same change and diff them together.
- **Risk:** production still fails for a reason other than TLS chain verification.  
  **Mitigation:** after redeploy, immediately re-check latest deployment logs for `/api/auth/verify-otp`.

## Verification Steps
- `pnpm exec vitest run src/server/database.test.ts`
- `pnpm exec vitest run src/server/authService.test.ts src/server/apiAuthVerifyOtp.test.ts src/server/releaseHardening.test.ts`
- `pnpm exec tsc --noEmit --pretty false --project tsconfig.json`
- `pnpm exec eslint src/server/database.ts api/_lib/_database.ts src/server/database.test.ts`
- Production post-rollout:
  - `vercel logs --deployment <latest> --query "/api/auth/verify-otp" --since 10m --no-follow`

## Decision
- Preferred fix: **strict TLS with explicit Supabase root certificate**
- Rejected for this slice: disabling TLS verification (`rejectUnauthorized: false`) as a first response
