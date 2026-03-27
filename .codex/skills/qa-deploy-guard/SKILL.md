---
name: qa-deploy-guard
description: "Run Nurimap's explicit pre-deploy release gate by executing the canonical local integrated Playwright QA scripts, refreshing artifacts, checking `.vercelignore`, and verifying Production env readiness before a Vercel deploy decision. Use when Codex needs a GO/HOLD/MANUAL QA REQUIRED verdict for deploy safety without running Preview or Production smoke."
---

# QA Deploy Guard

Use this skill when you need a **local-first release gate** before a Vercel deploy.

It reuses the existing pre-deploy Playwright coverage, refreshes the result artifacts, inspects `.vercelignore`, checks Production env readiness, and then emits exactly one verdict:

- `GO`
- `HOLD`
- `MANUAL QA REQUIRED`

## Do this

### 1. Confirm the scope first

- Treat this as a **pre-deploy gate**, not a deploy step.
- Stay in **local integrated regression + Production env readiness + `.vercelignore` inspection**.
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

If either script fails, stop and emit `HOLD`.

### 3. Gather the Production env evidence

- Prefer a pulled or exported Production env snapshot file over hand-copying values.
- If Vercel CLI access is available, inspect Production env with the repo's established `vercel env ls` workflow and create a temporary env snapshot for deterministic checking.
- If no env snapshot can be obtained, do **not** assume `GO`. Use `MANUAL QA REQUIRED` unless another blocker already forces `HOLD`.

### 4. Run the deterministic gate evaluator

Use the bundled evaluator to combine:

- refreshed QA result JSON
- `.vercelignore`
- Production env snapshot or current process env

```bash
python3 .codex/skills/qa-deploy-guard/scripts/evaluate_release_gate.py \
  --real-user-flow artifacts/qa/deploy-guard/playwright-real-user-flow-result.json \
  --edge-user-actions artifacts/qa/deploy-guard/playwright-edge-user-actions-result.json \
  --vercelignore .vercelignore \
  --env-file /path/to/production.env
```

Read `.codex/skills/qa-deploy-guard/references/release-gate-contract.md` when you need the exact checklist or verdict contract.

### 5. Emit the final verdict

Use these rules:

- Emit `HOLD` when:
  - either Playwright script fails
  - `.vercelignore` is missing critical ignore rules or ignores runtime-critical files
  - required Production env categories are missing or invalid
- Emit `MANUAL QA REQUIRED` when:
  - the automated gate is clear, **but** user judgment or approval is still required
  - Production env evidence could not be gathered cleanly
- Emit `GO` only when:
  - automated checks are clear
  - no blocker is present
  - no pending user-judgment gate remains

## Do not do this

- Do not run Preview smoke from this skill.
- Do not run Production smoke from this skill.
- Do not silently change the verdict model.
- Do not rewrite the existing QA scripts unless a concrete coverage gap is identified.
- Do not treat a local pass as stronger than Production env or `.vercelignore` blockers.

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
- Production env: pass/fail/manual
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
