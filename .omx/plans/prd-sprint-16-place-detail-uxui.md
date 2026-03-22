# PRD: Sprint 16 Place Detail UX/UI Refresh

## Problem
현재 장소 상세 화면은 gradient, chip, card 중심 구조를 사용하고 있어 사용자 제공 모바일 detail reference의 flat hierarchy와 다르다.

## Desired Outcome
- 모바일 detail은 fixed header + info block + review block 구조를 사용한다.
- 데스크톱 detail도 existing sidebar/back affordance와 지도 + 왼쪽 sidebar browse/add surface를 유지하면서 우선 같은 detail UI를 사용한다.
- 기존 동작(back/history/loading/error/legacy module exclusion)은 유지한다.

## Source Of Truth
1. `docs/05-sprints/sprint-16/planning.md`
2. 사용자 제공 모바일 screenshot / Figma 추출 코드
3. `docs/03-specs/04-place-detail.md`
4. `docs/01-product/user-flows/browse-and-detail.md`
5. `docs/04-design/browse-and-detail.md`
6. `docs/04-design/foundations.md`
7. `docs/03-specs/01-app-shell-and-layout.md` (selected spec은 아니지만 legacy floating wording 충돌 여부를 follow-up으로 점검)

## In Scope
- mobile detail visual refresh
- desktop detail same-UI application within existing sidebar surface
- added_by_name row 노출
- review variant 2종 정렬
- review/평가 최신순 정책 반영
- docs/test/qa plan sync

## Out Of Scope
- list screen redesign
- domain / API / persistence 변경
- recommend / my review / review compose / naver link 재도입
- 새 navigation state 도입

## UX Requirements
- 모바일 header: `56px`, fixed top, back icon only
- place info section spacing: `top 16px`, `x 24px`, `bottom 16px`
- review section spacing: `24px`
- info row: place name, address, added by, place type, zeropay, rating summary
- meta icon: neutral grey
- star accent: red only
- review variant:
  - author + date + stars + content
  - author + date + stars only
- review/평가 리스트는 가장 최근 항목이 위로 오도록 최신순으로 정렬한다.
- rating-only variant는 새 schema를 추가하지 않고 기존 `content` 값이 비어 있을 때 본문 row를 숨기는 방식으로 처리한다.
- desktop detail도 동일 UI를 사용하되 map + left sidebar browse/add surface는 그대로 유지한다.
- review 0건이면 empty-state용 카피/카드 없이 섹션 본문을 비워 둔다.

## Functional Guardrails
- desktop detail remains sidebar-internal
- mobile detail remains full-screen page
- back button and browser back preserve map context
- loading / error state must survive visual refresh
- existing `added_by_name` field is reused
- existing `ReviewSummary.content: string` shape is reused; no new review-content optional field is introduced in this sprint
- field naming across docs/code/tests is standardized on `added_by_name`

## Open Questions
- 없음 (2026-03-15 사용자 결정 반영 완료)
