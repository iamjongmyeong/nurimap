# Sprint 14 Naver Place Lookup Hardening (RALPLAN-DR / Deliberate)

## Status
- Consensus mode: DELIBERATE
- Planner draft prepared on 2026-03-14
- Scope: production lookup failure for four Naver URL shapes, Sprint 14 prep artifacts, and verification design

## Requirements Summary
- When a user submits these Naver map links, Nurimap must extract a stable place summary including address instead of failing with `POST /api/place-lookup 502`:
  1. `https://map.naver.com/p/entry/place/38282260?placePath=%2Freview%2Fvisitor`
  2. `https://naver.me/G4WowQP4`
  3. `https://map.naver.com/p/favorite/myPlace/folder/52f873516c87492794d35b0f62ebe0f1/place/1648359924?c=16.00,0,0,0,dh&at=a&placePath=/home?from=map&fromPanelNum=2&timestamp=202603141841&locale=ko&svcName=map_pcv5`
  4. `https://map.naver.com/p/entry/place/38282260?c=16.00,0,0,0,dh&placePath=/home?from=map&fromPanelNum=1&additionalHeight=76&timestamp=202603141841&locale=ko&svcName=map_pcv5`
- The current implementation must stop depending on Sprint 13’s single curated success case for `1648359924`.
- Sprint 14 must be ready to execute with sprint docs, QA plan, and decision-log expectations in place.

## Grounded Evidence
- URL normalization in both client and API helpers is only a regex extract of `/place/{id}` on `map.naver.com` paths: `src/app-shell/naverUrl.ts:8-31`, `api/_lib/_naverUrl.ts:8-31`.
- Short-link resolution is one `HEAD` request followed by `Location` parsing: `src/server/placeLookupService.ts:11-28`, `api/_lib/_placeLookupService.ts:11-28`.
- Place lookup remains fixture-backed and only succeeds when the resolved place id exists in duplicated fixture maps; the curated success record is `1648359924`: `src/server/fixtures/placeLookupFixtures.ts:50-58`, `api/_lib/_placeLookupFixtures.ts:50-58`.
- API/dev middleware map lookup failures to HTTP 502: `api/place-lookup.ts:22-38`, `vite.config.ts:50-72`.
- Existing automated coverage is anchored to Sprint 13’s old sample set (`1648359924`) and does not cover the new `38282260` production path: `src/server/placeLookupService.test.ts:28-80`, `src/app-shell/PlaceLookupFlow.test.tsx:73-95`, `docs/05-sprints/sprint-13/planning.md:59-125`.
- Live verification on 2026-03-14 showed `https://naver.me/G4WowQP4` currently redirects to `https://map.naver.com/p/entry/place/38282260?placePath=%2Freview%2Fvisitor`.
- Playwright investigation on 2026-03-14 showed the Naver place iframe home page for `38282260` renders the address `서울 마포구 연남로1길 44 1층 터틀힙` and embeds `window.__APOLLO_STATE__["PlaceDetailBase:38282260"]` with `name`, `roadAddress`, and `address`.
- Direct fetches to `pcmap.place.naver.com` can return rate-limit pages (`429` / “서비스 이용이 제한되었습니다.”), so anti-bot handling is a first-class delivery risk.

## Root-Cause Hypothesis
The current 502 is not primarily a URL-shape parsing bug anymore. The new links normalize to place id `38282260`, but the lookup path only returns success for ids already present in duplicated fixture maps. For new production traffic, the service falls through to `lookup_failed`, and the route maps that failure to HTTP 502. Sprint 13 therefore solved one historically observed place (`1648359924`) rather than the underlying production extraction problem.

## RALPLAN-DR Summary

### Principles
1. **Server-authoritative extraction**: production lookup must not depend on client guesses or manually curated success-only fixtures.
2. **Deterministic degradation**: anti-bot/rate-limit failures must surface typed, observable errors instead of opaque 502s.
3. **One contract, two runtimes**: `src/server/*` and `api/_lib/*` must stay behaviorally aligned for dev and deployed runtimes, and parser/status logic must not be mirrored manually in both trees.
4. **Live-proofed, test-backed**: the fix must be validated against real 2026-03-14 link behavior and then locked with regression tests.
5. **Minimal operational weight**: prefer a lightweight HTTP/HTML-state extraction path before adding browser automation to the request path.

### Decision Drivers
1. **Production correctness for current URLs** — the four in-scope links must extract a real address now.
2. **Resilience to future Naver place ids** — the system must not break whenever the next place id is not in fixtures.
3. **Operational safety under rate limits** — the chosen path must define caching, fallback, and observability for 429 / markup changes.

### Viable Options

#### Option A — Expand fixture coverage only
- **Approach**: add `38282260` to both fixture maps and update tests/docs to match the new links.
- **Pros**:
  - Smallest code delta.
  - Fastest path to green tests for the known links.
  - No new Naver scraping/rate-limit work.
- **Cons**:
  - Repeats Sprint 13’s mistake: success only for another curated id.
  - Does not solve arbitrary future URLs.
  - Leaves production correctness dependent on manual fixture updates.

#### Option B — Server-authoritative HTML-state extraction with fixture/test fallback **(favored)**
- **Approach**: keep URL normalization server-side, then for uncached ids fetch Naver place detail HTML (`/home`), parse embedded `window.__APOLLO_STATE__` for `PlaceDetailBase:{id}` fields (`name`, `roadAddress`, `address`), reuse existing geocode fallback for coordinates, and retain fixtures only for deterministic tests / emergency fallback.
- **Preferred upstream policy**:
  - request the generic home path first: `https://pcmap.place.naver.com/place/{id}/home?...`
  - allow redirect to the concrete typed page (for example `restaurant/{id}/home`)
  - send browser-like `referer`, `user-agent`, and `accept-language` headers anchored to the canonical `map.naver.com/p/entry/place/{id}?placePath=%2Fhome` URL
  - treat `429` or a returned “서비스 이용이 제한되었습니다.” HTML body as `extract_rate_limited`
  - treat missing `window.__APOLLO_STATE__` or missing `PlaceDetailBase:{id}` as `extract_parse_failed`
  - retry at most once only for timeout / transient `5xx`, never for `429` / rate-limit HTML
- **Pros**:
  - Solves the real production problem for new place ids.
  - Reuses Naver’s own server-rendered state rather than brittle DOM-only selectors.
  - Keeps request-path weight much lower than Playwright-on-server.
- **Cons**:
  - Requires anti-bot/rate-limit handling and markup-state parsing.
  - Needs careful duplication control between `src/server/*` and `api/_lib/*`.
  - Must explicitly model new failure modes (429, parse miss, state schema drift).

#### Option C — Request-path browser automation extraction
- **Approach**: use Playwright/Chromium in the server path to load Naver pages exactly like the browser QA flow and read the iframe DOM/state.
- **Pros**:
  - Closest to the successful manual investigation path.
  - More tolerant when simple HTTP fetches miss JS-rendered state.
- **Cons**:
  - Heavy for Vercel/serverless cold starts.
  - Operationally complex and costlier.
  - Harder to test, bundle, and observe safely in production.

### Invalidated Alternative
- **GraphQL / marker-only API path**: observed requests (`/p/api/place/type/{id}`, `/p/api/place/marker/{id}`, `pcmap-api.place.naver.com/graphql`) did not expose the required address payload in the inspected responses, so they are insufficient as the primary extraction source without another detail source.

## Pre-mortem (3 scenarios)
1. **Rate-limit collapse**
   - Scenario: `pcmap.place.naver.com` returns 429 or “서비스 이용이 제한되었습니다.” for production traffic bursts.
   - Impact: lookups regress to 502/unknown failure.
   - Mitigation: distinguish extractor errors, cache successful extraction by canonical place id, cap retries, and optionally fall back to verified emergency records only for explicitly allowlisted hot ids.
2. **Embedded-state schema drift**
   - Scenario: `window.__APOLLO_STATE__` or `PlaceDetailBase:{id}` naming changes.
   - Impact: parser silently stops extracting address/name.
   - Mitigation: parser must fail loudly with dedicated error codes and observability; add parser tests against captured HTML fixtures and a live smoke QA step.
3. **Address-only success but coordinate failure**
   - Scenario: HTML yields `roadAddress` but no direct coordinates, and Kakao geocode is unavailable or returns empty.
   - Impact: UI still fails after address extraction.
   - Mitigation: keep coordinate fallback order explicit, cache geocode results, test geocode-unavailable behavior, and ensure extracted addresses are normalized before geocoding.

## Work Objectives
- Replace the fixture-only production success path with a server-authoritative extractor for uncached Naver place ids.
- Preserve Sprint 13 support for `1648359924` while extending success coverage to `38282260` and equivalent URL variants.
- Prepare Sprint 14 artifacts so execution can start without more scope discovery.

## Guardrails
### Must Have
- Shared behavioral contract across `src/server/*` and `api/_lib/*`.
- Shared implementation surface that removes copy-paste drift for extractor/error parsing logic (for example a top-level shared module outside `src/` that both runtimes can import).
- Regression coverage for the four in-scope URLs.
- Explicit anti-bot/rate-limit error taxonomy and logging.
- Browser automation QA plan with real URL evidence.
- One source-of-truth extractor contract (types, parser, status mapping, upstream error classification) with thin runtime adapters only.

### Must NOT Have
- Playwright/Chromium added to the production request path unless simpler server-authoritative extraction is proven non-viable.
- Another sprint that succeeds only because one more place id was hard-coded into fixtures.
- Silent 502s that erase the actual reason (`rate_limited`, `parse_failed`, `lookup_failed`, `coordinates_unavailable`).
- Mirrored parser/status logic maintained by hand under both `src/server/*` and `api/_lib/*`.

## Implementation Steps

### 1. Freeze the shared contract and lock the failure with Sprint 14 docs + regression tests
- **Files**: `src/server/placeLookupTypes.ts`, `api/_lib/_placeLookupTypes.ts`, `src/server/opsLogger.ts`, `api/_lib/_opsLogger.ts`, `api/place-lookup.ts`, `vite.config.ts`, `docs/05-sprints/sprint-14/planning.md`, `src/server/placeLookupService.test.ts`, `src/app-shell/NaverUrlNormalization.test.tsx`, `src/app-shell/PlaceLookupFlow.test.tsx`
- **Work**:
  - Expand the domain contract before extractor work so the system can represent `extract_rate_limited`, `extract_parse_failed`, and existing `lookup_failed` / `coordinates_unavailable` distinctly.
  - Define the single source-of-truth contract boundary for parser logic, upstream error classification, and status-code mapping; runtime-specific files must be thin adapters only.
  - Add Sprint 14 scope/docs for the four URLs and today’s absolute-date evidence.
  - Add failing tests for `38282260` entry + short-link + query variants, not just `1648359924`.
  - Add expectations for typed extractor failure states where appropriate.
- **Acceptance**:
  - Tests fail for current code because `38282260` is unresolved and extractor-specific failures are not yet represented.
  - Shared type/logging/status contract is explicit before remote extraction code is added.
  - Sprint 14 planning doc clearly fixes scope, acceptance criteria, and QA plan.

### 2. Introduce a server-authoritative Naver detail extraction layer
- **Files**: `src/server/placeLookupService.ts`, `api/_lib/_placeLookupService.ts`, one source-of-truth extraction contract module plus thin adapters in each runtime; `api/place-lookup.ts`; `vite.config.ts`
- **Work**:
  - Resolve the raw URL to canonical place id.
  - For uncached ids, fetch the generic Naver detail home path geared to `/place/{id}/home`, follow the redirect-safe typed path, and parse embedded `window.__APOLLO_STATE__` / `PlaceDetailBase:{id}` from script content rather than relying on rendered DOM text.
  - Extract at least `name`, `roadAddress`, `address`, and any directly available coordinate/category metadata from that embedded state, then convert to the existing lookup result contract.
  - Use a strict upstream policy: browser-like `referer` / `user-agent` / `accept-language`, timeout budget `<= 5s`, one retry only for transient timeout / `5xx`, no retry for `429` or rate-limit HTML.
  - Keep fixtures as deterministic fallback/test inputs, not the primary production data source.
  - Add explicit extractor error codes for rate limit / parse failure so the route does not collapse everything into generic `lookup_failed`.
  - Define HTTP mapping up front (for example: invalid URL -> 400, extractor rate-limited -> 503 or 429-like retriable failure, extractor parse failure -> 502-class upstream failure, coordinate failure -> 422) and keep the same semantics in `api/place-lookup.ts` and `vite.config.ts`.
- **Acceptance**:
  - `38282260` resolves to `터틀힙 연남` with `road_address = 서울 마포구 연남로1길 44 1층 터틀힙`.
  - The API returns informative typed failures when the extractor is blocked.

### 3. Reconcile coordinates + caching with the new extraction path
- **Files**: `src/server/placeLookupService.ts`, `api/_lib/_placeLookupService.ts`, fixture files only as needed for deterministic tests
- **Work**:
  - Reuse existing coordinate priority, but now feed it extracted `roadAddress` / `address` on cache miss.
  - Cache successful extraction results by canonical URL / place id to reduce repeated Naver hits, with an explicit success TTL (target: 24h on warm instances).
  - Add failure-aware negative caching on warm instances for `extract_rate_limited` and `extract_parse_failed` (target: short TTL such as 5m for rate-limit, 15m for parse failure) so repeated requests do not hammer upstream immediately.
  - Treat rate-limit detection as a fail-fast circuit-breaker signal on the current runtime instance: after repeated rate-limit responses for the same place id within the negative-cache window, short-circuit to typed failure without another upstream fetch.
  - Decide whether one emergency fallback record for `38282260` is justified as a temporary rate-limit hedge, and document that decision if adopted.
- **Acceptance**:
  - Successful uncached lookup reuses cached results on repeat requests.
  - Repeated rate-limited requests degrade deterministically instead of re-hitting upstream on every attempt.
  - Existing `coordinates_unavailable` behavior still works when geocode fails.

### 4. Finish Sprint 14 verification + documentation sync
- **Files**: `docs/05-sprints/sprint-14/qa.md`, `docs/05-sprints/sprint-14/review.md`, `docs/06-history/decisions.md` (if implementation makes a non-trivial extraction/fallback choice)
- **Work**:
  - Record automated verification, browser automation evidence, and user QA handoff.
  - Log the final decision if a non-obvious extractor/fallback strategy is implemented.
- **Acceptance**:
  - Sprint 14 docs reflect the chosen extraction approach and real QA evidence.
  - Decision log records the reason if hybrid fallback/caching policy is non-trivial.

## Acceptance Criteria
1. All four in-scope URLs normalize to the correct canonical place URL and no longer fail with generic 502 in the happy path.
2. URLs resolving to `38282260` return the place name `터틀힙 연남` and representative address `서울 마포구 연남로1길 44 1층 터틀힙`.
3. The existing `1648359924` flow still succeeds without regression.
4. The service distinguishes at least these error categories in code/logging: invalid URL, rate-limited extraction, parse failure, lookup failure, coordinate failure.
5. Regression tests cover both old Sprint 13 and new Sprint 14 place ids.
6. Sprint 14 planning/QA/review artifacts exist and are aligned with the implementation plan before execution handoff.
7. Parser logic and status mapping are defined in one source-of-truth contract layer rather than mirrored by hand across dev and API runtimes.

## Risks and Mitigations
- **Risk**: Naver blocks repeated server fetches.
  - **Mitigation**: cache successes, add short-lived negative caching, fail fast on repeated 429/rate-limit HTML, and optionally retain tightly scoped emergency fallback.
- **Risk**: Embedded state changes without notice.
  - **Mitigation**: parse against captured HTML fixtures, log parse failures distinctly, keep Playwright QA smoke scripts for diagnosis.
- **Risk**: Dual runtime duplication drifts again.
  - **Mitigation**: move extraction/error-contract parsing into one shared importable module outside `src/`, mirror only thin runtime adapters, and keep parity tests across both call sites.
- **Risk**: Browser-only proof does not translate to server runtime.
  - **Mitigation**: add browser QA evidence plus direct service-level integration tests and observability before rollout.

## Expanded Test Plan
### Unit
- Normalize `entry`, `favorite`, and short-link inputs into place ids / canonical URLs.
- Parse embedded HTML state into `{ name, road_address, land_lot_address }`.
- Map extractor failures into typed domain errors.

### Integration
- `lookupPlaceFromRawUrl()` with mocked Naver HTML for `38282260` succeeds end-to-end.
- Rate-limit HTML / 429 responses produce the dedicated extractor error.
- Address extraction feeds coordinate fallback correctly.
- Cache hits avoid repeat remote extraction.
- Dev middleware and deployed API route emit the same status/error code for each typed failure.
- Negative-cache behavior prevents immediate repeated upstream hits after `extract_rate_limited` / `extract_parse_failed`.

### E2E / Browser Automation
- Local DEV auto-login + Playwright input of the four URLs confirms the add-place summary UI succeeds.
- At least one real-browser investigation step records console output/network evidence for Naver redirect + iframe load.
- One preview/prod smoke pass validates that Vercel behavior matches local behavior for `38282260`.

### Observability
- Add/extend `opsLogger` events for extractor rate-limit, parse failure, and fallback source selection.
- Verify logs distinguish `lookup_failed` from `extract_rate_limited` / `extract_parse_failed`.
- Capture browser QA evidence paths in Sprint 14 `qa.md`.

## Verification Steps
- `pnpm test:run`
- `pnpm lint`
- `pnpm build`
- Focused service tests for new extractor path and error taxonomy
- Browser automation run documenting:
  - `https://naver.me/G4WowQP4` redirect target on 2026-03-14
  - success summary for `38282260`
  - no regression for `1648359924`

## ADR Draft
- **Decision**: Move Nurimap place lookup from fixture-only production success toward a server-authoritative Naver detail extraction path, while retaining fixtures only for deterministic tests and narrowly justified emergency fallback.
- **Drivers**: current production correctness, future place-id resilience, anti-bot-aware operability, and elimination of mirrored parser/status logic across runtimes.
- **Alternatives considered**:
  - Expand fixtures only.
  - Use request-path Playwright/browser automation.
  - Rely on observed GraphQL/marker endpoints alone.
- **Why chosen**: it addresses the real `38282260` production path while keeping request-path complexity lower than browser automation and reducing future dependence on manual fixture curation.
- **Consequences**: adds extractor parsing and rate-limit handling complexity, but creates a scalable path for new place ids and better failure visibility.
- **Implementation constraints**: the extractor contract must have one source of truth, a concrete upstream request policy, explicit timeout/retry limits, and failure-aware caching semantics before execution starts.
- **Follow-ups**:
  - decide whether emergency fallback records are allowed for hot ids,
  - capture a stable HTML sample fixture for parser tests,
  - document the final fallback/observability decision in `docs/06-history/decisions.md` if non-trivial,
  - record the final shared-module / status-code contract chosen to prevent `src/server/*` vs `api/_lib/*` drift.

## Applied Improvements / Changelog
- Draft anchored to absolute-date live evidence from 2026-03-14.
- Elevated anti-bot/rate-limit risk to a first-class planning concern.
- Framed the preferred solution as hybrid server-authoritative extraction rather than another one-off fixture patch.
- Incorporated architect feedback to freeze the typed contract before extractor work, remove hand-mirrored parser/status logic, and specify upstream request/caching constraints.
