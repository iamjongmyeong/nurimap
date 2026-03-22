# PRD — Sprint 14 Naver Place Lookup Hardening

## Problem
Nurimap currently fails to extract place details for current production Naver URLs that resolve to place id `38282260`. The failure presents as `POST /api/place-lookup 502` instead of a successful address summary.

## User Outcome
When a user pastes a supported Naver Map link, Nurimap should reliably show the place summary and address without requiring manual fixture updates for each new place id.

## In Scope
- Four known URL variants from 2026-03-14.
- Server-authoritative place detail extraction for uncached ids.
- Existing coordinate fallback reuse.
- Sprint 14 verification and documentation.

## Out of Scope
- Full browser automation in the production request path.
- Replacing Kakao geocode fallback.
- Broad redesign of the place-add UI.

## Functional Requirements
1. Support `entry`, `favorite`, and `naver.me` variants that resolve to `38282260` or `1648359924`.
2. Extract `name`, `road_address`, and `land_lot_address` (or equivalent representative address) from a server-authoritative source, preferably by parsing embedded place state rather than rendered DOM text.
3. Continue using the canonical URL form `https://map.naver.com/p/entry/place/{placeId}`.
4. Reuse coordinate fallback order: Naver-derived coordinates if available, then road address geocode, then land-lot geocode.
5. Distinguish rate-limit / parse failures from generic lookup failures in logs and error contracts.
6. Keep dev runtime and deployed API runtime behavior aligned through a shared extractor/error-contract layer rather than copy-pasted divergent logic.
7. Freeze one source-of-truth extractor contract (types, parser, status mapping, upstream error classification) before implementing the remote extractor.
8. Use a bounded upstream request policy for uncached ids: browser-like headers, `<= 5s` timeout, at-most-once retry for transient timeout/`5xx`, and negative-cache behavior for anti-bot / parse failures.

## Success Metrics
- All four in-scope URLs succeed in QA.
- `38282260` shows `터틀힙 연남` and `서울 마포구 연남로1길 44 1층 터틀힙`.
- No generic 502 in the happy path for the supported URLs.

## Delivery Notes
- Preferred architecture: HTML-state extraction from Naver place detail home page for uncached ids.
- Preferred upstream path: generic `pcmap.place.naver.com/place/{id}/home` with redirect-safe follow-through to the concrete typed page.
- Fixtures remain deterministic test tools and optional narrowly-scoped emergency fallback only.
- Any non-obvious fallback policy must be logged in `docs/06-history/decisions.md` during implementation.
