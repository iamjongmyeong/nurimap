# PRD: Sprint 20 Vercel Function Limit Resolution

## Context
- Sprint 20 currently treats local Supabase + local app as the canonical full-stack verification path, while Vercel Preview is limited to deploy/UI separation checks.
- `pnpm exec vercel deploy --yes` is blocked on the Hobby plan with `No more than 12 Serverless Functions can be added to a Deployment`.
- The repo currently places 5 API test files under `api/`, alongside 11 true runtime entrypoints, making test-file placement the most likely accidental contributor to deploy-counted functions.
- There is no `.vercelignore`, so deployment input is not explicitly trimmed.
- Sprint 20 docs already capture the blocker, but the blocker slice does not yet have task-specific PRD/test-spec artifacts for Ralph execution.

## Desired Outcome
- Vercel Preview deploy becomes possible again on the current Hobby plan through the smallest safe structural fix, or the next blocker is identified with concrete evidence.
- `api/` contains only runtime entrypoints plus `_lib` helpers, not test files.
- Deployment upload excludes obvious non-runtime noise (tests, large artifacts, local-only outputs).
- Sprint 20 QA/review docs reflect the actual resolution path and outcome.

## User Decisions
1. Local Supabase + local app remains the canonical backend verification path for the current slice.
2. Preview is currently a deploy/UI separation surface, not a production-connected backend verification environment.
3. Production must remain protected; no production backend hookup or rollout is part of this task.
4. Structural remediation is preferred before any paid plan upgrade.
5. API contract consolidation is out of scope unless the simpler structural fix fails.

## RALPLAN-DR Summary

### Mode
- DELIBERATE

### Principles
1. Protect production first.
2. Prefer structural fixes over paid-plan escalation.
3. Keep local-first verification intact.
4. Make Preview useful again with minimal churn.
5. Preserve evidence and rollback clarity.

### Decision Drivers
1. Remove the Preview deploy blocker.
2. Avoid unnecessary cost and platform complexity.
3. Keep Sprint 20 docs and QA evidence unambiguous.

### Viable Options
#### Option A — Move tests out of `api/` and add `.vercelignore` (Preferred)
- Directly targets the most plausible source of function inflation while keeping runtime contracts unchanged.

#### Option B — Upgrade Vercel plan
- Fast operational workaround, but pays for a likely repo-layout issue and leaves hygiene unchanged.

#### Option C — Consolidate runtime API entrypoints
- May reduce future function count, but changes contracts and raises risk beyond the current need.

### Preferred Option
- Option A

### Alternative Invalidation Rationale
- Option B is fallback-only if test relocation and ignore rules do not clear the blocker.
- Option C introduces avoidable API churn before the simplest structural fix is attempted.

## Guardrails
- Do not connect Preview to production backend services.
- Do not broaden into unrelated auth/place/review refactors.
- Do not modify runtime API contracts unless the structural fix proves insufficient.
- Keep `api/_lib/*` as shared helper modules, not runtime entrypoints.
- Keep `supabase/snippets/Untitled query 848.sql` uncommitted.

## Work Objectives
1. Make the intended deploy-surface inventory explicit.
2. Move accidental API test files out of the deploy-scanned `api/` tree.
3. Add `.vercelignore` rules that exclude tests and artifact noise from deployment uploads.
4. Re-run repo verification and retry Preview deployment.
5. Update Sprint 20 QA/review evidence with the result or the next blocker.

## Concrete Runtime Decisions
- Intended Vercel runtime entrypoints are the 11 non-test files under `api/` (excluding `_lib`).
- API route tests belong in a non-deploy path, preferably adjacent to server/runtime verification tests under `src/server/`.
- `.vercelignore` should exclude at least test files, artifacts, coverage-like outputs, and other non-runtime repository noise while preserving files required by Vite/Vercel build/runtime.
- If Preview deploy still fails after the structural fix, the team should capture the exact next blocker before considering plan upgrade or API consolidation.

## Success Criteria
- `api/` no longer contains `.test.ts` files.
- Moved tests still pass from their new location.
- `.vercelignore` exists and excludes obvious deploy-irrelevant files.
- `make check` passes after the refactor.
- `pnpm exec vercel deploy --yes` either succeeds or fails with a new, concrete blocker that is recorded in Sprint 20 QA/review evidence.
