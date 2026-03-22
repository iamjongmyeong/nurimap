# Test Spec: Supabase Place/Auth Real-Data Migration

## Objective
Verify the migration from mock/frontend-direct Supabase flows to backend-owned auth/session and real Supabase-backed place/review persistence.

## References
- `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md`
- `.omx/plans/prd-supabase-place-auth-real-data-migration.md`
- `.omx/specs/deep-interview-supabase-place-data-integration.md`
- `src/auth/AuthProvider.tsx`
- `src/auth/authContext.ts`
- `src/app-shell/placeRepository.ts`
- `src/app-shell/mockPlaces.ts`
- `src/server/authService.ts`
- `src/server/placeEntryService.ts`
- `src/server/placeLookupService.ts`
- `api/auth/request-otp.ts`
- `api/place-entry.ts`
- `api/place-lookup.ts`
- `docs/02-architecture/system-runtime.md`
- `docs/02-architecture/domain-model.md`
- `docs/02-architecture/security-and-ops.md`
- `docs/03-specs/05-auth-email-login-link.md`
- `src/server/apiImportBoundary.test.ts`

## Verification Scope
- Backend-owned OTP request/verify/session bootstrap/logout/name-save flows
- Removal of direct frontend Supabase usage
- Removal of server-side publishable-key/browserless auth client usage from canonical runtime paths
- Migration-backed place/review persistence
- Empty-database browse/add/review behavior
- Recommendation retirement across code/docs/tests
- Environment separation and migration safety

## Automated Test Matrix
| Area | Assertion |
|---|---|
| Auth request | `POST /api/auth/request-otp` preserves domain restriction, cooldown, bypass rules |
| Auth verify | frontend no longer calls `supabaseBrowser.auth.verifyOtp`; backend verify endpoint issues an opaque app session cookie without browserless publishable-key auth client usage |
| Auth bootstrap | revisit/refresh restores authenticated state from `GET /api/auth/session` without direct Supabase session listeners |
| Name capture | name-required flow persists via backend endpoint, not `supabaseBrowser.auth.updateUser` |
| Logout | backend logout clears session and returns app to `auth_required` |
| Cookie contract | session cookie attributes (`HttpOnly`, `Path=/`, `SameSite=Lax`, `Secure` in prod, correct max-age) are asserted |
| CSRF posture | cookie-authenticated unsafe writes reject missing/invalid CSRF proof and bad Origin/Host |
| Empty DB browse | no mock places render by default; app shows a valid empty state |
| Place lookup | authenticated user can lookup a Naver place via backend API |
| Place create | backend validates input, geocodes, persists place, and returns canonical detail payload |
| Duplicate handling | duplicate place + review overwrite semantics match prior repository behavior |
| Review create/overwrite | one user per place review rule still holds; overwrite keeps prior content when content omitted |
| Recommendation retirement | recommendation UI/actions/types/docs are absent from live runtime path |
| Canonical backend layer | domain logic executes from `src/server/*`, while `api/_lib/*` remains a thin wrapper layer |
| Migration safety | migrations can apply cleanly in `dev` and `test` and do not target `production` during automated runs |

## Proposed Test Files
- `src/auth/AuthFlow.test.tsx`
- `src/server/authService.test.ts`
- `src/server/placeEntryService.test.ts`
- `src/server/placeLookupService.test.ts`
- `src/server/apiImportBoundary.test.ts`
- `src/app-shell/NurimapBrowse.test.tsx`
- `src/app-shell/NurimapDetail.test.tsx`
- `src/app-shell/PlaceLookupFlow.test.tsx`
- `src/app-shell/PlaceRegistrationFlow.test.tsx`
- `src/App.test.tsx`
- new API/integration tests for verify-session/logout/profile endpoints

## Static / Repo Checks
- `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/server/authService.test.ts src/server/placeEntryService.test.ts src/server/placeLookupService.test.ts src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/App.test.tsx`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `rg -n "@supabase/supabase-js|supabaseBrowser|verifyOtp\(|getSession\(|getUser\(|onAuthStateChange\(" src/auth src/app-shell src/App.tsx`
- `rg -n "createSupabaseBrowserlessClient|SUPABASE_PUBLISHABLE_KEY" src/server api/_lib api/auth`
- `rg -n "recommendation|recommendation_count|my_recommendation_active|recommendation_toggle|추천" src docs/00-governance docs/01-product docs/02-architecture docs/03-specs docs/04-design`

## AI Agent Interactive QA
- Explain how auth bootstrap works after the cookie cutover without any frontend Supabase listener.
- Explain how empty-state browse works when the DB starts empty.
- Explain how duplicate place/review overwrite rules are preserved after moving logic server-side.
- Explain how `dev / test / production` separation prevents OTP/data cross-contamination.

## Browser Automation QA
- `390x800` mobile auth request -> OTP verify -> name entry -> browse empty state -> add place -> view detail -> add/overwrite review
- `1280x900` desktop revisit with existing session cookie -> logout -> relogin
- capture evidence under `artifacts/qa/<new-sprint>/`

## Observability Checks
- Auth request accepted/failure/bypass/cooldown logs still classify correctly.
- Session issue/bootstrap/logout failures are visible in logs/telemetry.
- Place/review write failures are logged with masked user/email context.
- Migration target/environment is printed or otherwise recorded before destructive commands.
- CSRF rejection/origin rejection is visible enough to debug integration failures without leaking secrets.

## Risks To Watch
1. Cookie auth cutover leaves frontend stuck in wrong auth phase.
2. Duplicate/review overwrite semantics regress when moved out of mock repository logic.
3. Empty-state browse is under-tested because current UI assumed mock data.
4. Env misconfiguration sends test traffic to production.
5. Recommendation references linger in code/docs after runtime removal.
6. `api/_lib/*` accidentally remains a second source of truth after the cutover.

## Exit Signal
- Targeted tests pass
- lint/typecheck/build pass
- no live frontend Supabase usage remains
- no live recommendation runtime/doc references remain
- migration workflow works in `dev` and `test`
- sprint docs + QA evidence are updated for the new runtime contract
