# Test Spec: Sprint 20 Vercel Function Limit Resolution

## Objective
Verify that the structural cleanup for Vercel Preview deployment removes accidental deploy-counted files without regressing local testability or Sprint 20 documentation accuracy.

## References
- `.omx/plans/plan-sprint-20-vercel-function-limit-consensus.md`
- `.omx/plans/prd-sprint-20-vercel-function-limit-resolution.md`
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
- moved API route tests from `api/` to their new non-deploy path
- `vercel.json`
- `.vercelignore`
- `docs/05-sprints/sprint-20/qa.md`
- `docs/05-sprints/sprint-20/review.md`

## Verification Scope
- Deploy-surface inventory under `api/`
- Moved API route tests still executing from a non-deploy path
- `.vercelignore` exclusion coverage for tests/artifacts/noise
- Standard repo verification (`make check`)
- Preview deployment retry result
- Sprint 20 docs sync with actual outcome

## Automated Test Matrix
| Area | Assertion |
|---|---|
| API inventory | `api/` contains only runtime `.ts` entrypoints and `_lib` helpers; no `.test.ts` files remain |
| Test relocation | moved route tests import handlers/helpers correctly and still pass |
| Ignore rules | `.vercelignore` excludes `*.test.*`, `artifacts/`, and other deployment-irrelevant noise without excluding required app/runtime files |
| Repo health | `make check` passes after the move |
| Deployment outcome | `pnpm exec vercel deploy --yes` succeeds or yields a new concrete blocker distinct from the 12-function-limit error |
| Sprint docs sync | `qa.md` and `review.md` describe the actual remediation and current result without ambiguity |

## Proposed Test Files
- `src/server/apiAuthSessionRoutes.test.ts`
- `src/server/apiAuthVerifyOtp.test.ts`
- `src/server/apiPlaceEntryRoute.test.ts`
- `src/server/apiPlaceListRoute.test.ts`
- `src/server/apiPlaceReviewRoute.test.ts`

## Static / Repo Checks
- `git diff --check`
- `pnpm exec vitest run src/server/apiAuthSessionRoutes.test.ts src/server/apiAuthVerifyOtp.test.ts src/server/apiPlaceEntryRoute.test.ts src/server/apiPlaceListRoute.test.ts src/server/apiPlaceReviewRoute.test.ts`
- `make check`
- `find api -maxdepth 3 -type f | sort`
- `cat .vercelignore`

## AI Agent Interactive QA
- Explain why the moved tests are no longer plausible Vercel function candidates.
- Explain what `.vercelignore` excludes and why those exclusions are safe.
- Explain whether Preview deployability is restored or which exact blocker remains.

## Browser Automation QA
- If Preview deploy succeeds, smoke-check `/`, `/places/:placeId`, and static asset boot using the resulting Preview URL.
- If deployment remains blocked, record the blocker instead of fabricating Preview evidence.

## Observability Checks
- Save before/after API inventory and deploy results under `artifacts/qa/sprint-20/`.
- Preserve the deployment error/output that proves the current blocker status.

## Risks To Watch
1. Route tests break because mock paths change after relocation.
2. `.vercelignore` accidentally excludes files needed for build/runtime.
3. The 12-function error persists because Vercel counts something other than the moved tests.
4. Preview deploy succeeds but a separate boot/rewrite issue appears immediately after.

## Exit Signal
- Moved route tests pass.
- `make check` passes.
- `api/` inventory is clean.
- `.vercelignore` is present and sane.
- Preview deployment result is freshly captured.
- Sprint 20 QA/review docs match the real outcome.
