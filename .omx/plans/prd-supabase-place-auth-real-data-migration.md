# PRD: Supabase Place/Auth Real-Data Migration

## Context
- Current browse/detail/review data is still mocked in `src/app-shell/mockPlaces.ts:8-149` and consumed through synchronous repository logic in `src/app-shell/placeRepository.ts:1-220`.
- Current frontend auth directly uses Supabase client APIs from `src/auth/supabaseBrowser.ts:1-22` and `src/auth/AuthProvider.tsx:521-910`, which conflicts with the approved `Frontend -> Backend -> Supabase` contract.
- Backend OTP request, place lookup, and place-entry seams already exist in `api/auth/request-otp.ts:1-24`, `api/place-lookup.ts:1-40`, `api/place-entry.ts:1-53`, and `src/server/authService.ts:1-260`, so the project can migrate incrementally rather than rewrite from scratch.
- Source-of-truth docs still assume client-side OTP verify and browser-stored Supabase sessions (`docs/02-architecture/system-runtime.md:177-184`, `docs/02-architecture/security-and-ops.md:53-60`, `docs/03-specs/05-auth-email-login-link.md:70-77,109-110`).
- The current server auth helper still exposes a publishable-key browserless client (`src/server/supabaseAdmin.ts:15-21`, `api/_lib/_supabaseAdmin.ts:15-21`), which must be explicitly retired under the approved constraints.

## Desired Outcome
- Nurimap uses real Supabase-backed persistence for place list/detail, place create, and review create/overwrite.
- Frontend no longer talks to Supabase directly for auth or business persistence.
- Email OTP UX and same-browser 90-day session behavior remain intact from the user’s perspective.
- Recommendation UI and recommendation logic are removed from the current product/runtime.
- Environment strategy is clearly separated into `dev`, `test`, and `production`.

## User Decisions
1. Architecture is always `Frontend -> Backend -> Supabase`; direct frontend Supabase access is forbidden.
2. Phase 1 scope is place read, place create, and review create/overwrite.
3. Email OTP remains the canonical login UX.
4. Backend issues app session cookies; session UX remains same-browser persistence with 90-day absolute lifetime.
5. Supabase Auth remains the internal auth engine, but only behind backend APIs.
6. Recommendation is removed from current UI/runtime scope.
7. Database starts empty; no seed data.
8. Environment set is `dev / test / production` for now.
9. Long-term-sound options are preferred when reasonably affordable, but no custom auth engine is needed now.
10. Backend provider access must use service-role-capable server-only patterns; the publishable-key browserless client path is not allowed in the cutover architecture.

## RALPLAN-DR Summary

### Mode
- DELIBERATE

### Principles
1. Backend-owned trust boundary
2. Adapter-first migration
3. UX-preserving auth cutover
4. Docs/migrations/tests lockstep
5. Scope-discipline on phase 1

### Decision Drivers
1. Remove direct frontend Supabase dependency safely
2. Keep auth/session UX stable while changing internals
3. Preserve future replaceability with repository/service seams

### Viable Options
#### Option A — Adapter-first incremental cutover (Preferred)
- Introduce backend session/persistence adapters first, then switch frontend consumers.
- Best balance of delivery speed and risk control.

#### Option B — Big-bang rewrite
- Replace all auth/place/review paths in one pass.
- Higher blast radius and harder rollback/debugging.

#### Invalidated Alternative
- Custom auth engine now — rejected by user as unnecessary for this side project.

### Preferred Option
- Option A

### Alternative Invalidation Rationale
- Option B increases auth+migration failure coupling.
- Custom auth adds cost without user value under current strategy.

## Guardrails
- Frontend must not import or call Supabase client APIs for auth/business flows after the migration.
- Backend remains the owner of auth, authorization, business logic, and persistence contracts.
- Schema changes only land through migration files.
- Multi-step writes must stay server-side transactional/atomic.
- `dev`, `test`, and `production` must not share secrets or mutable data targets.
- Recommendation is not postponed UI; it is removed from live runtime scope.
- `src/server/*` is the canonical business/domain implementation layer; `api/*` and `api/_lib/*` are boundary adapters only.
- Cookie auth uses an app-owned opaque session, not a frontend-held Supabase session token.
- RLS may exist only as defense-in-depth; backend authorization/business logic is canonical.

## Work Objectives
1. Align source-of-truth docs and planning artifacts with the new backend-owned auth/persistence boundary.
2. Establish migration-backed persistence and opaque app-session storage.
3. Replace frontend direct Supabase auth usage with backend cookie/session APIs.
4. Replace mock place/review consumers with backend-backed reads/writes and empty-state handling.
5. Retire recommendation code/docs and verify the whole stack.

## Concrete Runtime Decisions

### Auth / Provider Boundary
- Backend auth adapters may use Supabase Auth behind backend APIs, but they must not use the publishable-key browserless client path.
- Canonical provider access is:
  - service-role-capable admin/auth clients for Supabase Auth and user metadata operations
  - server-only Postgres access for transactional app data and opaque session persistence
- If Supabase OTP request/verify requires a non-admin transport detail, it must still be encapsulated in the backend auth adapter and must not leak a publishable key or direct provider contract to the frontend.
- Before implementation, confirm the backend-only OTP request/verify path against current official Supabase docs; if the approved service-role-only boundary is not technically viable, stop and record a new design decision before execution.

### Cookie / Session Contract
- The app owns an opaque session row and cookie, separate from any frontend-visible Supabase session token.
- The session cookie should be concrete in implementation:
  - name: app-owned host cookie such as `__Host-nurimap_session`
  - `HttpOnly`
  - `Path=/`
  - `SameSite=Lax`
  - `Secure` in production
  - `Max-Age` aligned to 90-day absolute lifetime
- `GET /api/auth/session` is the bootstrap source of truth for authenticated frontend state.
- Unsafe writes use cookie auth plus Origin/Host validation and CSRF proof (double-submit or synchronizer token pattern).

### Canonical Backend Layer
- `src/server/*` holds canonical domain logic, repositories, transaction orchestration, and auth/session services.
- `api/_lib/*` is demoted to thin Vercel-compatible wrappers/re-exports and must not remain a parallel business-logic tree.

### Transaction Mechanism
- Place create + initial review create and duplicate-place merge + review overwrite run inside one backend Postgres transaction, not RPC.
- OTP verify + app-session issuance is a two-stage server operation:
  1. verify OTP via backend auth adapter
  2. run one DB transaction to upsert profile/session state and audit records
  3. set the app-session cookie only after commit
- If step 2 fails, the response must fail without setting the cookie, with best-effort provider-session cleanup.

## Success Criteria
- Implementation can proceed without guessing about auth ownership, session UX, env separation, or recommendation scope.
- The project has a concrete migration plan, PRD, test spec, and runtime file targets before execution begins.
- The eventual implementation can satisfy the repo’s Ralph planning gate and verification standards.
