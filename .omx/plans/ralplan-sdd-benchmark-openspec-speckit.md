# Initial Consensus Draft — Spec-Driven Workflow Benchmark vs OpenSpec / Spec Kit / Single-Chat

## Status
- Mode: RALPLAN-DR short
- Draft type: initial consensus draft for subsequent Architect/Critic review
- Scope: evaluation + recommendation artifact only; no implementation

## Context
Evaluate this repo’s current spec-driven workflow against three external baselines:
1. OpenSpec-style lightweight change-scoped spec workflow
2. Spec Kit-style structured specify/clarify/plan/tasks workflow
3. Lightweight single-chat / vibe-coding execution

The goal is not to replace the repo’s docs system with a fashionable framework. The goal is to determine what is objectively working, what is missing, and which low-entropy improvements would most improve execution quality.

## Evidence Base

### Current repo evidence
- The repo deliberately separates governance, product/user-flow, architecture, specs, design, sprint execution, and history into stable layers (`docs/00-governance/docs-structure.md:7-25,40-81`).
- `agent-workflow.md` operationalizes those layers with an explicit source-of-truth order: current sprint planning first, then selected specs, then user flows, design, architecture, and finally history (`docs/00-governance/agent-workflow.md:19-42`).
- The workflow is intentionally spec-centric for execution: agents are told to consume spec summary, scope, functional requirements, acceptance criteria, required tests, manual QA, and QA evidence in order (`docs/00-governance/agent-workflow.md:84-106`).
- Representative specs are unusually executable: they include AI-agent instructions, acceptance criteria, TDD order, required test cases, manual QA, and QA evidence (`docs/03-specs/01-app-shell-and-layout.md:19-77`, `docs/03-specs/02-map-rendering.md:13-56`, `docs/03-specs/03-list-browse.md:12-68`, `docs/03-specs/05-auth-email-login-link.md:71-209`).
- User-flow docs capture scenario logic, rules, and failure expectations separately from executable specs (`docs/01-product/user-flows/browse-and-detail.md:10-29`, `docs/01-product/user-flows/auth-and-name-entry.md:10-46`).
- Design docs capture layout/state/interaction structure separately again, including shared state models and UI invariants (`docs/04-design/foundations.md:19-52`, `docs/04-design/browse-and-detail.md:12-68`, `docs/04-design/auth-and-name-entry.md:17-43`).
- The system is sprint-anchored: `planning.md`, `qa.md`, and `review.md` are the fixed execution documents for a sprint (`docs/00-governance/docs-structure.md:102-170`).
- The spec lifecycle says existing specs should usually be updated when feature identity is preserved, rather than creating new feature-change artifacts by default (`docs/00-governance/docs-structure.md:94-100`).
- Non-trivial decisions are recorded in a history log, including workflow-level structure changes such as splitting design docs from architecture (`docs/00-governance/agent-workflow.md:57-61`, `docs/06-history/decisions.md:340-358`).

### External evidence base supplied for this evaluation
- **OpenSpec official summary:** lightweight spec-driven framework; each change gets dedicated proposal/design/tasks/spec-delta artifacts; strong brownfield orientation; specs live with code; lighter than Spec Kit; better than single-chat for multi-session/shareable change tracking.
- **Spec Kit official summary:** more structured workflow with constitution, specify, clarify, plan, tasks, implement; feature-scoped artifacts under `.specify/specs/<id>/`; stronger clarification and task-decomposition ceremony.
- **OpenAI Codex guidance summary:** for large changes, begin with a plan and use structured issue-like prompts with iterative refinement rather than pure one-shot execution.

## Analyst Pass
- The repo already has a strong long-lived information architecture. The main question is not “Should this repo become OpenSpec or Spec Kit?” but “Where does the current system lose fidelity compared with change-scoped workflows?”
- The strongest hidden strength is that Nurimap’s specs are already closer to executable contracts than many framework-generated specs, because they include TDD order, required tests, manual QA, and evidence sections.
- The strongest hidden weakness is that traceability is layered by doc type and sprint, not centered on a single change packet. That means a future reader can reconstruct intent, but not always by opening one artifact.
- Therefore, the most plausible winning path is additive rather than replacement: preserve the current layered docs, add a lighter change-scoped overlay where it materially improves traceability.

## RALPLAN-DR Summary

### Principles
1. Preserve the repo’s current document-function separation when it is already doing useful work.
2. Prefer additive traceability over full methodology replacement.
3. Optimize for brownfield iteration and multi-session continuity, not ceremony for its own sake.
4. Keep verification strong: any adopted pattern should reinforce acceptance/test/QA linkage, not dilute it.
5. Route by change size: tiny fixes should stay lightweight; medium/large changes should become more traceable.

### Decision Drivers
1. **Traceability gap** — can one change be understood from proposal through verification without reconstructing it across multiple files?
2. **Ceremony cost** — how much process overhead is added relative to current repo velocity and repo size?
3. **Fit with existing docs IA** — can the improvement sit on top of `governance -> product/user-flow -> specs -> design -> sprint/history` without breaking the current source-of-truth hierarchy?

### Viable Options

#### Option A — Keep current workflow exactly as-is
**Approach**
- Keep the current sprint-first, layered docs workflow with no new change artifact.

**Pros**
- Zero migration cost.
- No governance or doc-shape changes.
- Preserves current source-of-truth rules perfectly.

**Cons**
- Leaves the main weakness untouched: per-change traceability across sessions remains fragmented.
- Sprint plans may continue to carry several unrelated change narratives.

#### Option B — Keep current workflow, but enforce it more strictly
**Approach**
- No new artifact type.
- Tighten current sprint planning discipline, require better linking between sprint planning, touched specs, QA, and decisions.

**Pros**
- Lowest-entropy improvement.
- Tests whether current structure is sufficient when used more rigorously.

**Cons**
- Still lacks a dedicated per-change dossier.
- One sprint plan can still become overloaded when several independent changes are active.

#### Option C — Keep current layered docs, add a lightweight change-scoped overlay in `.omx/plans/` (recommended)
**Approach**
- Keep `docs/` layers and sprint docs as canonical source of truth.
- Standardize one change brief / change packet per medium-or-larger change in `.omx/plans/`, linking scope, affected docs, spec deltas, tasks, decisions, and verification.

**Pros**
- Directly addresses the main weakness: proposal-to-implementation traceability.
- Reuses structures that already exist in this repo (`.omx/plans/`, `.omx/context/`) instead of adding a second permanent docs taxonomy.
- Aligns with OpenSpec’s best idea—change-scoped artifacts—without forcing full framework adoption.
- Preserves the current layered doc model and sprint source-of-truth order.

**Cons**
- Adds one more artifact for medium/large changes.
- Requires routing discipline so trivial changes do not start generating unnecessary packets.

#### Option D — Adopt fuller OpenSpec-style change folders as a first-class working layer
**Approach**
- Keep current docs, but require each significant change to have proposal/design/tasks/spec-delta artifacts in a dedicated change folder.

**Pros**
- Strongest improvement in per-change shareability and asynchronous collaboration.
- Best match if the repo increasingly does brownfield, multi-session, multi-agent work.
- Cleaner lineage from problem statement to spec delta than the current sprint-centric system.

**Cons**
- More artifact sprawl than Option A.
- Risks duplicating content already split across user-flow/spec/design/sprint docs.
- Can drift into maintaining both a permanent layered docs system and a parallel change-folder system.

#### Option E — Move toward Spec Kit-style structured specify/clarify/plan/tasks workflow
**Approach**
- Introduce a more formal clarify/plan/tasks pipeline and feature-scoped work packages as the default planning method.

**Pros**
- Strongest ambiguity reduction.
- Best if the repo often suffers from underspecified requests or costly rework.
- Makes task decomposition and review checkpoints explicit.

**Cons**
- Highest ceremony cost.
- Poor fit with the repo’s already mature layered documentation model.
- More likely to create duplicate artifacts than Option A or B.
- Over-corrects a traceability problem by importing a full workflow regime.

#### Option F — Single-chat / vibe-coding as the tiny-change fast path only
**Approach**
- Allow issue-like prompts or chat context only for tiny, obvious, local fixes; do not treat it as the default for medium/large work.

**Pros**
- Fastest for tiny, obvious, local fixes.
- Lowest documentation overhead.

**Cons**
- Weakest multi-session continuity.
- Weakest proposal-to-verification traceability.
- Easy to lose rationale, decisions, and spec deltas.
- Inferior to the repo’s current workflow for medium/large changes.

## Comparative Evaluation

### Objective Benchmark Rubric
Score each workflow pattern using a **1–5 scale** on the same repo-native dimensions:
1. **Read fan-out before safe execution** — 1 = very high fan-out, 5 = minimal fan-out.
2. **Change traceability from intent to QA** — 1 = hard to reconstruct, 5 = one packet clearly shows the chain.
3. **Open-question resolution** — 1 = ambiguity handled ad hoc, 5 = explicit clarify gate before execution.
4. **Verification completeness** — 1 = weak linkage to acceptance/tests/QA, 5 = strong explicit linkage.
5. **Drift risk against canonical docs** — 1 = high shadow-doc risk, 5 = very low risk.
6. **Ceremony cost** — 1 = too heavy for normal use, 5 = overhead proportional to value.

### Weights
- Read fan-out: **15%**
- Change traceability: **25%**
- Open-question resolution: **15%**
- Verification completeness: **20%**
- Drift risk: **15%**
- Ceremony cost: **10%**

### Evidence to collect
For each workflow option, test at least 3 cases:
- tiny local fix
- medium brownfield feature/refactor
- high-risk cross-doc / multi-session change

For each case, collect:
- number of docs/artifacts opened before safe execution
- whether one artifact shows intent -> delta -> QA
- whether assumptions/open questions are explicitly resolved
- whether acceptance/tests/manual QA/evidence remain linked
- whether canonical source-of-truth precedence stays unambiguous
- total artifacts produced and estimated coordination overhead

### Decision rule
- Compute weighted score out of 5.0 for each workflow option.
- Any option that scores **<3** on **Drift risk** or **Verification completeness** is automatically disqualified.
- Prefer the **lowest-ceremony** option among those that:
  - score **>=4.0** overall for medium brownfield change, and
  - score **>=4.0** overall for high-risk cross-doc change.
- If “current workflow with stricter enforcement” and “OpenSpec-lite overlay” score within **0.3 points**, prefer stricter enforcement first and re-evaluate after a trial.

### 1) Current system vs OpenSpec style
**Where current system is stronger**
- Better permanent information architecture. Nurimap already distinguishes product flows, executable specs, design rules, sprint execution, and history in a way OpenSpec does not try to solve by itself (`docs/00-governance/docs-structure.md:40-81`).
- Stronger embedded verification contracts. Representative specs already include acceptance criteria, TDD order, required test cases, manual QA, and QA evidence (`docs/03-specs/01-app-shell-and-layout.md:40-77`, `docs/03-specs/02-map-rendering.md:22-56`, `docs/03-specs/03-list-browse.md:25-68`).

**Where OpenSpec style is stronger**
- Per-change traceability. Nurimap’s source of truth is layered and sprint-anchored, but it does not naturally create one “change dossier” that ties proposal, design delta, tasks, and verification together.
- Brownfield change packaging. The current system says to update existing specs when feature identity is preserved (`docs/00-governance/docs-structure.md:94-100`), which is good, but that also means change intent can disappear into updated standing docs unless a separate plan or decision note is retained.

**Bottom line**
- OpenSpec has the better answer to “What happened in this specific change?”
- Nurimap has the better answer to “Where do stable product/spec/design truths live?”
- Therefore the missing piece is not a replacement, but a change-scoped overlay.

### 2) Current system vs Spec Kit style
**Where current system is stronger**
- Better fit for the repo’s existing docs culture. The repo already has explicit governance, source-of-truth layering, sprint contracts, QA handoff rules, and decision logging (`docs/00-governance/agent-workflow.md:19-61`, `docs/00-governance/docs-structure.md:102-170`).
- Lower ceremony. Current docs are detailed, but the workflow does not force constitution/specify/clarify/plan/tasks as a formal sequence for every change.

**Where Spec Kit style is stronger**
- Clarification discipline. Nurimap has planning guidance, but not a standardized clarify gate or explicit unresolved-questions phase before work.
- Task decomposition standardization. Sprint planning contains execution steps, but there is no universal change-level tasks artifact comparable to Spec Kit’s task package.

**Bottom line**
- Spec Kit would likely solve ambiguity and task clarity.
- But as a repo-wide replacement it is too ceremonial for the actual problem observed here.
- The repo should borrow its best lightweight habits, not its full framework.

### 3) Current system vs lightweight single-chat / vibe-coding baseline
**Where current system is stronger**
- Far better persistence, verification, and recoverability across sessions.
- Clearer conflict resolution via source-of-truth ordering (`docs/00-governance/agent-workflow.md:19-42`).
- Better grounding for tests and QA because specs explicitly define them (`docs/03-specs/01-app-shell-and-layout.md:48-77`, `docs/03-specs/05-auth-email-login-link.md:107-209`).

**Where single-chat is stronger**
- Lower activation energy for tiny fixes.
- Faster when there is one bounded bug, one obvious file, and little need for cross-session handoff.

**Bottom line**
- The current Nurimap workflow is objectively superior for medium/large work.
- Single-chat should exist as a deliberately allowed fast path for small, low-risk, local changes—not as the repo’s default methodology.

## Current System’s Strengths
1. **Separation of concerns is unusually clear.** Governance, product/user-flow, design, specs, sprint execution, and decisions are intentionally separated and documented (`docs/00-governance/docs-structure.md:40-81`).
2. **Execution hierarchy is explicit.** Agents are told exactly what to read first and how to resolve conflicts (`docs/00-governance/agent-workflow.md:7-42`).
3. **Specs are executable, not aspirational.** They include acceptance criteria, TDD order, required test cases, manual QA, and evidence sections (`docs/03-specs/01-app-shell-and-layout.md:40-77`, `docs/03-specs/03-list-browse.md:25-68`, `docs/03-specs/05-auth-email-login-link.md:71-209`).
4. **UI and failure-flow nuance is preserved.** User-flow and design docs capture behavior that pure implementation specs often miss (`docs/01-product/user-flows/browse-and-detail.md:10-29`, `docs/01-product/user-flows/auth-and-name-entry.md:10-46`, `docs/04-design/foundations.md:19-52`).
5. **The repo already supports brownfield iteration better than most ad hoc workflows.** Existing specs are meant to be updated when feature identity is preserved (`docs/00-governance/docs-structure.md:94-100`).

## Current System’s Weaknesses
1. **Weak change-scoped traceability.** The permanent docs are strong, but the system does not consistently create a single artifact per change that ties together why, what changed, what docs were updated, and how verification maps back.
2. **High reading fan-out.** Mandatory context often spans sprint planning, selected specs, user flows, design docs, architecture docs, and sometimes decisions (`docs/00-governance/agent-workflow.md:7-17`). That is thorough, but costly for medium-sized brownfield changes.
3. **Clarification is guided, not standardized.** The workflow says broad work should be planned first (`docs/00-governance/agent-workflow.md:45-48`), but there is no lightweight, named clarify artifact or fixed ambiguity checklist.
4. **Task decomposition is uneven.** Sprint plans may contain steps, but there is no universal per-change task artifact comparable to OpenSpec tasks or Spec Kit tasks.
5. **Current sprint is a strong anchor, but not a perfect change anchor.** Sprint docs are fixed and useful (`docs/00-governance/docs-structure.md:102-170`), yet they do not fully solve traceability for changes that evolve across sessions or spill across doc layers.

## What To Adopt / Avoid

### Adopt from OpenSpec
- **Dedicated change-scoped artifact per medium/large change.** This is the highest-value missing capability.
- **Spec-delta mindset for brownfield work.** Make it obvious what standing doc changed because of a given change packet.
- **Shareable multi-session packet.** Preserve rationale/tasks/verification outside chat history.

### Avoid from OpenSpec
- Do **not** create a full parallel permanent docs taxonomy that competes with `docs/01-product`, `docs/03-specs`, `docs/04-design`, and sprint docs.
- Do **not** require full proposal/design/tasks artifacts for every trivial change.

### Adopt from Spec Kit
- **Lightweight clarify gate** for ambiguous requests.
- **More explicit task decomposition** for medium/large changes.
- **Plan validation habit** before execution when scope is fuzzy or multi-file.

### Avoid from Spec Kit
- Do **not** import full constitution/specify/clarify/plan/tasks/implement ceremony repo-wide.
- Do **not** replace current layered docs with feature-folder primacy unless the repo’s information architecture is intentionally being redesigned.

## Recommended Direction
**Recommendation:** Keep the current docs layers and sprint-centric source-of-truth model, but add an **OpenSpec-lite change packet overlay** using existing `.omx/plans/` and `.omx/context/` structures. Treat that packet as a **non-canonical working dossier**, not as a new source of truth. Borrow a **small Clarify + Tasks discipline** from Spec Kit for medium/large changes. Explicitly allow **single-chat execution for tiny, local fixes**.

This is the lowest-entropy improvement path because it strengthens the repo exactly where evidence says it is weak—change-scoped traceability—without discarding what is already strong.

### Packet vs Sprint Split
If OpenSpec-lite is adopted, the boundary should be:
- **`planning.md` owns** sprint goal, in/out of scope, selected specs, related docs, done criteria, and sprint QA plan.
- **change packet owns** change-specific problem statement, why-now rationale, affected-doc map, assumptions/open questions, task list, spec/design delta summary, and verification checklist for that one change.
- **`qa.md` owns** executed QA evidence and final QA verdict.
- **`review.md` owns** sprint outcome summary and carry-over.
- **`decisions.md` / `change-log.md` own** durable rationale/history when it must outlive the packet.

### Multiplicity Rule
- One sprint may contain **multiple change packets**.
- Each packet must link to exactly one active sprint `planning.md`.
- A sprint plan may link to several active packets.
- On conflict, **sprint planning + selected specs + QA docs win**; packet is an execution aid only.

### `.omx/plans` coexistence rule
- Existing `.omx/plans/` planning artifacts remain auxiliary working files.
- The proposed change packet would become a standardized subtype inside `.omx/plans/`, not a replacement for sprint docs or standing specs.
- Execution handoff continues to rely on canonical docs; packet reduces reconstruction cost, not source-of-truth ownership.

## Prioritized Improvement Recommendations

### P0 — Standardize one change packet for every medium/large change
**Proposal**
- Use `.omx/plans/<slug>.md` as the non-canonical working change packet for medium/large work.
- Require these sections: problem statement, desired outcome, affected source-of-truth docs, proposed doc/code deltas, task list, verification plan, related decisions, and final evidence links.
- Reuse `.omx/context/<slug>-*.md` for intake/context snapshots.

**Why this repo specifically**
- The repo already uses `.omx/plans/` and `.omx/context/`; extending them is lower-entropy than inventing a second permanent docs tree.
- It complements, rather than conflicts with, `docs/` as long-lived source of truth.
- It gives a per-change layer that sprint `planning.md` does not always provide cleanly when a sprint carries multiple independent changes.

**Acceptance criteria**
- A maintainer can open one plan file and understand the change without reconstructing it from sprint planning + specs + decisions.
- Every medium/large change packet links to the standing docs it updates.
- Verification evidence is linked back from the packet.
- Canonical truth remains in sprint/spec/design/qa/history docs, not `.omx/plans/`.

### P1 — Add a lightweight clarify checklist before execution for ambiguous changes
**Proposal**
- Before execution of medium/large ambiguous work, require a short clarify section inside the change packet: open questions, assumptions, non-goals, decision drivers, and chosen option.

**Why this repo specifically**
- Current planning guidance exists, but ambiguity control is not standardized (`docs/00-governance/agent-workflow.md:45-48`).
- This borrows the useful part of Spec Kit without importing its full ceremony.

**Acceptance criteria**
- New medium/large plans contain an explicit assumptions/open-questions section.
- Reviewers can see what was decided before implementation started.

### P1 — Add lightweight traceability links between sprint docs and active change packets
**Proposal**
- When a change is active in a sprint, the change packet should link the sprint, and the sprint plan should reference the active packet(s).

**Why this repo specifically**
- The repo is sprint-anchored, so the improvement should connect to that anchor rather than bypass it.

**Acceptance criteria**
- A reader can move in either direction: sprint -> active change packet, change packet -> sprint + touched standing docs.
- Cross-session readers do not need to infer the relationship manually.
- One sprint can reference multiple packets without turning `planning.md` into the detailed home of every change narrative.

### P1 — Govern packet usage explicitly in `agent-workflow.md`
**Proposal**
- If the repo adopts change packets, add a short routing rule to `docs/00-governance/agent-workflow.md` explaining:
  - when agents must read an active packet,
  - that packets are execution aids, not canonical truth,
  - and which canonical docs must still be updated.

**Acceptance criteria**
- The workflow doc names packet usage conditions.
- Packet/canonical precedence is explicit.
- Maintainers can tell whether a packet is stale by checking linked canonical docs and sprint artifacts.

### P2 — Define a routing rule for when full workflow vs single-chat is appropriate
**Proposal**
- Codify a simple threshold:
  - **Tiny/local change:** single-chat okay.
  - **Medium/large, multi-file, or cross-session change:** require change packet.
  - **High-risk change:** require clarify + stronger review.

**Why this repo specifically**
- The current workflow is stronger than vibe-coding for complex work, but it should not burden one-file micro-fixes.

**Acceptance criteria**
- Contributors can classify the expected workflow in under a minute.
- Tiny fixes avoid unnecessary ceremony.
- Larger changes stop relying on chat memory alone.

### P3 — Keep full Spec Kit adoption off the roadmap unless pain signals materially worsen
**Proposal**
- Do not pursue full Spec Kit-style workflow adoption now.
- Revisit only if ambiguity, rework, or multi-contributor coordination remains high after P0–P2.

**Acceptance criteria**
- No framework migration is attempted before measuring whether lighter additions solve the observed gap.
- A stronger OpenSpec-style first-class change folder is reconsidered only if sprint plans continue to aggregate multiple semi-independent change streams and reconstruction cost stays high after the lighter packet trial.

## Recommendation Summary by Benchmark
- **Against OpenSpec:** adopt its change-scoped artifact idea; do not replace Nurimap’s layered docs with a parallel framework.
- **Against Spec Kit:** borrow clarify/task discipline selectively; avoid full ceremony.
- **Against single-chat execution:** keep it only as a bounded fast path for tiny local work.

## Risks And Mitigations
- **Risk:** The new change packet becomes duplicate paperwork.  
  **Mitigation:** Limit it to medium/large changes and make it reference standing docs rather than restate them; benchmark Option B first as the status-quo control.
- **Risk:** The repo gains two competing sources of truth.  
  **Mitigation:** Keep `docs/` and sprint docs canonical; change packets summarize intent/delta/verification and point back to canonical docs, and govern this explicitly in `agent-workflow.md`.
- **Risk:** Packet and sprint planning duplicate each other.  
  **Mitigation:** Keep sprint docs as sprint-level scope/QA owners and packets as change-level intent/task/delta owners only.
- **Risk:** Packets go stale while canonical docs move.  
  **Mitigation:** Require packet -> canonical links and treat packet freshness as verified only when linked sprint/spec/qa docs are updated.
- **Risk:** One sprint accumulates many packets and becomes hard to navigate.  
  **Mitigation:** Require sprint `planning.md` to list active packet links in one section and archive/close completed packets.
- **Risk:** The benchmark result is biased by hand-picked examples.  
  **Mitigation:** Score the same three case types for every option and record the evidence used for each score.
- **Risk:** The team overreacts and imports Spec Kit-level ceremony.  
  **Mitigation:** Treat clarification/tasks as optional-lightweight overlays, not a full lifecycle replacement.

## Success Criteria
1. The repo preserves its current layered documentation strengths.
2. Medium/large changes become understandable through one change packet.
3. Proposal-to-spec-delta-to-verification traceability improves materially without a full framework migration.
4. Tiny changes remain fast.

## Verification Steps
1. Verify every recommendation maps to a documented weakness or strength in the current repo.
2. Verify the recommended path does not invalidate the current source-of-truth hierarchy (`docs/00-governance/agent-workflow.md:19-42`).
3. Verify the recommendation is additive to existing docs structure rather than a hidden taxonomy rewrite.
4. Verify the “avoid” guidance explicitly rejects full Spec Kit ceremony and parallel-doc duplication.

## ADR (Draft)
- **Decision:** Retain the current layered docs and sprint-centric source-of-truth system; add an OpenSpec-lite change packet overlay in `.omx/plans/` for medium/large changes; borrow only lightweight clarify/task habits from Spec Kit; keep single-chat execution as a tiny-change fast path.
- **Drivers:** traceability gap; ceremony cost; fit with the current docs information architecture; avoidance of shadow source-of-truth drift.
- **Alternatives considered:** current workflow as-is; current workflow with stricter enforcement; OpenSpec-lite non-canonical packets in `.omx/plans/`; fuller OpenSpec-style change folders; Spec Kit-style formal workflow adoption; single-chat as tiny-change fast path.
- **Why chosen:** the current repo is already strong on document separation and verification. Its main missing capability is per-change traceability, which can be improved additively with much less entropy than adopting a full external framework, as long as packets stay non-canonical and linked to canonical docs.
- **Consequences:** medium/large changes gain one more working artifact, but the repo avoids methodology cosplay and preserves current strengths; governance must define packet routing and precedence to avoid hidden shadow docs.
- **Follow-ups:** if the team adopts this direction, next work should define the exact change-packet template, routing thresholds, sprint-linking convention, and objective benchmark scores across 3 representative change types.

## Concrete Next-Step TODOs (if this recommendation is approved later)
1. Define the minimal change-packet template in `.omx/plans/`.
   - Acceptance criteria: template covers problem, delta, tasks, verification, links.
2. Define routing thresholds for tiny vs medium/large vs high-risk changes.
   - Acceptance criteria: threshold is short, explicit, and testable.
3. Define how sprint docs reference active change packets.
   - Acceptance criteria: bidirectional traceability rule exists.
4. Trial the pattern on one upcoming medium-sized brownfield change before wider rollout.
   - Acceptance criteria: trial demonstrates lower reconstruction cost without obvious doc duplication.
