---
name: qa-deploy-guard
description: "Run Nurimap's explicit local-first pre-deploy release gate by executing the canonical local integrated Playwright QA scripts, refreshing artifacts, checking `.vercelignore`, and verifying local runtime env readiness from `.env.local` or an equivalent local env snapshot before a deploy decision. Use when Codex needs a GO/HOLD/MANUAL QA REQUIRED verdict for local deploy safety without running Preview or Production smoke."
---

# QA Deploy Guard

Use this skill when you need a **local-first release gate** before a Vercel deploy.

It reuses the existing pre-deploy Playwright coverage, refreshes the result artifacts, inspects `.vercelignore`, checks local runtime env readiness, and then emits exactly one verdict:

- `GO`
- `HOLD`
- `MANUAL QA REQUIRED`

## Do this

### 1. Confirm the scope first

- Treat this as a **pre-deploy gate**, not a deploy step.
- Stay in **local integrated regression + local env readiness + `.vercelignore` inspection**.
- Do **not** broaden scope to Preview smoke or Production smoke unless the user explicitly changes the contract.

### 2. Run the canonical local regression scripts

Run these scripts exactly as the repo currently defines them:

```bash
node scripts/qa/deploy-guard/run-playwright-real-user-flow.mjs
node scripts/qa/deploy-guard/run-playwright-edge-user-actions.mjs
```

Expected refreshed artifacts:

- `artifacts/qa/deploy-guard/playwright-real-user-flow-result.json`
- `artifacts/qa/deploy-guard/playwright-real-user-flow-success.png`
- `artifacts/qa/deploy-guard/playwright-edge-user-actions-result.json`

These scripts should reflect the current product contract. In the current repo state, that means the refreshed coverage must include at least:

- desktop add-place happy path through **URL-entry-first -> 직접 입력하기 -> manual submit -> detail**
- mobile **list-first root** expectations after auth
- mobile add-place success from **map origin**, with back navigation restoring the map-origin context
- a deterministic URL-entry negative path (`invalid_url` inline error and/or forced `lookup_failed` -> manual fallback)

If either script fails, stop and emit `HOLD`.

### 3. Gather the local env evidence

- Prefer `.env.local` itself or a temporary local env snapshot derived from `.env.local` (and `.env` when relevant) over hand-copying values.
- If you need a deterministic merged snapshot, source the local env files into a temporary file and point the evaluator at that file.
- If no env snapshot can be obtained, do **not** assume `GO`. Use `MANUAL QA REQUIRED` unless another blocker already forces `HOLD`.
- If the recent change window touches browse / map / place-add behavior, also record whether feature-critical envs such as `PUBLIC_KAKAO_MAP_APP_KEY` and `KAKAO_REST_API_KEY` are intentionally present or intentionally not required for this release slice.

### 4. Run the deterministic gate evaluator

Use the bundled evaluator to combine:

- refreshed QA result JSON
- `.vercelignore`
- local env snapshot or current process env

```bash
python3 .codex/skills/qa-deploy-guard/scripts/evaluate_release_gate.py \
  --real-user-flow artifacts/qa/deploy-guard/playwright-real-user-flow-result.json \
  --edge-user-actions artifacts/qa/deploy-guard/playwright-edge-user-actions-result.json \
  --vercelignore .vercelignore \
  --env-file .env.local
```

Read `.codex/skills/qa-deploy-guard/references/release-gate-contract.md` when you need the exact checklist or verdict contract.

### 5. Emit the final verdict

Use these rules:

- Emit `HOLD` when:
  - either Playwright script fails
  - `.vercelignore` is missing critical ignore rules or ignores runtime-critical files
  - required local env categories are missing or invalid
- Emit `MANUAL QA REQUIRED` when:
  - the automated gate is clear, **but** user judgment or approval is still required
  - local env evidence could not be gathered cleanly
- Emit `GO` only when:
  - automated checks are clear
  - no blocker is present
  - no pending user-judgment gate remains

## Do not do this

- Do not run Preview smoke from this skill.
- Do not run Production smoke from this skill.
- Do not silently change the verdict model.
- Do not rewrite the existing QA scripts unless a concrete coverage gap is identified.
- Do not treat a local pass as stronger than local env or `.vercelignore` blockers.

## Output contract

Return a concise evidence-backed report in this shape:

```markdown
## Verdict
- Final verdict: GO | HOLD | MANUAL QA REQUIRED
- Automated gate: GO_CANDIDATE | HOLD

## Evidence
- Local regression:
  - real-user-flow: pass/fail
  - edge-user-actions: pass/fail
- .vercelignore: pass/fail
- Local env: pass/fail/manual
- Refreshed artifacts:
  - ...

## Reasons
- ...

## Manual follow-ups
- ...
```

## Resources

- Deterministic evaluator:
  - `.codex/skills/qa-deploy-guard/scripts/evaluate_release_gate.py`
- Checklist / semantics reference:
  - `.codex/skills/qa-deploy-guard/references/release-gate-contract.md`
