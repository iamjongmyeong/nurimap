# Test Spec — Sprint 14 Naver Place Lookup Hardening

## Automated Checks
### Unit
- `normalizeNaverMapUrl()` accepts the two `38282260` entry URLs and the existing `1648359924` favorite URL.
- short-link resolver maps `https://naver.me/G4WowQP4` to canonical place id `38282260`.
- HTML-state parser extracts `name`, `roadAddress`, and `address` from a captured Naver place-detail sample.
- extractor error mapper distinguishes invalid URL, rate-limited extraction, parse failure, lookup failure, and coordinate failure.
- shared extractor/error-contract module is exercised directly so dev-runtime and API-runtime adapters cannot drift silently.

### Integration
- `lookupPlaceFromRawUrl()` succeeds for the four in-scope URLs with mocked Naver detail HTML.
- repeated lookup for the same canonical URL hits cache.
- geocode fallback still succeeds when coordinates are absent but `roadAddress` exists.
- rate-limit HTML or 429 is surfaced as a dedicated extractor error.
- `vite.config.ts` middleware and `api/place-lookup.ts` return the same status/error code mapping for equivalent extractor failures.
- negative-cache behavior prevents repeated immediate upstream fetches after `extract_rate_limited` / `extract_parse_failed`.

### UI Flow
- place-add flow shows a success summary for the four URLs.
- existing `1648359924` summary remains unchanged.
- failure UI preserves the input and shows the correct error state when the extractor is blocked.

## Browser Automation QA
- Run local DEV app with real auth/bypass flow.
- Input each of the four URLs through the actual form.
- Capture console/network evidence for:
  - short-link redirect target,
  - place summary success for `38282260`,
  - no regression for `1648359924`.

## Observability Checks
- log events differentiate extractor rate-limit, parse failure, and fallback source.
- log events show whether the response came from live extraction, cache hit, or emergency fallback.
- Sprint 14 `qa.md` records the command/tool, scenario, verdict, and screenshot/evidence paths.

## User QA Handoff
- Confirm the four URLs succeed in the deployed environment.
- Confirm the displayed address matches Naver’s current place page for `38282260`.
