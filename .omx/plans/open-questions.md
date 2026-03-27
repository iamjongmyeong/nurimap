## Sprint 16 Place Detail UX/UI Refresh - 2026-03-15
- [x] 데스크톱 상세 UI는 mobile reference와 동일한 UI를 우선 사용하되, 현재 지도 노출 + 왼쪽 sidebar에서 장소 목록/장소 추가를 진행하는 app-shell surface는 유지한다 — 2026-03-15 사용자 확정
- [x] 리뷰가 0건일 때 empty-state copy/레이아웃은 추가하지 않고, `평가 및 리뷰` 섹션 본문은 비워 둔다 — 2026-03-15 사용자 확정

## Plan - Docs Architecture / Design Rationalization - 2026-03-16
- [x] Use a new `docs/02-architecture/overview.md` as the architecture entrypoint instead of overloading an existing concern doc — Keeps onboarding simple without diluting `system-context.md`'s role. (resolved during architect/critic review, 2026-03-16)
- [x] Merge `docs/04-design/review.md` and `docs/04-design/recommendation.md` into `docs/04-design/browse-and-detail.md` — Their current content belongs to the place-detail surface contract more than to independent live docs. (resolved during architect/critic review, 2026-03-16)
## Auth Email OTP Immediate Cutover Sprint - 2026-03-18
- [x] `docs/05-sprints/` materialization 시 Sprint 번호를 `sprint-18`로 고정한다 — 사용자가 2026-03-18에 명시적으로 선택했고, 본 Sprint 문서는 `docs/05-sprints/sprint-18/`에 생성했다.

## Sprint 19 Mobile UI Figma + Tailwind-only - 2026-03-21
- [ ] Figma node `9:319`, `9:299`를 새 세션의 Figma MCP로 열어 각각 어떤 mobile surface/state를 대표하는지 매핑한다 — 현재 세션은 Figma MCP reload 전이고 direct HTTP 접근도 2026-03-21 기준 403이라 정확한 handoff 판독이 아직 필요하다.
- [ ] non-Figma 상태(loading/error/empty/disabled)에 대해 기존 visual을 유지할지, 이번 Sprint에서 함께 정리할지 final guardrail을 planning.md에 확정한다 — bounded fallback 범위가 QA와 문서 범위를 결정한다.


## RESTfulness Refactor - 2026-03-27
- [x] 해결됨 — RESTfulness 관련 open question은 빠른 제거 원칙으로 정리되어 종료.
