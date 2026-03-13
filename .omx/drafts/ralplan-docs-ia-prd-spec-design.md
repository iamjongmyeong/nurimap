# RALPLAN Draft - Docs IA: PRD / Specs / Design Split

## Context
This recommendation answers three documentation IA questions for this repo:
1. Should `docs/01-product/user-flows/` be renamed to PRD?
2. Should PRD and specs be merged into one document type?
3. Is keeping design docs split under `docs/04-design/` the right choice?

Grounding evidence:
- `docs/00-governance/docs-structure.md:47-63` assigns distinct roles: `01-product/` for product goals/principles/user flows, `03-specs/` for long-lived feature specs and acceptance criteria, and `04-design/` for layout/state-model/flow-specific UI structure.
- `docs/00-governance/agent-workflow.md:19-42` operationalizes those as separate source-of-truth layers: specs first for feature requirements, user flows next for scenario/failure semantics, design after that for UI structure and interaction rules.
- Representative user-flow docs define scenario logic, rules, and failure expectations rather than build contracts: `docs/01-product/user-flows/browse-and-detail.md:3-29`, `docs/01-product/user-flows/auth-and-name-entry.md:3-46`.
- Representative spec docs define functional requirements, acceptance criteria, TDD order, required tests, and QA: `docs/03-specs/02-map-rendering.md:13-55`, `docs/03-specs/03-list-browse.md:12-68`, `docs/03-specs/05-auth-email-login-link.md:17-209`.
- Representative design docs define screen/layout structure and interaction presentation, linked to their matching flow/spec docs: `docs/04-design/browse-and-detail.md:5-68`, `docs/04-design/auth-and-name-entry.md:5-43`.
- A prior decision already split design from architecture and aligned flow-specific design docs to user-flow slugs: `docs/06-history/decisions.md:340-348`.
- Higher-level product-definition material already exists in `docs/01-product/product-overview.md:9-18,36-76` and `docs/01-product/product-principles.md:12-30`.

## Analyst Pass
- The core risk is confusing a naming debate with a document-function debate. In this repo, the documents already have differentiated jobs; renaming only helps if it improves retrieval and interpretation.
- The most important hidden constraint is source-of-truth ordering. If product flows, specs, and design are collapsed or ambiguously renamed, `agent-workflow.md:19-42` becomes harder to apply consistently.
- Because `product-overview.md` and `product-principles.md` already play the higher-level product-definition role, introducing “PRD” as a global replacement label would duplicate meaning unless it is narrowly scoped.

## RALPLAN-DR Summary

### Principles
1. Prefer document-function clarity over borrowed process terminology.
2. Keep source-of-truth order legible to humans and agents.
3. Minimize taxonomy entropy: change names only when they reduce ambiguity more than they create migration cost.
4. Keep flow, spec, and design concerns separately editable when they change at different rates.
5. Preserve local repo language when it is already working; only add external jargon as an alias, not a replacement.

### Decision Drivers
1. **Interpretation clarity**: can a reader infer what belongs in each document before opening it?
2. **Operational fit**: does the structure still match the repo’s workflow and source-of-truth hierarchy?
3. **Change isolation**: can product flow, implementation contract, and UI structure evolve without forcing noisy multi-doc rewrites?

### Viable Options

#### Option A — Keep the current three-layer model (recommended)
**Shape**
- Keep `docs/01-product/user-flows/` as-is.
- Keep specs separate in `docs/03-specs/`.
- Keep design separate in `docs/04-design/`.
- If needed, explain in governance docs that user-flow docs serve the “feature narrative / product intent” role without renaming them to PRD.

**Pros**
- Best match for current written contracts in `docs-structure.md` and `agent-workflow.md`.
- Preserves the current source-of-truth stack: spec -> user-flow -> design.
- Matches actual content shapes in representative files.
- Avoids cargo-cult “PRD” labeling when the repo already distinguishes product overview/principles from flow docs.
- Respects the 2026-03-10 decision that intentionally split design docs out and aligned them to flows.

**Cons**
- New contributors familiar with “PRD” may need a brief explanation that user-flow docs are the scenario-level product layer.
- “user-flows” can sound narrower than the actual content when a file also carries rules and failure expectations.

#### Option B — Rename `user-flows/` to `prd/`, but keep specs and design separate
**Shape**
- Rename `docs/01-product/user-flows/` to something like `docs/01-product/prd/`.
- Keep `03-specs/` and `04-design/` unchanged.

**Pros**
- Familiar term for teams used to PRD-driven workflows.
- Signals that these docs are upstream of implementation specs.

**Cons**
- The current files are not broad product requirement documents; they are per-flow scenario docs with rules/failure expectations.
- Risks collision with `product-overview.md` and `product-principles.md`, which already cover higher-level product-definition territory.
- Adds rename churn without solving a functional problem in the current workflow.
- “PRD” is less descriptive than “user-flows” for these particular documents.

#### Option C — Merge product flow and spec into one feature dossier, keep design separate
**Shape**
- For each feature, combine scenario flow + functional requirements + acceptance criteria + test order into one document, while leaving `04-design/` separate.

**Pros**
- One-stop reading per feature.
- Fewer cross-links for narrowly scoped features.

**Cons**
- Blurs narrative intent vs implementation contract.
- Makes source-of-truth precedence harder to reason about because one document must serve both exploratory and executable roles.
- Increases edit contention: small acceptance-criteria changes and scenario clarifications now touch the same document.
- Conflicts with the current workflow’s explicit separation of product-flow, spec, and design layers.

## Recommendation

### 1) Rename `docs/01-product/user-flows/` to PRD?
**Recommendation: No.**
Keep `user-flows/` as the canonical directory name.

**Why**
- The folder’s current documented purpose is “core user flows,” not generic product requirements (`docs/00-governance/docs-structure.md:47-49`).
- The files themselves read like scenario/flow documents with rules and failure expectations, not full PRDs (`docs/01-product/user-flows/browse-and-detail.md:10-29`, `docs/01-product/user-flows/auth-and-name-entry.md:10-46`).
- High-level product-definition already exists in `product-overview.md` and `product-principles.md`, so “PRD” would be a naming overlay rather than a truer description (`docs/01-product/product-overview.md:9-18,36-76`, `docs/01-product/product-principles.md:12-30`).

**Optional hybrid**
- If external familiarity matters, add a short note in governance docs such as: “`user-flows/` is the repo’s scenario-level product requirements layer.” That gains discoverability without renaming the structure.

### 2) Merge PRD and specs into one document type?
**Recommendation: No, not globally.**
Keep product flow docs and specs as separate document types.

**Why**
- The workflow explicitly depends on different roles: specs fix functional requirements and verification; user flows fix scenario logic and failure flow (`docs/00-governance/agent-workflow.md:22-39`).
- Specs in this repo are materially different in shape and purpose: they carry functional requirements, acceptance criteria, TDD order, required tests, manual QA, and QA evidence (`docs/03-specs/02-map-rendering.md:13-55`, `docs/03-specs/03-list-browse.md:12-68`, `docs/03-specs/05-auth-email-login-link.md:17-209`).
- Merging would reduce entropy only superficially; in practice it would combine two kinds of change that move at different speeds.

**Bounded exception**
- A tiny feature could live as a single spec if it truly does not need a separate flow doc, but that should be an exception, not a taxonomy rewrite.

### 3) Keep design docs split under `docs/04-design/`?
**Recommendation: Yes.**
Keep `docs/04-design/` as a separate layer, with the current revisit trigger preserved.

**Why**
- This matches the explicit structure rule that `04-design/` owns layout, breakpoint, state model, and flow-specific screen structure (`docs/00-governance/docs-structure.md:60-63`).
- Design docs are used as a distinct context layer in the workflow (`docs/00-governance/agent-workflow.md:24-39,77-82`).
- The current design files clearly do UI/screen structure work rather than product or implementation-contract work (`docs/04-design/browse-and-detail.md:12-68`, `docs/04-design/auth-and-name-entry.md:17-43`).
- The 2026-03-10 decision already justified this split and defined a revisit rule: revisit only if design docs re-concentrate into a monolith or a component-system-centric structure becomes more appropriate (`docs/06-history/decisions.md:340-348`).

## Architect Review (sequential pass)
**Steelman counterargument against Option A**
- A repository with `product-overview`, `product-principles`, `user-flows`, `specs`, and `design` may feel over-layered. Renaming `user-flows` to `prd` or merging flow+spec could reduce the number of conceptual buckets for new contributors.

**Tradeoff tension**
- There is a real tension between external familiarity (“PRD”, fewer buckets) and local precision (documents named after what they actually contain).

**Synthesis**
- Preserve the current structure, but clarify the glossary in governance docs if onboarding confusion appears. That keeps the low-entropy architecture while answering the discoverability concern with documentation, not taxonomy churn.

## Critic Review (sequential pass)
**Verdict: APPROVE with one refinement**
- The recommendation is consistent with the stated principles and grounded in the repo’s actual file roles.
- The strongest improvement is to make the revisit rule explicit for future reconsideration so the recommendation is not treated as dogma.

**Applied refinement**
- Add a concrete revisit trigger below.

## Revisit Rule
Revisit this IA only if one of the following becomes true:
1. Multiple contributors repeatedly misfile flow docs vs specs despite a short glossary note.
2. Most feature work starts needing a single tightly coupled narrative+spec artifact, making split docs mostly mechanical duplication.
3. Design docs shift from flow-level UI structure to a component-system/design-system library, making the current `04-design/` organization too flow-centric.

## Work Objectives
1. Preserve a documentation taxonomy that matches current document function.
2. Avoid introducing “PRD” terminology where it would overlap with existing product-definition documents.
3. Keep the source-of-truth hierarchy executable for both humans and AI agents.

## Guardrails
### Must Have
- Recommendation answers all three questions directly.
- Rationale stays grounded in current repo docs.
- Any structural change path is minimal and optional.

### Must NOT Have
- No generic agile/process advice detached from repo evidence.
- No mandatory rename or merge without a demonstrated functional problem.
- No reversal of the 2026-03-10 design split without new evidence.

## Task Flow
1. Confirm current documented roles and hierarchy.
   - Acceptance criteria: references in `docs-structure.md` and `agent-workflow.md` support each claimed layer.
2. Evaluate naming vs function for `user-flows/`.
   - Acceptance criteria: recommendation distinguishes folder label from actual content shape.
3. Evaluate merge vs split for flow/spec/design.
   - Acceptance criteria: at least two viable options are assessed with bounded pros/cons.
4. Land a minimal-entropy recommendation with revisit triggers.
   - Acceptance criteria: final recommendation includes concrete answers, ADR, and optional minimal change path only if needed.

## Detailed TODOs
1. Keep `docs/01-product/user-flows/` unchanged as the canonical name.
   - Acceptance criteria: recommendation explicitly says “do not rename to PRD” and cites why.
2. Keep product-flow docs and specs as separate document types.
   - Acceptance criteria: recommendation explicitly says “do not merge globally” and cites workflow/source-of-truth impact.
3. Keep `docs/04-design/` separate.
   - Acceptance criteria: recommendation explicitly says “keep the split” and cites the existing decision plus revisit trigger.
4. Optionally add a glossary note later if onboarding confusion persists.
   - Acceptance criteria: no directory migration is required now; any future change is limited to governance wording.

## Success Criteria
- A maintainer can answer all three IA questions in under a minute.
- The recommendation is consistent with the current docs hierarchy and representative file contents.
- The plan recommends no structural migration unless a real confusion signal appears.

## Verification
- Check that every recommendation maps to at least one governing doc citation and at least one representative-content citation.
- Check that the favored option still works with `docs/00-governance/agent-workflow.md:19-42` without rewriting the source-of-truth hierarchy.
- Check that the design recommendation does not contradict `docs/06-history/decisions.md:340-348`.

## Minimal Implementation Path (only if the team wants a tiny clarity improvement)
No structural change is recommended.

Optional follow-up only:
1. Add one sentence to `docs/00-governance/docs-structure.md` or `docs/00-governance/agent-workflow.md` clarifying that `docs/01-product/user-flows/` is the repo’s scenario-level product requirements layer.
2. Do not rename folders or merge document types unless the revisit rule triggers.

## ADR
- **Decision:** Keep `docs/01-product/user-flows/`, `docs/03-specs/`, and `docs/04-design/` as distinct document layers; do not rename `user-flows/` to PRD; do not merge flow docs and specs globally.
- **Drivers:** interpretation clarity; operational fit with current workflow; change isolation.
- **Alternatives considered:** rename `user-flows/` to PRD while keeping specs/design split; merge flow docs and specs into a single feature dossier while keeping design separate.
- **Why chosen:** the current taxonomy already matches actual document function and the workflow depends on that separation. Renaming or merging would add ambiguity faster than it removes it.
- **Consequences:** onboarding may need a short glossary note, but the repo avoids migration churn and keeps source-of-truth precedence legible.
- **Follow-ups:** only add a glossary note if contributors show repeated confusion; otherwise leave the structure unchanged.

## Changelog
- Added explicit revisit triggers after critic pass.
- Kept the recommendation intentionally minimal: no structural migration path because the evidence does not justify one.
