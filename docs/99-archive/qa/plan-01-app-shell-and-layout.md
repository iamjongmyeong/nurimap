> Status: Archived
> Archived on: 2026-03-09
> Reason: Historical QA report from the legacy Plan workflow.
> Replaced by: No direct replacement. Future Sprint verification records belong in `docs/04-sprints/sprint-XX/qa.md` and `review.md`.
>
> 이 문서는 더 이상 현재 기준 문서가 아니다.

# Plan 01 Manual QA Report

- Date: 2026-03-08
- Plan: Plan 01 앱 셸과 공통 레이아웃
- Source spec: `docs/03-specs/01-app-shell-and-layout.md`

## Environment
- Local dev server: `npm run dev -- --host 127.0.0.1`
- Desktop viewport: `1440x960`
- Mobile viewport: `390x844`
- Visual QA method: Playwright screenshot capture + AI visual inspection

## Runtime Evidence
```json
{
  "desktopTitle": "Nurimap",
  "desktopHasSidebar": true,
  "desktopHasDetailPanel": true,
  "desktopHasMobileActions": 0,
  "mobileHasFloatingActions": true,
  "mobileListPageVisible": true
}
```

## Manual QA Checklist
- [pass] 데스크톱에서 사이드바가 정상 배치된다.
- [pass] 데스크톱에서 상세가 지도 위에 떠 있는 카드처럼 보인다.
- [pass] 데스크톱에서 상세 패널 뒤에 지도가 계속 보인다.
- [pass] 모바일에서 floating button UI가 정상 표시된다.
- [pass] 모바일에서 `목록 보기` 버튼이 목록 페이지로 이동한다.
- [pass] place 추가 버튼이 floating이 아닌 상단 버튼으로 보인다.

## Visual Notes
- 데스크톱 screenshot에서 좌측 390px 사이드바, 상단 `장소 추가` 버튼, 우측 지도 영역 위의 floating detail panel이 함께 보였다.
- 데스크톱 screenshot에서 모바일 floating actions는 보이지 않았다.
- 모바일 map screenshot에서 하단 `목록 보기`, `장소 추가` 버튼이 floating 형태로 보였다.
- 모바일 list screenshot에서 `목록 보기` 클릭 후 전체 화면 목록 페이지가 열리는 것을 확인했다.

## Supporting Files
- local screenshot artifact: `artifacts/qa/plan-01/desktop-shell.png`
- local screenshot artifact: `artifacts/qa/plan-01/mobile-map.png`
- local screenshot artifact: `artifacts/qa/plan-01/mobile-list.png`

## Conclusion
Plan 01의 수동 레이아웃/반응형 체크리스트를 통과했다.
