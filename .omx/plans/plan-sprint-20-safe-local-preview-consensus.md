# Plan: Sprint 20 Safe Local-First Preview Strategy (Consensus)

## Requirements Summary
- The new deep-interview spec sets the active strategy: production Supabase must not be touched during development; local Supabase + local app is the canonical real full-stack verification path; Vercel Preview remains useful for deploy/UI separation checks but does not need a backend-integrated runtime in this slice (`.omx/specs/deep-interview-sprint-20-safe-env-strategy.md:21-41`, `.omx/specs/deep-interview-sprint-20-safe-env-strategy.md:43-60`).
- Sprint 20 already has strong local verification evidence: `supabase status`, `make check`, and Playwright flows for empty-state, create, refresh persistence, detail revisit, overwrite, logout/relogin are recorded in the sprint QA doc (`docs/05-sprints/sprint-20/qa.md:8-13`, `docs/05-sprints/sprint-20/qa.md:31-55`).
- The current sprint planning doc still treats `dev / test / production` separation as in-scope and keeps browser automation + user QA as required outputs, so the safer strategy must keep those obligations while redefining Preview’s role (`docs/05-sprints/sprint-20/planning.md:9-16`, `docs/05-sprints/sprint-20/planning.md:105-125`).
- The live security doc currently says remote preview/development should have a production-separated backend target, which conflicts with the newly clarified local-first strategy and therefore must be revised (`docs/02-architecture/security-and-ops.md:62-74`).
- The current sprint QA/review docs still encode deferred remote rollout assumptions and a separate remote target decision that conflict with the new direction and need to be overridden (`docs/05-sprints/sprint-20/qa.md:72-93`, `docs/05-sprints/sprint-20/review.md:17-94`).
- Production protection remains the top priority, so push and Preview guidance must avoid implying that Preview should connect to production backend services (`.omx/specs/deep-interview-sprint-20-safe-env-strategy.md:24-34`, `.omx/specs/deep-interview-sprint-20-safe-env-strategy.md:36-41`).

## RALPLAN-DR Summary

### Mode
- DELIBERATE

### Principles
1. Production must remain untouched during active development.
2. Local Supabase is the canonical backend verification environment until a future decision expands scope.
3. Preview should preserve release confidence without forcing unnecessary backend complexity.
4. Sprint docs and architecture docs must reflect the same runtime contract.
5. Deferred future options should be explicit, not implied.

### Decision Drivers
1. Protect production data/auth state during development.
2. Preserve a useful pre-release Preview signal without adding infrastructure overhead now.
3. Keep Sprint 20 evidence aligned with the actual validated workflow.

### Viable Options
#### Option A — Local-first full-stack + Preview UI/deploy-only (Preferred)
- **Approach:** Keep local Supabase + `make dev` as the only real backend-integrated verification path; redefine Preview as deployment/UI separation verification only.
- **Pros:** Best production protection; matches current validated workflow; no additional remote infra required now.
- **Cons:** Preview cannot prove remote auth/database writes in this slice; future expansion needs an explicit follow-up.

#### Option B — Add a remote non-production backend for Preview now
- **Approach:** Provision a separate non-production backend target and wire Preview to it for backend-integrated smoke tests.
- **Pros:** Preview can exercise full request path before release.
- **Cons:** More setup cost/ops complexity immediately; conflicts with the user’s desire to avoid touching production and minimize backend sprawl right now.

### Preferred Option
- Option A

### Alternative Invalidation Rationale
- Option B is not inherently wrong, but it adds operational complexity that the user explicitly does not want in the current slice. It should remain a future expansion path, not a current requirement.

## Pre-mortem (3 scenarios)
1. **Docs still imply Preview needs a remote backend**
   - Failure: future work reintroduces pressure to connect Preview to production or spin up unnecessary remote infra.
   - Mitigation: explicitly rewrite architecture + sprint docs so Preview’s current role is UI/deploy separation only.
2. **Push guidance remains ambiguous**
   - Failure: `main` push is interpreted as safe even though Preview/Production deploy implications are not fully documented.
   - Mitigation: document a conservative push policy tied to local verification + user QA, and avoid claiming remote backend readiness.
3. **Local-only test model becomes implicit debt**
   - Failure: team assumes `test` is fully isolated when it is still a controlled local-reset model.
   - Mitigation: document the current test model and add a clear future trigger for dedicated test/remote backend expansion.

## Expanded Test Plan
### Unit
- Validate `src/server/database.ts` environment-resolution behavior remains correctly documented (`NODE_ENV=test` uses `TEST_DATABASE_URL` family when present).
- Validate no new doc claims contradict current auth/session cookie contract.

### Integration
- `make check`
- `supabase status`
- static verification that sprint docs, architecture docs, and the new plan all describe the same local-first environment model.

### E2E
- Reuse current Playwright-backed local evidence as the canonical backend-integrated e2e baseline.
- If additional evidence is needed, run local OTP UI verification without bypass, still against local Supabase.

### Observability
- Keep QA/review docs explicit about what was verified locally versus what Preview does not yet verify.
- Preserve production-protection wording so rollout intent is auditably conservative.

## Work Objectives
1. Override Sprint 20 environment strategy docs to match the new local-first safe model.
2. Make the current `test` model explicit instead of leaving it half-implied.
3. Redefine Preview and push guidance so they are useful but production-safe.
4. Leave a clear expansion trigger for future remote backend-integrated Preview testing.

## Guardrails
### Must Have
- Keep `Frontend -> Backend -> Supabase` architecture intact (`docs/05-sprints/sprint-20/planning.md:56-64`).
- Keep local Supabase as the canonical backend verification path for the current slice.
- Mark Production as protected / out of active development scope.
- Make deferred remote backend expansion explicit rather than ambiguous.

### Must NOT Have
- Do not wire Preview to Production backend services.
- Do not require creation of a remote non-production Supabase project in this slice.
- Do not erase existing local QA evidence.
- Do not modify `.omx/specs/deep-interview-sprint-20-safe-env-strategy.md`; treat it as input.

## Implementation Steps

### Step 1. Replace conflicting environment strategy language with the new local-first contract
**Files / Context**
- `docs/02-architecture/security-and-ops.md:62-74`
- `docs/05-sprints/sprint-20/planning.md:54-64`
- `docs/05-sprints/sprint-20/qa.md:72-93`
- `docs/05-sprints/sprint-20/review.md:17-94`
- `.omx/specs/deep-interview-sprint-20-safe-env-strategy.md:21-41`

**Actions**
- Explicitly supersede these current statements:
  - `docs/02-architecture/security-and-ops.md:67-72` (preview/development backend-target requirement)
  - `docs/05-sprints/sprint-20/review.md:27-29` (carry-over that assumes a remote non-production backend target now)
  - `docs/05-sprints/sprint-20/review.md:38-41` (preview/development readiness snapshot requiring backend env setup now)
  - `docs/05-sprints/sprint-20/review.md:57-61` (remote target decision that currently chooses a remote non-production backend strategy)
  - `docs/05-sprints/sprint-20/qa.md:76-81` (QA blockers that still frame remote backend readiness as a current requirement)
- Update the live security/ops doc so environment separation policy says:
  - local dev uses local Supabase for real backend validation,
  - test is currently a controlled local-reset model,
  - Preview is meaningful for deploy/UI separation but is not backend-integrated in this slice,
  - production remains protected.
- Update Sprint 20 QA/review docs to remove or explicitly supersede the prior “remote non-production backend now” assumptions.
- If needed, add a short note in Sprint 20 planning clarifying that Preview’s current scope is deploy/UI separation, not backend-integrated smoke.

**Acceptance Criteria**
- No Sprint 20 or live architecture doc still implies Preview must be backend-integrated right now.
- Production protection is stated explicitly and consistently.

### Step 2. Lock the current local-only verification model as the canonical backend test path
**Files / Context**
- `docs/05-sprints/sprint-20/qa.md:8-13`
- `docs/05-sprints/sprint-20/qa.md:31-70`
- `src/server/database.ts:12-33`
- `.omx/specs/deep-interview-sprint-20-safe-env-strategy.md:36-41`

**Actions**
- Keep `supabase status` + `make check` + existing Playwright local evidence as the Sprint 20 canonical verification path.
- Clarify in sprint docs that the current `test` model is:
  - local-reset-based,
  - controlled, and
  - not yet a dedicated remote or dedicated DB target.
- If OTP UI evidence still matters, scope it as an additional **local** browser pass, not a Preview backend task.

**Acceptance Criteria**
- Sprint docs clearly distinguish local backend-integrated verification from Preview checks.
- The current test model is described concretely enough that future work does not over-claim isolation.

### Step 3. Redefine Preview and push guidance to fit the safe strategy
**Files / Context**
- `docs/05-sprints/sprint-20/review.md:63-80`
- `docs/05-sprints/sprint-20/qa.md:72-93`
- `.github/workflows/bypass-email-guard.yml:3-33`
- `.vercel/project.json:1`
- `.omx/specs/deep-interview-sprint-20-safe-env-strategy.md:43-60`

**Actions**
- Rewrite current “push deferred because Preview lacks backend env” reasoning into two clearly separated rules:
  - **Rule A:** Preview backend readiness is **not required** in this slice because Preview is not backend-integrated right now.
  - **Rule B:** `main` push is still handled conservatively until deploy impact is understood well enough and user QA is complete.
- Preserve any caution that still matters (e.g. avoid implying production-safe deploy behavior without confirmation), but remove backend-env readiness as a current gate.
- Document the minimum Preview smoke contract for this slice:
  - Preview deployment succeeds
  - `/` bootstraps without crash into the expected app/auth shell
  - `/places/:placeId` rewrite still resolves to the app shell correctly
  - expected static assets load without obvious boot failure

**Acceptance Criteria**
- Push guidance no longer depends on creating a remote backend target first.
- The plan clearly says “Preview backend is not required now” **without** saying “`main` push is automatically safe.”
- Preview’s role is specific, limited, and backed by a minimal smoke contract.

### Step 4. Record the explicit future expansion trigger instead of keeping remote backend testing half-open
**Files / Context**
- `docs/05-sprints/sprint-20/review.md`
- `docs/05-sprints/sprint-20/qa.md`
- `.omx/specs/deep-interview-sprint-20-safe-env-strategy.md:24-41`

**Actions**
- Add a clearly named deferred follow-up describing when a remote non-production backend becomes worth introducing.
- Trigger examples:
  - Preview must validate real auth/email/backend write flows before release,
  - multiple collaborators need shared non-production state,
  - local-only verification becomes insufficient for release confidence.
- Ensure the deferred item is framed as future scope, not a hidden blocker for the current slice.

**Acceptance Criteria**
- Future remote backend expansion is explicitly deferred with concrete triggers.
- Sprint 20 can close the current environment strategy slice without pretending remote backend readiness exists.

## ADR
- **Decision:** Use a local-first safe environment model for Sprint 20: local Supabase + local app is the canonical backend-integrated verification path; Vercel Preview is deploy/UI separation only in the current slice.
- **Drivers:** production protection, minimal additional ops burden, alignment with already validated local workflow.
- **Alternatives considered:** (A) local-first Preview UI/deploy-only, (B) add a remote non-production backend now.
- **Why chosen:** Option A satisfies the user’s top priority—never touching production during development—while preserving meaningful Preview value and avoiding unnecessary infra work in the current slice.
- **Consequences:** Preview will not validate real backend writes right now; any future need for that must be an explicit follow-up. Sprint docs and architecture docs must be revised to match this reality.
- **Follow-ups:** Revisit remote non-production backend only when Preview must prove real backend flows or collaboration/release needs outgrow local-only verification.

## Verification Steps
1. `git diff --check`
2. Read updated `docs/02-architecture/security-and-ops.md`, `docs/05-sprints/sprint-20/planning.md`, `docs/05-sprints/sprint-20/qa.md`, and `docs/05-sprints/sprint-20/review.md` together.
3. Confirm no updated doc still says Preview needs a real backend target in the current slice.
4. Confirm Sprint docs still preserve the existing local evidence (`supabase status`, `make check`, Playwright local QA).
5. Confirm push guidance is conservative but no longer blocked on provisioning a remote backend.

## Success Criteria
- The repo has one coherent story: develop and verify real backend flows locally; use Preview for deploy/UI separation; keep production protected.
- Old remote-backend-now assumptions are removed or explicitly superseded.
- Future expansion to remote non-production backend testing is deferred with clear triggers, not left ambiguous.

## Applied Review Improvements
- Architect review applied: Step 1 now names the exact live sprint/architecture statements that must be superseded.
- Architect review applied: Step 3 now separates “Preview backend not required” from “`main` push still conservative.”
- Architect review applied: Preview smoke scope now includes a minimal concrete contract (`/`, `/places/:placeId`, static assets, deploy success).
