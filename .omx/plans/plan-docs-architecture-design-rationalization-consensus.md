# Plan - Docs Architecture / Design Rationalization (Consensus)

## Mode
- RALPLAN-DR SHORT
- Status: consensus recommendation

## Context
The repo currently treats architecture and design as separate source-of-truth layers. `docs/00-governance/docs-structure.md:52-64` assigns `02-architecture/` to domain/system/integration/security rules and `04-design/` to layout, breakpoint, UI state model, and flow-specific screen structure. `docs/00-governance/agent-workflow.md:20-43` also reads design above architecture in the source-of-truth hierarchy and points workers to specific files by task type (`docs/00-governance/agent-workflow.md:85-90`).

Current evidence suggests two distinct problems:
1. Architecture may feel fragmented, but the current four files already map to stable concerns: system boundary (`docs/02-architecture/system-context.md:3-58`), domain rules (`docs/02-architecture/domain-model.md:3-167`), external/runtime integration rules (`docs/02-architecture/integrations.md:3-90`), and security/ops rules (`docs/02-architecture/security-and-ops.md:3-84`).
2. Design docs are useful, but several files contain highly specific visual implementation details (for example button heights, colors, icon asset paths, hover timings, copy strings in `docs/04-design/browse-and-detail.md:14-105` and `docs/04-design/place-submission.md:21-88`) that can override the user's real design intent.

A recent governance decision already moved design out of architecture because their responsibilities differ (`docs/06-history/decisions.md:372-380`). Another decision made UI work screenshot-first so prose design guidance would not overtake user-provided references (`docs/06-history/decisions.md:46-54`, `docs/00-governance/agent-workflow.md:54-57`).

## RALPLAN-DR Summary

### Principles
1. Keep source-of-truth layers separate when they answer different classes of questions.
2. Optimize for lowest-maintenance documentation, not the lowest file count.
3. Design docs must preserve interaction contracts, not compete with screenshot/Figma fidelity.
4. Each retained doc must have a distinct update trigger and reader persona.
5. Temporary or reference-specific visual details should live with the reference or sprint context, not as permanent global doctrine.

### Decision Drivers
1. Reduce documentation friction without collapsing important boundaries.
2. Restore design fidelity so the user's actual design/reference wins over generic prose.
3. Preserve the repo's targeted reading workflow and conflict-handling model.

### Viable Options

#### Option A - Full consolidation
- Approach: Merge all architecture into one file and remove most or all design docs, leaving specs/user-flows as the main UI source of truth.
- Pros:
  - Lowest file count and easiest single-entry reading.
  - Reduces perceived fragmentation immediately.
- Cons:
  - Breaks current targeted-reading guidance in `agent-workflow.md:85-90`.
  - Mixes unrelated concerns (domain, security, integrations) into one update surface.
  - Removes a distinct place for interaction/state contracts.

#### Option B - Keep current structure, only trim content
- Approach: Keep architecture and design folders as-is, but delete obvious over-detail inside design docs.
- Pros:
  - Lowest migration cost.
  - Keeps existing links and workflow stable.
- Cons:
  - Does not solve the “where do I start?” problem for architecture.
  - Leaves very small design files and governance ambiguity in place.

#### Option C - Hybrid reduction (recommended)
- Approach: Keep architecture split by stable concern, add a lightweight overview/entrypoint, and keep design docs only as minimal interaction contracts. Merge/archive tiny design docs and strip pixel/token/asset micro-guides unless they are true product contracts.
- Pros:
  - Preserves current hierarchy while materially reducing noise.
  - Aligns with screenshot-first governance.
  - Gives both a single entrypoint and bounded per-concern docs.
- Cons:
  - Requires governance cleanup plus a small docs migration.
  - Needs discipline to prevent detail creep from returning.

## Multi-perspective Review

### Planner View
- The problem is not “too many docs” in the abstract; it is that the docs do not currently distinguish stable contract vs temporary styling guidance sharply enough.
- A hybrid change is small enough to execute safely and large enough to improve day-to-day usability.

### Architect View
- Strongest steelman for full merge: architecture is only ~399 lines total, so one file would still be readable and would give a clearer onboarding entrypoint.
- Tradeoff tension: onboarding simplicity vs selective maintenance. The same split that feels noisy to a reader is also what prevents domain/security/integration rules from drifting together.
- Synthesis: keep split architecture docs, but introduce one overview/TOC so readers can start in one place without merging the underlying concerns.

### Critic View
- Reject full merge because it conflicts with the repository's existing workflow assumptions unless governance docs are rewritten first.
- Approve only if the final plan includes explicit keep/remove criteria for design content, link-migration checks, and a clear decision on tiny design docs (`review.md`, `recommendation.md`).

## ADR

### Decision
Adopt Option C: keep architecture split by concern, add a lightweight architecture entrypoint, and keep `04-design/` only as minimal interaction-contract docs. Remove or relocate overly prescriptive visual micro-guides and merge/archive tiny design docs where their content is better owned elsewhere.

### Drivers
- Current governance already distinguishes architecture vs design responsibilities.
- Architecture files map cleanly to different reader tasks and update triggers.
- Screenshot-first design fidelity is already the preferred operating rule.
- Current design docs contain too many low-level visual instructions for a permanent canonical layer.

### Alternatives considered
- Option A: full consolidation into one architecture doc, with most design guidance removed.
- Option B: keep current folders and file set, but only prune wording.

### Why chosen
Option C gives the user the reduction they want without destroying the repository's source-of-truth layering. It solves the real pain point—overly detailed design prose—while preserving the useful part of design docs: screen/state/interaction contract. It also keeps architecture maintainable for security/domain/integration work, which are currently consumed separately by the workflow.

### Consequences
- Architecture remains multi-file, but with a simpler entrypoint.
- Design docs remain, but they become much shorter and stricter in scope.
- Some existing detail will move out of live design docs into references, sprint docs, specs, or be deleted outright.
- Governance docs must be updated so future contributors know what belongs in each layer.

### Follow-ups
- Add `docs/02-architecture/overview.md` as the single architecture entrypoint so `system-context.md` can keep its current responsibility without becoming a mixed overview/contract doc.
- Merge `docs/04-design/review.md` and `docs/04-design/recommendation.md` into `docs/04-design/browse-and-detail.md`, because both currently describe place-detail surface behavior rather than independent screen families.
- After user approval, record the structural decision in `docs/06-history/decisions.md` because this changes live documentation governance.

## Work Objectives
1. Reduce documentation surface area that does not carry long-lived product/interaction value.
2. Preserve only the architecture/design content needed for implementation and review.
3. Make visual fidelity reference-first so the user's design wins over prose defaults.

## Guardrails
### Must Have
- Keep architecture and design as distinct source-of-truth layers unless governance is intentionally rewritten.
- Keep design docs only for stable interaction contracts: screen set, responsive surface contract, state ownership, transition/failure rules, and a short reference-precedence note.
- Update governance docs before or alongside live-structure changes.

### Must Not Have
- Do not keep permanent design bullets that only describe temporary spacing, color tokens, hover timings, asset filenames, or button heights unless they are explicit product contracts.
- Do not leave tiny standalone docs whose entire content can live more clearly in an adjacent parent doc/spec.
- Do not silently change `docs/06-history/decisions.md` without explicit user approval, per workflow.

## Task Flow

### Step 1 - Freeze the documentation boundary rule
**Files**
- `docs/00-governance/docs-structure.md`
- `docs/00-governance/agent-workflow.md`

**Action**
- Add a concise rule for what belongs in architecture vs design after this rationalization.
- Add a specific “reference-first visual fidelity” rule so screenshot/Figma/reference overrides prose design micro-guides.

**Acceptance criteria**
- Governance docs explicitly define that architecture owns domain/system/integration/security constraints, while design owns only stable interaction contracts.
- Governance docs explicitly state that screenshot/Figma/reference takes precedence over design-detail prose for visual fidelity work.

### Step 2 - Keep architecture split, but make entry easier
**Files**
- `docs/02-architecture/overview.md`
- `docs/02-architecture/system-context.md`
- `docs/02-architecture/domain-model.md`
- `docs/02-architecture/integrations.md`
- `docs/02-architecture/security-and-ops.md`

**Action**
- Keep the split by concern.
- Add one lightweight architecture overview/TOC at `docs/02-architecture/overview.md` that tells readers which file to open for which question.
- Remove duplicate wording if any overlap is found during edit.

**Acceptance criteria**
- Each architecture file has a one-sentence ownership scope.
- A new reader can answer “which architecture doc should I open?” from one entrypoint.
- No architecture rule is duplicated across multiple files without an explicit reason.

### Step 3 - Shrink design docs to minimum viable contracts
**Files**
- `docs/04-design/foundations.md`
- `docs/04-design/auth-and-name-entry.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/place-submission.md`
- `docs/04-design/review.md`
- `docs/04-design/recommendation.md`

**Action**
- Keep only these rule types in design docs:
  - screen/state inventory
  - responsive surface contract
  - route/store ownership
  - critical transition/failure behavior
  - reference precedence note
- Remove pixel sizing, token/color trivia, asset file paths, hover timing, and short-lived copy/style details unless they are true contractual UI behavior.
- Merge `review.md` and `recommendation.md` into `browse-and-detail.md` so place-detail design behavior stays screen-centric instead of being split across tiny standalone docs.

**Acceptance criteria**
- Every remaining design bullet can be classified as one of: `screen`, `surface`, `state`, `transition`, `failure`, `contract`, `reference precedence`.
- No retained bullet exists solely to prescribe a visual token/value/asset path without contract significance.
- `docs/04-design/review.md` and `docs/04-design/recommendation.md` no longer exist as standalone live docs, and their surviving contract rules are represented inside `docs/04-design/browse-and-detail.md`.

### Step 4 - Rehome removed detail to the right place
**Files**
- Relevant `docs/03-specs/*.md`
- Current sprint docs if detail is sprint-scoped
- Reference assets or linked external design sources

**Action**
- Move enduring functional behavior to specs.
- Move sprint-specific or temporary detail to sprint docs.
- Keep reference-specific visual fidelity outside permanent prose when possible.

**Acceptance criteria**
- Removed design bullets are either deleted as noise or rehomed into a clearer source-of-truth layer.
- No important behavior is lost during trimming; only ownership changes.

### Step 5 - Verify links, history policy, and future maintainability
**Files**
- `docs/00-governance/docs-structure.md`
- `docs/00-governance/agent-workflow.md`
- affected design/architecture docs
- `docs/06-history/decisions.md` (after explicit user approval)

**Action**
- Run a docs link/reference pass.
- Verify workflow examples still point to valid docs.
- After approval, log the non-trivial governance decision in history.

**Acceptance criteria**
- All renamed/merged/archived doc links resolve.
- `agent-workflow.md:85-90` still points to valid, relevant docs for each work type.
- The final structural decision is recorded in `docs/06-history/decisions.md` only after user approval.

## Success Criteria
- The repo keeps a clear architecture/design split without unnecessary file sprawl.
- Architecture no longer feels fragmented because readers have a single entrypoint.
- Design docs stop overriding user-provided design intent.
- The remaining design docs are short, durable, and contract-oriented.

## Verification Steps
1. Read `docs/00-governance/docs-structure.md` and confirm placement rules still match the live structure.
2. Read `docs/00-governance/agent-workflow.md` and confirm task-type doc references are still valid.
3. Review each remaining `docs/04-design/*.md` line-by-line and classify retained bullets into the allowed contract categories.
4. Run repo-wide link/reference grep for moved or removed design docs.
5. Confirm any history entry is added only after user approves the structural change.

## Applied review improvements
- Added an explicit rejection of full architecture merge because it would break targeted workflow assumptions.
- Added keep/remove criteria for design-doc content instead of leaving “trim it” vague.
- Resolved the tiny-doc decision by merging `review.md` and `recommendation.md` into `browse-and-detail.md`.
- Added verification that task-type references in `agent-workflow.md` still work after the restructure.
