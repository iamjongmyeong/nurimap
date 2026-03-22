# Plan: Next Session -- Supabase Rollout, QA Sync, and Handoff

## Requirements Summary
- Current implementation SSOT remains:
  - `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md`
  - `.omx/plans/prd-supabase-place-auth-real-data-migration.md`
  - `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`
- Local end-to-end state already verified manually:
  - local Supabase started successfully
  - `vercel dev` works when local env vars are injected explicitly
  - bypass login works
  - name save works
  - map and list load
  - place registration succeeds and shows detail
- Recent commits already created:
  - `7c0ff96` — auth/place/backend boundary cutover
  - `5ae6095` — local Supabase runtime and persistence stabilization
- Current workspace state at planning time:
  - `git status --short` shows only `?? supabase/snippets/Untitled query 848.sql`

## Work Objectives
1. Re-establish the current local runtime quickly in a fresh session.
2. Re-run the remaining user-facing validations that were not fully captured in docs.
3. Sync Sprint 20 QA/review docs with actual evidence and current known caveats.
4. Decide whether to push current commits and whether to proceed to remote dev/test migration rollout.
5. Keep `.omx` plan as implementation SSOT and avoid duplicating logic in sprint docs.

## Guardrails
### Must Have
- Treat `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md` as the implementation source of truth.
- Re-check `git status --short` at the start of the new session.
- Do not commit `supabase/snippets/Untitled query 848.sql` unless its purpose is explicitly understood and intentional.
- Keep recommendation retired.
- Preserve `Frontend -> Backend -> Supabase` boundary.

### Must NOT Have
- Do not reintroduce frontend direct Supabase usage.
- Do not edit `.omx/plans/*` unless the plan itself truly needs revision.
- Do not manually alter schema in Supabase Studio dashboard.
- Do not push `.env.local` or other local secrets.

## Implementation Steps

### Step 1. Recreate the known-good local verification environment
**Files / Context**
- `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md`
- `.omx/plans/prd-supabase-place-auth-real-data-migration.md`
- `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`
- `supabase/config.toml`
- `supabase/migrations/20260322065245_phase1_place_auth_real_data_foundation.sql`

**Actions**
- Confirm current git state and ignore/delete stray `supabase/snippets/Untitled query 848.sql` if still present.
- Start local Supabase.
- Run `vercel dev` with explicit injected env vars if `.env.local` loading is still unreliable in Vercel dev runtime.
- Confirm local app boots into authenticated flow again.

**Acceptance Criteria**
- Local Supabase is running and healthy.
- Vercel dev starts without `supabaseUrl is required`.
- App reaches authenticated screen using the known local bypass flow.

### Step 2. Finish manual runtime validation that is still missing from formal QA evidence
**Files / Context**
- `docs/05-sprints/sprint-20/qa.md`
- `docs/05-sprints/sprint-20/review.md`
- `artifacts/qa/sprint-20/` (create if missing)

**Actions**
- Verify and record these runtime checks:
  - refresh after login keeps session
  - refresh after place creation still shows the created place from DB
  - direct detail route revisit works
  - review create/overwrite behavior still matches the contract
  - empty-state behavior still works on a clean DB
- If possible, collect browser screenshots/evidence under `artifacts/qa/sprint-20/`.

**Acceptance Criteria**
- Manual QA covers the remaining high-value flows that were not fully captured in previous session notes.
- Any failure is written down with exact reproduction steps.

### Step 3. Sync sprint docs with real execution evidence
**Files**
- `docs/05-sprints/sprint-20/qa.md`
- `docs/05-sprints/sprint-20/review.md`

**Actions**
- Replace `pending` placeholders with actual commands, outcomes, and evidence.
- Record the important local-runtime lessons:
  - `vercel dev` required explicit env injection for local Supabase values in this environment
  - local Supabase/Docker validation succeeded
  - major runtime bugs fixed during verification (cookie naming, session persistence, map runtime guard, backend-canonical place-entry persistence, transaction deadlock)
- Keep sprint docs readable for humans and avoid duplicating `.omx` implementation detail.

**Acceptance Criteria**
- `qa.md` explains what was actually verified and what still remains.
- `review.md` reflects what is actually completed vs still pending.
- Sprint docs stay aligned with `.omx` SSOT, not in conflict with it.

### Step 4. Decide push and remote rollout readiness
**Files / Context**
- `git log --oneline`
- `docs/05-sprints/sprint-20/planning.md`
- `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`

**Actions**
- If local QA is satisfactory, push commits `7c0ff96` and `5ae6095` plus any new follow-up commit.
- Decide whether remote dev/test rollout should happen immediately or as a separate execution slice.
- If remote rollout is chosen, prepare a safe checklist:
  - confirm target project
  - confirm env values
  - apply migration
  - test auth + list + place create + review

**Acceptance Criteria**
- There is a clear yes/no decision on push.
- There is a clear yes/no decision on remote dev/test rollout.
- If rollout is deferred, the reason is documented.

## Risks and Mitigations
- **Risk:** Vercel dev still ignores `.env.local` for function runtime.
  - **Mitigation:** continue using explicit env injection command for local reproduction until a dedicated local-dev env strategy is formalized.
- **Risk:** Local success but no durable documentation.
  - **Mitigation:** update sprint QA/review docs immediately in the next session.
- **Risk:** Accidental commit of local scratch SQL from `supabase/snippets/`.
  - **Mitigation:** inspect `git status --short` first and exclude/delete scratch files.
- **Risk:** Remote rollout is attempted without re-verifying target environment config.
  - **Mitigation:** require an explicit target-selection checklist before any remote migration command.

## Verification Steps
1. `git status --short`
2. `supabase status`
3. Start app runtime with the known-good local `vercel dev` command (explicit env injection if needed)
4. `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authApi.test.ts api/place-entry.test.ts api/auth/verify-otp.test.ts api/auth/session-routes.test.ts src/server/authService.test.ts src/server/database.test.ts src/server/appSessionService.test.ts src/server/placeDataService.test.ts api/place-list.test.ts api/place-review.test.ts src/app-shell/placeRepository.test.ts src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/App.test.tsx`
5. `pnpm lint`
6. `pnpm build`
7. Browser/manual checks:
   - bypass login
   - name save
   - map/list render
   - place create
   - refresh persistence
   - detail revisit
   - review flow

## Success Criteria
- Next session can resume without rereading the entire prior conversation.
- Human-readable Sprint 20 docs reflect reality.
- A concrete decision is made on push and remote rollout.
- No local scratch artifacts are accidentally committed.
