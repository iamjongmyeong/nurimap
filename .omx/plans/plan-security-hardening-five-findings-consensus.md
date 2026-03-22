# Plan: Security Hardening for 5 Priority Review Findings (Deliberate Consensus)

## Context
- Recent code review and security review concluded with `REQUEST CHANGES` and a `HIGH RISK` posture.
- The five agreed issues are:
  1. remote DB TLS verification is disabled,
  2. raw app session IDs are stored/queried by id instead of hash-only lookup,
  3. bypass auth can become a non-local backdoor if enabled outside local,
  4. `vercel` remains in production dependencies and expands audit/runtime surface,
  5. `place-entry` / `place-lookup` lack rate limiting and bounded caches.
- Scope is intentionally limited to these five findings. No unrelated refactors, auth UX redesigns, or architecture rewrites are part of this plan.

## Requirements Summary
- Preserve the approved `Frontend -> Backend -> Supabase` contract.
- Keep local-first verification as the canonical real backend validation path.
- Reduce immediate security exposure without introducing unnecessary system churn.
- Use migration-backed schema changes only.
- Sequence risky auth/session changes so existing local verification can still prove correctness after each slice.

## RALPLAN-DR Summary

### Mode
- DELIBERATE

### Principles
1. Fail closed on security-sensitive paths.
2. Prefer staged hardening over big-bang auth rewrites.
3. Keep provider-specific details behind backend boundaries.
4. Treat deploy/runtime warnings as real evidence, not cosmetic noise.
5. Preserve reproducible verification after every risky change.

### Decision Drivers
1. Remove the highest-leverage auth/session risks first.
2. Minimize rollback complexity for session/auth changes.
3. Keep the plan executor-ready with concrete verification and bounded scope.

### Viable Options
#### Option A — Staged hardening with session migration bridge (Preferred)
- Fix TLS first, then introduce hash-based session lookup with compatibility bridge, lock bypass to local-only, move `vercel` to devDependencies, and add rate limiting/bounded caches.
- Pros: safest sequencing; easiest rollback; preserves current product contract.
- Cons: requires a compatibility phase for session storage and more verification steps.

#### Option B — Minimal patch set without session storage migration
- Fix TLS, bypass gating, dependency/audit surface, and rate limiting now; defer raw session-id redesign.
- Pros: smallest immediate diff.
- Cons: leaves a core auth/session weakness in place; weak risk reduction relative to review findings.

#### Option C — Full auth/session redesign before any targeted fixes
- Replace the current app-session persistence model and auth flow in one pass.
- Pros: potentially cleaner long-term architecture.
- Cons: too much churn, too much risk, and outside the agreed 5-issue scope.

### Preferred Option
- Option A

### Alternative Invalidation Rationale
- Option B does not adequately address the review’s session-secrecy finding.
- Option C over-expands scope and raises regression risk well beyond what is required to close the five findings.

## Pre-mortem (3 scenarios)
1. **Session migration logs users out or breaks session restore**
   - Failure: existing app sessions stop restoring after the hash-based lookup cutover.
   - Mitigation: use a compatibility bridge (dual-read / staged cutover), test refresh/revisit/logout/login paths before cleanup.
2. **Bypass hardening accidentally blocks intended local QA**
   - Failure: local auto-login/bypass no longer works in development, slowing verification.
   - Mitigation: explicitly preserve local-only bypass and document its env contract; add tests for local allow + non-local reject behavior.
3. **Rate limiting adds false positives or noisy UX regressions**
   - Failure: legitimate place lookup/entry attempts are rejected too aggressively.
   - Mitigation: start with bounded, conservative limits; verify expected retry/error behavior and monitor with logs.

## Expanded Test Plan
### Unit
- DB config tests for TLS behavior on local vs non-local connection strings.
- Session service tests for hash-only lookup / compatibility migration behavior.
- Auth service tests for local-only bypass policy and non-local hard-fail posture.
- Cache helper tests for TTL/size eviction.
- Rate-limit decision tests for lookup/entry endpoints.

### Integration
- targeted Vitest for auth/session/server API boundaries
- `pnpm test:run`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `pnpm audit --audit-level=moderate --prod`
- `git diff --check`

### E2E
- local login -> OTP verify -> session restore -> logout -> relogin
- place lookup -> place create -> refresh -> detail revisit -> overwrite review
- non-local env simulation for bypass-disabled behavior
- preview deploy smoke after dependency/runtime changes

### Observability
- confirm deploy logs no longer show unresolved authService type errors without explanation
- confirm auth/bypass/rate-limit events are distinguishable in logs
- confirm rate-limit rejects and session failures are visible enough to debug

## Work Objectives
1. Remove the most serious remote/runtime security gaps.
2. Harden session storage without unnecessary auth redesign.
3. Force bypass to remain a local-only testing tool unless an explicit future policy says otherwise.
4. Reduce avoidable dependency/audit surface in production installs.
5. Add abuse controls to write/lookup endpoints without breaking the current UX contract.

## Guardrails
### Must Have
- No frontend direct Supabase connection.
- No manual dashboard schema edits; migration files only.
- No broad auth flow rewrite beyond what is needed for session hardening.
- No production-facing bypass path that can be enabled casually by env drift.
- Verification after each risky slice, especially session/bypass changes.

### Must NOT Have
- Do not broaden into recommendation, UI redesign, or unrelated infra cleanup.
- Do not defer the raw-session-id finding if this plan is accepted for execution.
- Do not weaken local QA convenience more than necessary.
- Do not treat `pnpm audit` or Vercel builder warnings as “just tooling noise” without a documented disposition.

## Implementation Steps

### Step 1. Lock security policy decisions and add failing tests for the target posture
**Files / Context**
- `src/server/authService.ts`
- `api/_lib/_authService.ts`
- `src/server/appSessionService.ts`
- `api/_lib/_appSessionService.ts`
- related auth/session tests

**Actions**
- Define the target bypass policy as local-only by default; if a future non-local exception is ever needed, require an explicit separate policy/env gate rather than the current generic toggle.
- Define the target session policy as hash-based lookup rather than raw id lookup.
- Add/adjust tests first so the desired non-local bypass rejection and hash-based session lookup behavior are executable requirements.

**Acceptance Criteria**
- Tests describe the intended local-only bypass behavior and reject accidental non-local enablement.
- Tests describe the intended session lookup/storage contract before implementation changes begin.
- The executor has no ambiguity about bypass policy or session migration target state.

### Step 2. Fix remote DB TLS verification and dependency/audit surface
**Files / Context**
- `src/server/database.ts`
- `api/_lib/_database.ts`
- `package.json`
- `Makefile` (only if verification command references need adjustment)

**Actions**
- Replace `rejectUnauthorized: false` with a verified remote TLS posture that does not silently trust any certificate.
- Move `vercel` out of production dependencies into `devDependencies` if runtime use is truly local/dev-only.
- Re-run audit and capture what remains after the dependency-surface reduction.

**Acceptance Criteria**
- Non-local DB connections no longer disable certificate verification by default.
- `vercel` is no longer part of production dependency installation surface unless a runtime need is proven.
- Audit output is improved or any remaining findings are explicitly attributable and documented.

### Step 3. Migrate app sessions to hash-based lookup with a compatibility bridge
**Files / Context**
- `src/server/appSessionService.ts`
- `api/_lib/_appSessionService.ts`
- `supabase/migrations/20260322065245_phase1_place_auth_real_data_foundation.sql` or follow-up migration
- auth/session routes and tests

**Actions**
- Introduce a safe migration path from raw-id lookup to hash-based lookup.
- Prefer a staged compatibility strategy (for example dual-read or surrogate-row-id + hashed session token lookup) so current sessions are not broken abruptly.
- Update create/read/touch/revoke flows to stop treating raw session ids as the canonical DB lookup key.

**Acceptance Criteria**
- Active sessions are no longer recoverable from a DB read by reusing a raw row id as the bearer token.
- Session restore, logout, and revisit flows still pass after the migration.
- The migration path is explicit and rollback-conscious.

### Step 4. Lock bypass to local-only and harden place-entry/place-lookup abuse controls
**Files / Context**
- `src/server/authService.ts`
- `api/_lib/_authService.ts`
- `api/auth/request-otp.ts`
- `api/auth/verify-otp.ts`
- `api/place-entry.ts`
- `api/place-lookup.ts`
- `src/server/placeEntryService.ts`
- `src/server/placeLookupService.ts`

**Actions**
- Enforce the local-only bypass policy in code, not just in operator convention.
- Review whether verify/request endpoints need extra origin/environment safeguards around bypass token adoption.
- Add bounded caches and conservative rate limiting to place lookup/entry flows.

**Acceptance Criteria**
- Non-local runtime cannot accidentally permit bypass login through the old generic env path.
- place-entry and place-lookup have explicit abuse controls and bounded memory behavior.
- Existing valid local QA flows still work under the new guardrails.

### Step 5. Re-verify end to end and sync docs/evidence to the hardened posture
**Files / Context**
- `docs/05-sprints/sprint-20/qa.md`
- `docs/05-sprints/sprint-20/review.md`
- relevant artifacts under `artifacts/qa/`

**Actions**
- Re-run automated checks, local browser flows, preview deploy smoke, and audit.
- Update sprint docs so they reflect the true post-hardening posture and any remaining follow-up instead of downplaying unresolved warnings.
- Record any residual open issue that is intentionally deferred.

**Acceptance Criteria**
- Verification evidence is fresh and matches the final implementation state.
- Sprint docs no longer understate unresolved deploy/runtime warnings.
- The 5-issue hardening slice is either closed or leaves only explicitly documented residual risk.

## ADR
- **Decision:** Use a staged hardening plan: fix remote TLS posture and dependency surface first, then migrate session lookup to hash-based semantics with compatibility, then lock bypass to local-only and add abuse controls, followed by full reverification.
- **Drivers:** highest risk reduction first; minimal auth churn; explicit verifiability after each risky slice.
- **Alternatives considered:** defer session redesign; full auth/session rewrite first.
- **Why chosen:** it closes the high-risk findings while keeping the execution path bounded and rollback-aware.
- **Consequences:** requires migration/test work and may surface follow-up documentation or env-policy decisions, but avoids an unsafe “quick patch only” outcome.
- **Follow-ups:** if a non-local bypass exception is ever needed, define it as a separate policy change; if remaining audit findings persist after moving `vercel`, decide whether further toolchain upgrades belong in a separate slice.

## Open Decision Points
1. **Bypass policy:** default recommendation is hard-fail outside local; only reopen this if there is a clearly justified non-local operational need.
2. **Session migration strategy:** recommended direction is staged compatibility bridge rather than immediate hard cutover, but the exact dual-read / surrogate-key migration shape should be locked during implementation design before touching production-like session flows.
3. **Rate limiting mechanism:** in-process is simplest and fastest to ship, but it should be treated as a best-effort first pass on serverless/multi-instance deployments. If cross-instance consistency becomes necessary later, promote it to a shared persistence-backed limiter in a follow-up slice.

## Verification Commands
- `git diff --check`
- `pnpm test:run`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `pnpm audit --audit-level=moderate --prod`
- targeted auth/session tests
- targeted place-entry/place-lookup tests
- local integrated runtime smoke (`make dev`)
- preview deploy smoke (`pnpm exec vercel deploy --yes` plus authenticated preview checks)

## Success Criteria
- The 3 high-severity security findings are concretely addressed.
- `vercel` no longer inflates production audit/runtime surface without justification.
- place-entry/place-lookup have explicit abuse controls and bounded caches.
- docs and evidence match the hardened runtime reality.
- The final executor can proceed without guessing scope, sequencing, or verification.
