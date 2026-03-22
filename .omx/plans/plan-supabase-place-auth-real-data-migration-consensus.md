# Supabase Place/Auth Real-Data Migration Consensus Plan

## Readiness Assessment

### Planning Readiness — Ready
- Deep-interview artifacts exist and pin the scope, constraints, auth/session contract, recommendation retirement decision, and environment strategy (`.omx/specs/deep-interview-supabase-place-data-integration.md`).
- The codebase already shows the three main migration seams: mock place/review repository state in `src/app-shell/placeRepository.ts:1-95`, direct frontend Supabase auth usage in `src/auth/supabaseBrowser.ts:1-22` and `src/auth/AuthProvider.tsx:521-910`, and backend OTP/place entry boundaries in `src/server/authService.ts:1-260`, `api/auth/request-otp.ts:1-24`, `api/place-entry.ts:1-53`, and `api/place-lookup.ts:1-40`.

### Development Readiness — Ready With Deliberate Sequencing
- The repository already has server-side seams for OTP request, place lookup, and place-entry validation, so the migration can extend existing boundaries rather than introducing a totally new runtime (`src/server/authService.ts:1-260`, `src/server/placeEntryService.ts:114-174`, `src/server/placeLookupService.ts:111-160`).
- However, current source-of-truth docs still explicitly assume client-side `verifyOtp(...)` and browser-stored Supabase session persistence (`docs/02-architecture/system-runtime.md:177-184`, `docs/02-architecture/security-and-ops.md:53-73`, `docs/03-specs/05-auth-email-login-link.md:70-77,109-110`), so docs and runtime must be re-locked before implementation.

### QA Readiness — Needs Expanded Coverage
- This change crosses auth, migrations, server APIs, frontend state, and docs; it needs deliberate-mode coverage across unit, integration, e2e, and observability, not just existing Vitest happy paths.

## Requirements Summary
- Replace mock place/review data with real Supabase-backed persistence while preserving the external architecture contract `Frontend -> Backend -> Supabase` and removing direct frontend Supabase usage (`src/app-shell/mockPlaces.ts:8-149`, `src/app-shell/placeRepository.ts:1-220`, `src/auth/supabaseBrowser.ts:1-22`).
- Keep email OTP as the canonical login UX, but move OTP verify/session adoption behind backend-issued app session cookies instead of client-side Supabase auth state (`src/auth/AuthProvider.tsx:797-853`, `docs/02-architecture/system-runtime.md:177-184`, `docs/02-architecture/security-and-ops.md:53-60`).
- Phase 1 functional scope is limited to place list/detail read, place create, and review create/overwrite; recommendation UI and recommendation logic are removed in this phase (`src/app-shell/mockPlaces.ts:22-23,61-62,94-95,118-119,136-137`, `src/app-shell/placeRepository.ts:84-95`, `.omx/specs/deep-interview-supabase-place-data-integration.md`).
- Start with an empty database and formalize environment separation as `dev / test / production`, with `test` intentionally isolated because auth/data tests mutate state heavily (`docs/02-architecture/security-and-ops.md:31-60`, `.omx/specs/deep-interview-supabase-place-data-integration.md`).
- All schema changes must go through migration files, no frontend Supabase client may remain in business flows, and backend code must keep repository/service seams so later DB replacement remains possible (`docs/02-architecture/system-runtime.md:106-120`, `.omx/specs/deep-interview-supabase-place-data-integration.md`).
- The current server-side publishable-key path (`src/server/supabaseAdmin.ts:15-21`, `api/_lib/_supabaseAdmin.ts:15-21`, `src/server/authService.ts:55-56,241-253`) is explicitly out of bounds for the cutover; canonical Supabase access must use service-role-capable backend-only clients/adapters.

## RALPLAN-DR Summary

### Mode
- DELIBERATE

### Principles
1. **Backend-owned trust boundary** — frontend never talks to Supabase directly for auth or business persistence.
2. **Adapter-first migration** — replace mock/runtime seams behind repositories and API contracts before UI rewrites.
3. **Contract-preserving UX** — keep the current OTP user experience and 90-day same-browser session behavior while changing the implementation boundary.
4. **Docs/migrations/tests lockstep** — source-of-truth docs, schema migrations, and verification artifacts move together.
5. **Scope discipline** — phase 1 ships place read/create + review write; recommendation is explicitly retired from current runtime scope.

### Decision Drivers
1. Remove direct frontend Supabase dependency without breaking the existing auth and app-shell UX.
2. Introduce durable DB persistence and session boundaries safely across auth + place/review flows.
3. Keep the codebase evolvable by isolating Supabase behind backend repository/service layers instead of smearing provider details into UI state.

### Viable Options

#### Option A — Adapter-first incremental backend cutover (Recommended)
**Approach:** add migrations + repository/service layers, move auth verify/session to backend cookie endpoints, then swap frontend mock/auth consumers to backend APIs.

**Pros**
- Best matches the mandated `Frontend -> Backend -> Supabase` contract.
- Reuses existing server seams (`api/auth/request-otp.ts:1-24`, `api/place-entry.ts:1-53`, `api/place-lookup.ts:1-40`) instead of forcing a big-bang rewrite.
- Lets docs/tests/migrations progress in bounded phases.

**Cons**
- Requires short-term dual-path cleanup while old mock/auth code is being retired.
- Introduces more files (migration SQL, cookie/session endpoints, repositories) before the UI visibly changes.

#### Option B — Big-bang runtime rewrite
**Approach:** replace auth, place, review, and recommendation codepaths all at once with new DB-backed services and a new frontend integration layer.

**Pros**
- Minimizes temporary compatibility glue.
- May reduce total refactor churn if it lands perfectly in one pass.

**Cons**
- Highest risk for auth/session regressions and incomplete test coverage.
- Makes it much harder to isolate whether failures come from migrations, cookie auth, or place/review repository changes.
- Contradicts the repo’s preference for source-of-truth + verification sequencing on broad work.

#### Invalidated Alternative — Custom auth engine now
- Rejected by user during deep interview: this is a solo side project with no DB migration plan, so custom OTP/auth ownership adds cost without enough payoff.

### Recommendation
- **Choose Option A**: adapter-first incremental backend cutover.

### Alternative Invalidation Rationale
- Option B is still technically viable, but it couples the riskiest subproblems (auth, cookie sessions, migrations, repository swap, recommendation retirement) into a single blast radius.
- The custom-auth alternative was explicitly rejected by the user during deep interview, so it should not be revived inside this plan.

## Work Plan

### Step 1. Re-lock source-of-truth docs and planning artifacts for the new runtime contract
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/docs/02-architecture/system-runtime.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/02-architecture/domain-model.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/02-architecture/security-and-ops.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/03-specs/05-auth-email-login-link.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/03-specs/08-place-registration.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/03-specs/09-place-merge.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/03-specs/10-review.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/01-product/user-flows/auth-and-name-entry.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/01-product/user-flows/review.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/04-design/auth-and-name-entry.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/04-design/browse-and-detail.md`
- `/Users/jongmyeong/dev/projects/nurimap/docs/01-product/product-overview.md`
- `/Users/jongmyeong/dev/projects/nurimap/.omx/plans/prd-supabase-place-auth-real-data-migration.md`
- `/Users/jongmyeong/dev/projects/nurimap/.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`

**Acceptance Criteria**
- Current direct-client verify/session language is removed or replaced: `docs/02-architecture/system-runtime.md:177-184`, `docs/02-architecture/security-and-ops.md:53-60`, and `docs/03-specs/05-auth-email-login-link.md:70-77,109-110` no longer prescribe frontend `verifyOtp(...)` or browser-stored Supabase sessions.
- `docs/02-architecture/domain-model.md` is updated so phase-1 canonical entities reflect app-owned session rows and recommendation retirement without keeping recommendation-derived fields as live runtime requirements.
- `docs/02-architecture/security-and-ops.md:69-73` no longer says “DB 레벨에서는 RLS를 전제로 한다” as the canonical authorization rule; it is revised to “backend authorization/business logic is canonical, RLS is optional defense-in-depth only.”
- A new sprint execution brief is created under the next available `docs/05-sprints/sprint-XX/` folder before implementation begins, so the repo’s sprint-ready gate is satisfied.
- Recommendation live-doc contracts are retired or updated consistently with the already-approved “remove recommendation UI/logic” decision, reusing the cleanup map in `.omx/plans/plan-retire-recommendation-docs-only.md:1-205` where helpful.
- PRD and test-spec artifacts exist in `.omx/plans/` so the Ralph planning gate can pass.

### Step 2. Introduce backend persistence and session foundations behind repository/service seams
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/supabase/migrations/*.sql` (new)
- `/Users/jongmyeong/dev/projects/nurimap/src/server/supabaseAdmin.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/server/authService.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/server/placeEntryService.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/server/placeLookupService.ts`
- `/Users/jongmyeong/dev/projects/nurimap/api/_lib/_authService.ts`
- `/Users/jongmyeong/dev/projects/nurimap/api/_lib/_placeEntryService.ts`
- `/Users/jongmyeong/dev/projects/nurimap/api/_lib/_placeLookupService.ts`
- new backend repository/session files under `/Users/jongmyeong/dev/projects/nurimap/src/server/` and `/Users/jongmyeong/dev/projects/nurimap/api/_lib/`

**Acceptance Criteria**
- Migration files create the minimum phase-1 persistence model for users/profile linkage, places, reviews, and opaque app-session storage; no manual dashboard edits are required.
- `src/server/*` is the canonical business/domain layer for the cutover, while `api/_lib/*` is demoted to Vercel-boundary wrappers/re-exports only; new domain logic must not be duplicated in both trees.
- Backend repository/service boundaries encapsulate Supabase access so feature code does not depend on raw query shapes outside server adapters.
- `createSupabaseBrowserlessClient` is retired from auth/business paths; backend provider access uses only service-role-capable admin clients and/or a server-only Postgres connection for transactional app data.
- Before implementation begins, the backend-only OTP request/verify path is checked once against current official Supabase docs so the service-role-only boundary is feasible; if the provider contract conflicts, execution pauses for an explicit design decision rather than silently reintroducing publishable-key usage.
- Place write semantics preserve existing validation/geocode/duplicate-review rules currently expressed in `src/server/placeEntryService.ts:114-174` and `src/app-shell/placeRepository.ts:167-220`.
- Place create + initial review create and duplicate-place merge + review overwrite run inside one backend Postgres transaction using a server-only transaction client (for example `pg`/`postgres` over a backend secret connection), not Supabase RPC.
- OTP verify + session issuance uses a two-stage backend flow: (1) verify OTP with the backend auth adapter, then (2) in one app-DB transaction upsert user/profile state, rotate or insert the opaque `app_session` row, and write auth/audit metadata; the HTTP session cookie is set only after that transaction commits.
- Environment config clearly distinguishes `dev`, `test`, and `production`, and test data/auth state cannot write into production.

### Step 3. Move OTP verify/bootstrap/logout/name flows from frontend Supabase to backend cookie APIs
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/src/auth/supabaseBrowser.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/auth/AuthProvider.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/auth/authContext.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/server/authService.ts`
- `/Users/jongmyeong/dev/projects/nurimap/api/auth/request-otp.ts`
- new endpoints such as `/Users/jongmyeong/dev/projects/nurimap/api/auth/verify-otp.ts` (new), `/Users/jongmyeong/dev/projects/nurimap/api/auth/session.ts` (new), `/Users/jongmyeong/dev/projects/nurimap/api/auth/logout.ts` (new), `/Users/jongmyeong/dev/projects/nurimap/api/auth/profile.ts` (new) — names may vary but the new endpoint set must be explicit in implementation
- `/Users/jongmyeong/dev/projects/nurimap/src/auth/AuthFlow.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/server/authService.test.ts`

**Acceptance Criteria**
- `src/auth/AuthProvider.tsx:521-910` no longer calls `supabaseBrowser.auth.verifyOtp/getSession/getUser/signOut/updateUser/onAuthStateChange` directly.
- Frontend auth context stops depending on a browser-held Supabase access token (`src/auth/authContext.ts:12-20`) and instead bootstraps from backend session endpoints/cookies.
- Email OTP UX remains the same from the user’s perspective: same auth phases, same-surface OTP flow, same-browser persistence, restore on revisit, 90-day absolute session lifetime.
- Bypass flow, cooldown enforcement, and domain restrictions remain backend-owned and covered by tests.
- No frontend business flow imports `@supabase/supabase-js` after the auth cutover.
- The app-owned cookie/session contract is concrete: the backend owns an opaque session ID cookie (for example `__Host-nurimap_session`) with `HttpOnly`, `Path=/`, `SameSite=Lax`, `Secure` in production, and `Max-Age` aligned to the 90-day absolute session policy.
- `GET /api/auth/session` becomes the bootstrap source of truth for authenticated app state, and write endpoints use cookie auth plus Origin/Host validation and an explicit CSRF token header (double-submit or synchronizer token) for unsafe methods.
- If Supabase Auth requires any non-admin network call during OTP request/verify, it must still be encapsulated inside the backend auth adapter and must not reintroduce publishable-key client usage or frontend token ownership.

### Step 4. Replace mock place/review consumers with backend API-backed app-shell state and empty-state handling
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/placeRepository.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/mockPlaces.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/appShellStore.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapAppShell.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapBrowse.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapDetail.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/PlaceLookupFlow.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/PlaceRegistrationFlow.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/server/placeEntryService.test.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/server/placeLookupService.test.ts`

**Acceptance Criteria**
- `src/app-shell/mockPlaces.ts:8-149` is no longer the canonical browse/detail data source.
- `src/app-shell/placeRepository.ts:1-220` becomes async API-backed logic (or is split into backend API client + reducer helpers) instead of mock-only synchronous state mutation.
- App-shell load states correctly support an empty DB from day one (`place_list_load = empty`, `place_detail_load` safe fallback) rather than assuming seeded mock data.
- Place creation and review overwrite behavior continue to honor current duplicate detection, geocode gating, rating aggregation, and “review one per user” rules.
- `api/place-entry.ts:14-38` and `api/place-lookup.ts:12-29` continue to enforce authentication at the server boundary, but the auth mechanism is cookie/session-based instead of bearer access-token-based.

### Step 5. Validate already-retired recommendation codepaths, prevent reintroduction during migration, then run repo-wide verification and QA evidence sync
**Files**
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/types.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/mockPlaces.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/placeRepository.ts`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/NurimapAppShell.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/App.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/src/app-shell/*.test.tsx`
- `/Users/jongmyeong/dev/projects/nurimap/docs/05-sprints/<next-sprint>/qa.md (new placeholder)`
- `/Users/jongmyeong/dev/projects/nurimap/docs/05-sprints/<next-sprint>/review.md (new placeholder)`
- `/Users/jongmyeong/dev/projects/nurimap/artifacts/qa/<new-sprint>/` (new)

**Acceptance Criteria**
- Recommendation removal is treated as a baseline invariant: if recommendation fields/actions are already absent at execution start, this step verifies they stay absent through schema/DTO/API/model cutover rather than re-implementing the removal.
- Recommendation fields and actions are removed from current runtime/UI types, payload contracts, and tests, not merely hidden behind flags.
- Any lingering recommendation-only live docs/spec references are retired or updated consistently with Step 1.
- Real-data migration work does not reintroduce recommendation-related fields into DB schemas, backend DTOs, frontend types, API payloads, or test fixtures.
- Automated verification covers auth, migrations, place/review persistence, and empty-state flows; QA evidence is recorded in the new sprint docs.
- If a new nontrivial architectural decision must be written to `docs/06-history/decisions.md`, the implementation plan includes a user-confirmation checkpoint before editing that directory, per `docs/00-governance/agent-workflow.md`.
- `src/server/apiImportBoundary.test.ts:48-83` is extended or reused to prove `api/*` continues to act as a boundary layer rather than a second source of business logic truth.

## Plan-Level Acceptance Criteria
- The plan is actionable without guessing across auth, migrations, place/review runtime, recommendation retirement, and env separation.
- At least 90% of acceptance criteria are directly testable through commands, test files, or doc diffs.
- The plan can satisfy the Ralph gate by yielding concrete PRD and test-spec artifacts before implementation.

## Verification Steps
1. `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/server/authService.test.ts src/server/placeEntryService.test.ts src/server/placeLookupService.test.ts src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/App.test.tsx`
2. `pnpm lint`
3. `pnpm exec tsc --noEmit`
4. `pnpm build`
5. `rg -n "@supabase/supabase-js|supabaseBrowser|verifyOtp\(|getSession\(|getUser\(|onAuthStateChange\(" src/auth src/app-shell src/App.tsx`
   - expected: no frontend business-flow usage after cutover (server-side imports under `src/server/*` are allowed)
6. `rg -n "recommendation|recommendation_count|my_recommendation_active|recommendation_toggle|추천" src docs/00-governance docs/01-product docs/02-architecture docs/03-specs docs/04-design`
   - expected: only intentionally preserved archive/history references remain; no recommendation fields are reintroduced by new DB/API/type work
7. Cookie/session contract verification:
   - session cookie attributes are correct in non-prod/prod
   - `GET /api/auth/session` is the only bootstrap source of truth
   - unsafe writes reject missing/invalid CSRF proof
8. Migration verification against `dev` and `test` databases using the repo’s chosen Supabase CLI workflow
9. Browser QA on auth bootstrap, OTP verify, empty browse state, place create, review overwrite, logout/relogin

## Risks And Mitigations
- **Risk:** Cookie-based backend session bootstrap regresses auth phases because current frontend assumes direct Supabase session events (`src/auth/AuthProvider.tsx:560-649`).
  - **Mitigation:** cut over bootstrap/verify/logout/name flows together behind explicit backend endpoints; keep auth phase state machine unchanged in tests.
- **Risk:** Phase-1 persistence drifts from current duplicate/review overwrite semantics held in mock repository logic (`src/app-shell/placeRepository.ts:167-220`).
  - **Mitigation:** port those rules into backend repository/service tests before swapping frontend consumers.
- **Risk:** `dev/test/production` miswiring causes OTP or migrations to target the wrong project.
  - **Mitigation:** require explicit env naming, separate secrets, and migration/test commands that print the active target before running.
- **Risk:** OTP verify succeeds at the provider but app-session issuance fails, leaving the browser and app DB out of sync.
  - **Mitigation:** keep cookie issuance strictly post-commit; if the DB transaction fails, return failure without setting the app-session cookie and perform best-effort provider-session cleanup.
- **Risk:** Recommendation retirement causes docs/code divergence because product docs, architecture docs, and UI types all currently mention it.
  - **Mitigation:** Step 1 and Step 5 explicitly pair live-doc retirement with code/test removal.
- **Risk:** Recommendation fields are accidentally reintroduced while mapping real DB schemas, backend DTOs, API responses, or frontend types during the migration.
  - **Mitigation:** treat recommendation absence as a locked invariant, keep grep/type/test guards in place, and review new payload/type additions specifically for recommendation regressions.
- **Risk:** Empty DB launch produces broken browse/detail assumptions because current UI expects seeded mock data.
  - **Mitigation:** add empty-state acceptance criteria and dedicated tests before removing mock defaults.

## ADR
- **Decision:** Use an adapter-first incremental migration that introduces backend-owned cookie sessions and Supabase-backed repositories before swapping frontend consumers.
- **Drivers:** mandated backend trust boundary, safe auth/migration rollout, and future-proof service seams without overbuilding a custom auth engine.
- **Alternatives considered:** big-bang rewrite; custom auth engine now.
- **Why chosen:** it minimizes migration blast radius while still delivering the required architectural boundary changes and recommendation retirement.
- **Consequences:** some temporary compatibility code and doc churn is unavoidable; verification must span docs, auth, server APIs, migrations, and UI state in one coordinated plan.
- **Follow-ups:** if staging becomes necessary later, extend the already-separated `dev/test/production` config model instead of renaming current environments.

## Pre-mortem (3 Scenarios)
1. **Auth bootstrap dead-end after cookie cutover**
   - Failure: login succeeds server-side, but frontend remains stuck in `loading`/`auth_required` because bootstrap assumptions still depend on `supabaseBrowser` events.
   - Prevention: migrate bootstrap, verify, logout, and name-save endpoints as one slice; add browser QA for refresh/revisit/logout.
2. **Place/review persistence corrupts duplicate or overwrite semantics**
   - Failure: duplicate place creation or incorrect rating aggregation appears because mock repository rules were not carried into backend writes.
   - Prevention: codify duplicate/overwrite/aggregate rules in backend tests before switching the frontend repository.
3. **Wrong environment receives migrations or OTP traffic**
   - Failure: `test` or `production` gets mutated accidentally due to unclear env selection.
   - Prevention: explicit env naming, separate secrets, and preflight target echo in migration/test scripts.

## Expanded Test Plan

### Unit
- `src/server/authService.test.ts`: OTP request policy, cooldown, domain restriction, bypass, server-side verify/session issuance helpers.
- `src/server/placeEntryService.test.ts`: geocode gating, duplicate handling, create vs overwrite review logic.
- `src/server/placeLookupService.test.ts`: lookup fallback, coordinate resolution, auth-agnostic service correctness.
- frontend auth reducer/state tests for phase transitions under backend session responses.
- cookie attribute and CSRF validator unit tests for the new app-session/auth middleware.

### Integration
- API tests for `/api/auth/request-otp`, new `/api/auth/verify-otp`, `/api/auth/session`, `/api/auth/logout`, `/api/place-entry`, `/api/place-lookup`, and new place/review read APIs.
- Migration tests against `test` database proving schema setup and rollback/forward behavior.
- Cookie/session integration proving same-browser revisit and logout semantics.
- Integration tests proving `src/server/*` remains canonical and `api/_lib/*` stays a thin wrapper/boundary.

### E2E / Browser QA
- Email input -> OTP request -> OTP verify -> name capture -> authenticated app.
- Refresh/revisit bootstrap with existing cookie.
- Empty database browse state.
- Place add flow from empty state.
- Review create/overwrite on an existing place.
- Logout -> auth_required -> relogin.

### Observability
- Verify auth request accepted/failure logs still classify cooldown/bypass/delivery failures (`src/server/authService.ts:137-180`).
- Add/verify structured logs or counters for session issue, session bootstrap failure, migration target, and place/review write failure.
- Confirm masked-email logging remains intact in auth failures and OTP rate-limit events.

## Open Questions
- If `docs/05-sprints/sprint-20/` is not the next valid sprint folder by the time implementation starts, use the next available sprint number and mirror the same planning/qa/review structure.
- Confirm the exact Supabase CLI/migration command set already preferred in this repo before implementation begins, since no migration directory exists yet.

## Review Integration Changelog
- Added explicit doc-lock step because current runtime/spec docs still mandate client-side OTP verify and browser-stored Supabase sessions.
- Added recommendation retirement as a first-class implementation step instead of treating it as background cleanup.
- Updated the recommendation step to treat current removal as a baseline invariant and focus execution on regression prevention during DB/API/type migration.
- Added `dev/test/production` environment contract and empty-database launch behavior to reduce rollout ambiguity.
- Applied architect-requested clarifications for provider boundary (service-role-capable backend only, no browserless publishable-key client), cookie/CSRF contract, canonical `src/server/*` business layer, `domain-model.md` + RLS wording lock, and concrete transaction semantics for place/review and auth-session orchestration.
