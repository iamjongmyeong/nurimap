# Plan: Sprint 20 Vercel Function Limit Blocker Resolution (Initial Consensus Draft)

## Requirements Summary
- Current agreed environment strategy remains: **local Supabase + local app is the canonical real full-stack verification path**, while **Vercel Preview is only for deploy/UI separation in the current slice**. Production must stay protected.
- `pnpm exec vercel deploy --yes` failed with `No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan`, so Preview deploy smoke is currently blocked.
- The most likely concrete cause in-repo is function count inflation inside `api/`: there are **11 runtime endpoints** plus **5 `.test.ts` files** outside `_lib`, for a likely total of **16 deploy-counted files**.
- There is currently **no `.vercelignore`**, so deployment input is not being trimmed.
- The resolution should minimize ambiguity, preserve the local-first safe strategy, and avoid introducing unnecessary backend or platform complexity unless the simpler structural fix fails.

## RALPLAN-DR Summary

### Mode
- DELIBERATE

### Principles
1. Protect production first.
2. Prefer structural fixes over plan/price upgrades when the root cause is in-repo.
3. Keep local Supabase as the canonical backend verification path.
4. Make Preview useful again with the smallest safe change.
5. Preserve explicit evidence and rollback paths.

### Decision Drivers
1. Remove the Preview deploy blocker without changing the current environment strategy.
2. Minimize ongoing cost and operational complexity.
3. Keep future rollout/QA options open after the blocker is resolved.

### Viable Options
#### Option A — Reduce counted Vercel functions by moving test files out of `api/` and adding `.vercelignore` (Preferred)
- **Approach:** Move API tests out of `api/`, keep only true runtime entrypoints in `api/`, and add `.vercelignore` to exclude test/artifact noise from deployment uploads.
- **Pros:** Directly targets the most likely cause; low cost; keeps Hobby plan viable; improves repo hygiene.
- **Cons:** Requires multi-file refactor and test import path updates.

#### Option B — Keep current repo layout and upgrade Vercel plan
- **Approach:** Accept the current function count and remove the blocker via paid plan capacity.
- **Pros:** Minimal code movement; quickest if money is not a concern.
- **Cons:** Pays for a platform limit that is likely being triggered by test file placement; does not improve repo hygiene.

#### Option C — Consolidate runtime API surface to fewer entrypoints
- **Approach:** Merge some API handlers so runtime function count drops below the Hobby limit even with current layout.
- **Pros:** Could reduce long-term deployment complexity.
- **Cons:** Unnecessary contract churn right now; higher risk than simply moving tests.

### Preferred Option
- Option A

### Alternative Invalidation Rationale
- Option B is a fallback if Option A fails or if the function counting behavior turns out not to be caused by test files.
- Option C changes API surface area and risks avoidable regressions; it is not justified before trying the simpler structural fix.

## Pre-mortem (3 scenarios)
1. **Tests moved, but deployment still counts too many functions**
   - Failure: Preview deploy remains blocked because another file pattern is being deployed as functions.
   - Mitigation: verify function entrypoint inventory after the move and inspect deployment output/logs before attempting broader changes.
2. **Test refactor breaks local test workflow**
   - Failure: moving `api/*.test.ts` causes import-path or Vitest failures.
   - Mitigation: move tests incrementally, run targeted test suites immediately, and update imports in the same slice.
3. **Preview deploy succeeds but app boot still fails**
   - Failure: resolving the function-limit blocker reveals a second Preview issue (boot/rewrite/static asset failure).
   - Mitigation: keep a separate Preview smoke checklist after deploy succeeds and record any new blocker distinctly in Sprint 20 QA.

## Expanded Test Plan
### Unit
- Update and run the moved API-adjacent tests to ensure they still cover request/response contracts.
- Confirm no accidental changes to shared `_lib` behavior.

### Integration
- `make check`
- targeted API-related Vitest runs for moved tests
- `git diff --check`

### E2E
- Retry `pnpm exec vercel deploy --yes` after the structural fix.
- If deploy succeeds, run Preview smoke on:
  - `/`
  - `/places/:placeId`
  - static asset boot

### Observability
- Record the exact before/after function-entry inventory.
- Save Preview deploy result and any blocker logs under `artifacts/qa/sprint-20/`.

## Work Objectives
1. Eliminate the likely accidental function count inflation.
2. Restore Preview deployability on the current plan if possible.
3. Preserve current local-first verification and production-safe posture.
4. Update Sprint 20 evidence/docs with the real resolution or the next concrete blocker.

## Guardrails
### Must Have
- Keep local Supabase + local app as the canonical backend verification path.
- Do not connect Preview to Production backend services.
- Keep `api/_lib/*` as shared helpers, not deploy entrypoints.
- Keep Sprint 20 QA/review evidence aligned with what was actually tested.

### Must NOT Have
- Do not start a platform/plan upgrade first.
- Do not collapse API contracts before trying the structural fix.
- Do not commit `supabase/snippets/Untitled query 848.sql`.
- Do not broaden into unrelated auth/place refactors.

## Implementation Steps

### Step 1. Confirm the deploy-counted function inventory and isolate likely accidental entries
**Files / Context**
- `api/auth/logout.ts`
- `api/auth/profile.ts`
- `api/auth/request-link.ts`
- `api/auth/request-otp.ts`
- `api/auth/session.ts`
- `api/auth/verify-otp.ts`
- `api/place-detail.ts`
- `api/place-entry.ts`
- `api/place-list.ts`
- `api/place-lookup.ts`
- `api/place-review.ts`
- `api/auth/session-routes.test.ts`
- `api/auth/verify-otp.test.ts`
- `api/place-entry.test.ts`
- `api/place-list.test.ts`
- `api/place-review.test.ts`
- `vercel.json`

**Actions**
- Treat the 11 runtime `.ts` files as the intended Preview/Production function surface.
- Treat the 5 `.test.ts` files in `api/` as accidental deploy-surface candidates until disproven.
- Record the current inventory in Sprint 20 QA or artifacts before moving anything.

**Acceptance Criteria**
- The plan for which files must remain in `api/` vs leave `api/` is explicit.

### Step 2. Move API test files out of `api/` and add deployment ignore rules
**Files / Context**
- `api/auth/session-routes.test.ts`
- `api/auth/verify-otp.test.ts`
- `api/place-entry.test.ts`
- `api/place-list.test.ts`
- `api/place-review.test.ts`
- `.vercelignore` (new)
- `package.json`

**Actions**
- Move the 5 API test files to a non-deploy path (for example `src/server/`-adjacent tests or `tests/api/`).
- Update imports/paths so Vitest still runs them.
- Add `.vercelignore` to exclude at least test files and large artifacts from deployment upload.

**Acceptance Criteria**
- `api/` contains only real runtime entrypoints plus `_lib` helpers.
- Deployment upload no longer includes obvious test/artifact noise.
- Targeted moved tests still pass.

### Step 3. Re-run verification and retry Preview deployment
**Files / Context**
- `artifacts/qa/sprint-20/preview-deploy-blocker.txt`
- `docs/05-sprints/sprint-20/qa.md`
- `docs/05-sprints/sprint-20/review.md`

**Actions**
- Run `make check` after the structural cleanup.
- Retry `pnpm exec vercel deploy --yes`.
- If deploy succeeds, capture the Preview URL and run the minimal Preview smoke contract.
- If deploy still fails, record the next concrete blocker without guessing.

**Acceptance Criteria**
- Either Preview deploy succeeds, or a new concrete blocker is recorded with evidence.

### Step 4. Update Sprint 20 docs with the resolution path and decision outcome
**Files / Context**
- `docs/05-sprints/sprint-20/qa.md`
- `docs/05-sprints/sprint-20/review.md`
- `artifacts/qa/sprint-20/`

**Actions**
- Replace the current blocker narrative with the actual post-fix outcome.
- If Option A succeeds, note that Hobby-plan Preview is viable after removing accidental function entries.
- If Option A fails, explicitly record whether the next step is Option B (plan upgrade) or a deeper code-structure review.

**Acceptance Criteria**
- Sprint docs explain the blocker, the attempted fix, and the actual result without ambiguity.

## ADR
- **Decision:** Start with the structural fix: move `.test.ts` files out of `api/` and add `.vercelignore`, then retry Preview deployment.
- **Drivers:** lowest-cost path, strongest root-cause fit, least architectural churn.
- **Alternatives considered:** platform upgrade first; API consolidation.
- **Why chosen:** The repo currently has 16 likely deploy-counted files in `api/`, while only 11 are true runtime endpoints, making test-file placement the most plausible first fix.
- **Consequences:** Some test paths will move; deployment config becomes slightly more explicit; Preview may become viable without plan changes.
- **Follow-ups:** If the blocker remains after Option A, reassess with concrete deployment output before considering paid plan upgrade or API consolidation.

## Verification Steps
1. `git diff --check`
2. `make check`
3. Count deploy-surface files under `api/` again
4. Confirm `.vercelignore` excludes tests/artifacts as intended
5. Retry `pnpm exec vercel deploy --yes`
6. If deploy succeeds, verify Preview smoke on `/`, `/places/:placeId`, and static asset boot
7. Update `docs/05-sprints/sprint-20/qa.md` and `review.md`

## Success Criteria
- Preview deploy blocker is resolved by removing accidental deploy-counted files, **or** a new concrete blocker is captured.
- The repo stays within the local-first / production-safe strategy.
- The next step is unambiguous: either Preview works on Hobby after the cleanup, or there is evidence-backed justification for the next escalation.
