# Sprint 15 Browse/Detail UI Refresh — Initial Consensus Draft

## 1. Readiness Assessment

### Planning Readiness — Mostly Ready
- `docs/05-sprints/sprint-15/planning.md` already satisfies the ready-gate structure: goal, scope, selected specs, constraints, done criteria, and QA plan are present.
- Source-of-truth alignment is largely in place across:
  - `docs/05-sprints/sprint-15/planning.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/04-design/browse-and-detail.md`
  - `docs/03-specs/04-place-detail.md`
  - `docs/03-specs/03-list-browse.md`
- Remaining planning gap: Sprint execution evidence docs are still stub-level (`docs/05-sprints/sprint-15/qa.md`, `docs/05-sprints/sprint-15/review.md`), so the sprint is ready to continue but not ready to close.

### Development Readiness — In Progress, Narrow Cleanup Remaining
- Sprint 15 UI work is already materially present in:
  - `src/app-shell/NurimapAppShell.tsx`
  - `src/index.css`
  - `src/app-shell/NurimapBrowse.test.tsx`
  - `src/app-shell/NurimapDetail.test.tsx`
- Confirmed current alignment with sprint decisions:
  - desktop detail renders inside sidebar, not a floating panel
  - detail hides Naver CTA / recommendation / my review / review compose in current browse/detail tests
  - BM Jua font is wired in `src/index.css`
  - QR SVG usage is wired in `src/app-shell/NurimapAppShell.tsx`
- Confirmed repo-state correction vs earlier assumption:
  - `src/app-shell/appShellStore.ts` no longer carries `registrationMessage` state.
  - `src/app-shell/PlaceAddPanels.tsx` already uses `window.alert(...)` for registration outcome messaging.
- Remaining dev cleanup is concentrated in regression alignment:
  - `src/app-shell/PlaceRegistrationFlow.test.tsx` still expects removed legacy detail/registration affordances.
  - `src/app-shell/NurimapAppShell.tsx` still contains legacy/detail-adjacent helper components for review/recommendation that should be explicitly removed or consciously deferred to avoid future confusion.

### QA Readiness — Not Yet Green
- Targeted test evidence shows current browse/detail work is close, but Sprint 15 is not QA-ready yet:
  - `pnpm test:run -- src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx`
  - Result: 132 passed, 5 failed.
- All observed failures are concentrated in `src/app-shell/PlaceRegistrationFlow.test.tsx`, with stale expectations around:
  - `registration-message`
  - `detail-my-review`
  - `detail-my-rating-status`
  - immediate list visibility after successful registration
- Browser automation evidence for Sprint 15 is still missing from `docs/05-sprints/sprint-15/qa.md` and `artifacts/qa/sprint-15/`.

## 2. RALPLAN-DR Summary

### Principles
1. Figma-first for Sprint 15 when prior spec language conflicts.
2. Preserve browse/detail navigation and state semantics while refreshing only the agreed UI surface.
3. Remove or realign legacy expectations that contradict accepted Sprint 15 exclusions.
4. Treat readiness as documentation + regression coverage + visual proof, not code presence alone.
5. Prefer the smallest change set that gets Sprint 15 back to a trustworthy green state.

### Top 3 Decision Drivers
1. **Source-of-truth fidelity** — Figma-approved exclusions and desktop detail behavior must match docs, code, and tests.
2. **Regression containment** — registration success flow changed from in-UI notice to browser alert, so legacy assertions now create false negatives.
3. **Sprint closeability** — QA and review artifacts must be sync-ready before parent hands off to execution/verification.

### Viable Options

#### Option A — Minimal Readiness Cleanup
Focus on syncing tests/docs to the already-landed UI behavior, and leave any unused legacy helpers in place if they are not rendered.
- Pros:
  - smallest execution surface
  - fastest path to green regression coverage
  - lowest chance of destabilizing current browse/detail UI
- Cons:
  - leaves stale code in `src/app-shell/NurimapAppShell.tsx`
  - increases future confusion about what is truly in scope for detail UI

#### Option B — Readiness Cleanup + Stale UI Pruning
Sync tests/docs and also prune obviously unused legacy detail helpers tied to excluded review/recommendation behavior.
- Pros:
  - removes misleading dead paths
  - reduces future regression risk and spec confusion
  - makes Sprint 15 handoff cleaner for execution and review
- Cons:
  - slightly wider diff in a file already carrying active UI changes
  - requires careful regression checks to avoid accidental removal of still-needed shared logic

### Recommendation
Recommend **Option B**, but keep it bounded: treat stale-code pruning as cleanup-only, not a redesign. The execution plan should first lock regression expectations to the accepted Sprint 15 behavior, then remove only clearly unused legacy detail helpers in `src/app-shell/NurimapAppShell.tsx`, and finally sync sprint QA/review docs.

## 3. Concrete Plan

### Step 1 — Lock the Sprint 15 source of truth and readiness baseline
**Files**
- `docs/05-sprints/sprint-15/planning.md`
- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/04-design/browse-and-detail.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/03-list-browse.md`

**Action**
- Reconfirm that docs consistently encode the accepted Sprint 15 decisions: Figma precedence, desktop sidebar replacement detail, excluded detail modules, alert-based registration success, list/detail Zeropay distinction, and basic loading/error handling.
- Only patch docs where current wording still implies preserved legacy UI.

**Acceptance for this step**
- No source-of-truth doc contradicts the accepted Sprint 15 decisions.
- Selected spec + flow + design docs point to one unambiguous implementation target.

### Step 2 — Finish code-side readiness cleanup around browse/detail and registration success behavior
**Files**
- `src/app-shell/NurimapAppShell.tsx`
- `src/app-shell/PlaceAddPanels.tsx`
- `src/app-shell/appShellStore.ts`

**Action**
- Verify the active browse/detail rendering path matches Sprint 15 decisions.
- Remove or explicitly defer clearly stale helper code in `src/app-shell/NurimapAppShell.tsx` that represents excluded recommendation/review-compose behavior.
- Keep registration success behavior alert-based and ensure no legacy in-UI success notice path is still part of the active contract.

**Acceptance for this step**
- Active detail UI does not expose excluded Sprint 15 modules.
- No active state/store contract depends on `registrationMessage`.
- Code intent is clear enough that tests and docs can assert the same behavior without ambiguity.

### Step 3 — Rewrite regression coverage to match the approved Sprint 15 behavior
**Files**
- `src/app-shell/NurimapBrowse.test.tsx`
- `src/app-shell/NurimapDetail.test.tsx`
- `src/app-shell/PlaceRegistrationFlow.test.tsx`

**Action**
- Preserve the current browse/detail assertions that already encode sidebar replacement, mobile detail, and hidden excluded modules.
- Update registration-flow tests to assert the alert-based success contract and current detail metadata instead of removed `registration-message`, `detail-my-review`, or `detail-my-rating-status` affordances.
- Reframe the successful-registration expectation around durable outcomes: selected place opens in detail, place data is updated, map/list state can still surface the new or merged place after returning to browse.

**Acceptance for this step**
- All failing registration-flow assertions are aligned to the current Sprint 15 UX contract.
- Tests assert outcomes that are user-visible and still in scope.
- No test depends on removed first-phase detail UI modules.

### Step 4 — Complete Sprint 15 verification and evidence capture
**Files**
- `docs/05-sprints/sprint-15/qa.md`
- `artifacts/qa/sprint-15/`

**Action**
- Run the targeted automated suite for browse/detail/registration regressions.
- Run browser QA for mobile browse → detail → back and desktop browse → detail sidebar replacement.
- Record commands, verdicts, and screenshot paths in `qa.md`.

**Acceptance for this step**
- Automated checks for Sprint 15 browse/detail/registration regressions are green.
- Browser evidence exists for both mobile and desktop critical flows.
- `qa.md` reflects actual verification status rather than placeholder text.

### Step 5 — Sync sprint closure docs for reviewer handoff
**Files**
- `docs/05-sprints/sprint-15/review.md`
- `docs/05-sprints/sprint-15/qa.md`
- `docs/06-history/decisions.md` (only if a non-trivial cleanup decision is made)

**Action**
- Update sprint review summary, completed/not completed items, residual risks, and any carry-over.
- Record a decision log only if execution makes a non-obvious call about pruning vs deferring stale detail helpers.

**Acceptance for this step**
- A reviewer can determine what changed, what remains excluded, what was verified, and what risk is left.
- Sprint 15 handoff is execution-ready and reviewable without re-discovery.

## 4. Acceptance Criteria And Verification Steps

### Acceptance Criteria
- Browse/detail docs and selected specs consistently reflect the approved Sprint 15 decisions.
- Desktop detail remains a sidebar-content replacement, not a floating panel.
- Mobile detail remains full-screen with back behavior preserving map context.
- Naver CTA, recommendation, my review, and review compose remain absent from first-phase detail UI.
- Registration success feedback is validated through browser alert behavior, not legacy in-panel notice UI.
- Regression tests no longer assert removed detail affordances.
- Sprint `qa.md` and `review.md` are populated with real evidence and status.

### Verification Steps
1. Run:
   - `pnpm test:run -- src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx`
2. Run:
   - `pnpm lint`
3. Perform browser QA for:
   - mobile browse → detail → back to map
   - desktop browse/list or marker select → sidebar detail replacement
   - registration success path showing alert-based feedback and stable post-save navigation
4. Save evidence under:
   - `artifacts/qa/sprint-15/`
5. Record results in:
   - `docs/05-sprints/sprint-15/qa.md`
   - `docs/05-sprints/sprint-15/review.md`

## 5. Risks And Mitigations

1. **Risk: false confidence from browse/detail-only green tests**  
   **Mitigation:** treat `PlaceRegistrationFlow.test.tsx` as part of Sprint 15 exit verification because registration success UX changed in the same app-shell surface.

2. **Risk: stale helper code reintroduces excluded UI later**  
   **Mitigation:** prune clearly unused review/recommendation detail helpers now, or explicitly document deferral in sprint review/decision log.

3. **Risk: docs claim readiness while sprint evidence docs remain placeholders**  
   **Mitigation:** require `qa.md` and `review.md` updates in the same execution slice as the final verification run.

4. **Risk: tests assert implementation details that no longer represent user-visible behavior**  
   **Mitigation:** rewrite assertions around stable UX outcomes: alert feedback, selected-place detail state, preserved browse/detail navigation, and visible metadata.

## 6. ADR Draft

### Decision
Proceed with a bounded Sprint 15 readiness cleanup that aligns docs, regression tests, and residual app-shell code to the already-approved Figma-first browse/detail UI contract, including alert-based registration success handling.

### Drivers
- Figma is the accepted source of truth for this sprint.
- Current failures are concentrated in legacy regression expectations, not the primary browse/detail UI direction.
- Sprint closure requires evidence-backed QA and doc sync, not partial implementation state.

### Alternatives Considered
- **Minimal cleanup only:** update tests/docs but leave stale helper code untouched.
- **Bounded cleanup plus stale UI pruning:** update tests/docs and remove clearly unused excluded-ui helpers.

### Why Chosen
The bounded cleanup-plus-pruning path best balances speed and correctness: it resolves the real readiness blockers without reopening architecture or broadening Sprint 15 scope.

### Consequences
- Execution remains focused on sync and verification, not new feature work.
- Regression coverage becomes a truer representation of the approved Sprint 15 UX.
- A small amount of legacy code may still remain only if it is proven shared or non-blocking and explicitly documented.

### Follow-ups
- If any excluded detail helper cannot be safely removed in Sprint 15, log the deferral in `docs/05-sprints/sprint-15/review.md` and schedule follow-up cleanup.
- If execution makes a non-obvious pruning/defer call, record it in `docs/06-history/decisions.md`.
