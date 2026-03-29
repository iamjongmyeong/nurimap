# QA Deploy Guard Contract

## Canonical verdicts

- `GO`
- `HOLD`
- `MANUAL QA REQUIRED`

Never emit any other top-level verdict.

## Scope

Included:
- Local integrated regression
- `.vercelignore` inspection
- local env readiness inspection

Excluded by default:
- Preview deploy/smoke execution
- Production smoke execution
- Preview/Production env inspection

## Canonical QA scripts

Run and refresh these artifacts:

```bash
node scripts/qa/deploy-guard/run-playwright-real-user-flow.mjs
node scripts/qa/deploy-guard/run-playwright-edge-user-actions.mjs
```

Expected result files:
- `artifacts/qa/deploy-guard/playwright-real-user-flow-result.json`
- `artifacts/qa/deploy-guard/playwright-edge-user-actions-result.json`

## Canonical regression expectations

The refreshed local regression coverage should track the current product contract. At the current repo baseline, make sure the combined Playwright coverage exercises:

- desktop add-place happy path via `place-add-url-entry-screen` first, then `직접 입력하기`, then successful manual submit
- mobile authenticated root opening on the list-first browse surface
- mobile add-place success from a map-origin flow, with back navigation restoring the map-origin context
- at least one deterministic URL-entry negative path:
  - `invalid_url` staying on URL-entry with inline error, and/or
  - forced `lookup_failed` falling back to the manual form

## Local env gate

Treat missing or invalid required categories as `HOLD`.

Required categories:
- `DATABASE_URL` or `POSTGRES_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_APP_URL`

Conditional category:
- `DATABASE_SSL_ROOT_CERT` when your Production DB provider requires a custom CA bundle

Feature-critical follow-up categories when recent changes touch browse / map / place-add slices:
- `PUBLIC_KAKAO_MAP_APP_KEY`
- `KAKAO_REST_API_KEY`

These two values do not automatically change the top-level verdict by themselves in the default evaluator, but the guard report should call them out when the target release depends on map bootstrap or server-side geocoding/place-entry behavior.

## `.vercelignore` gate

Treat the gate as `HOLD` when:
- `.vercelignore` is missing
- critical ignore rules are missing (`**/*.test.*`, `artifacts/`, `.omx/`, `.codex/`)
- runtime-critical paths are ignored (`src/`, `api/`, `public/`, `package.json`, `vercel.json`, `index.html`)

## Manual QA semantics

Use `MANUAL QA REQUIRED` whenever user judgment or approval is still needed, even if automated checks pass.

Common cases:
- local env evidence could not be gathered cleanly
- The automated gate is clear, but the user still wants to decide whether to proceed

## Recommended evaluator command

```bash
python3 .codex/skills/qa-deploy-guard/scripts/evaluate_release_gate.py \
  --real-user-flow artifacts/qa/deploy-guard/playwright-real-user-flow-result.json \
  --edge-user-actions artifacts/qa/deploy-guard/playwright-edge-user-actions-result.json \
  --vercelignore .vercelignore \
  --env-file .env.local
```
