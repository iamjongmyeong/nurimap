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
- Production env readiness inspection

Excluded by default:
- Preview deploy/smoke execution
- Production smoke execution
- Preview/Development env inspection

## Canonical QA scripts

Run and refresh these artifacts:

```bash
node scripts/qa/deploy-guard/run-playwright-real-user-flow.mjs
node scripts/qa/deploy-guard/run-playwright-edge-user-actions.mjs
```

Expected result files:
- `artifacts/qa/deploy-guard/playwright-real-user-flow-result.json`
- `artifacts/qa/deploy-guard/playwright-edge-user-actions-result.json`

## Production env gate

Treat missing or invalid required categories as `HOLD`.

Required categories:
- `DATABASE_URL` or `POSTGRES_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `PUBLIC_APP_URL`

Conditional category:
- `DATABASE_SSL_ROOT_CERT` when your Production DB provider requires a custom CA bundle

## `.vercelignore` gate

Treat the gate as `HOLD` when:
- `.vercelignore` is missing
- critical ignore rules are missing (`**/*.test.*`, `artifacts/`, `.omx/`, `.codex/`)
- runtime-critical paths are ignored (`src/`, `api/`, `public/`, `package.json`, `vercel.json`, `index.html`)

## Manual QA semantics

Use `MANUAL QA REQUIRED` whenever user judgment or approval is still needed, even if automated checks pass.

Common cases:
- Production env evidence could not be gathered cleanly
- The automated gate is clear, but the user still wants to decide whether to proceed

## Recommended evaluator command

```bash
python3 .codex/skills/qa-deploy-guard/scripts/evaluate_release_gate.py \
  --real-user-flow artifacts/qa/deploy-guard/playwright-real-user-flow-result.json \
  --edge-user-actions artifacts/qa/deploy-guard/playwright-edge-user-actions-result.json \
  --vercelignore .vercelignore \
  --env-file /path/to/production.env
```
