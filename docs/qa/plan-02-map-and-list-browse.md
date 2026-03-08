# Plan 02 Manual QA Report

- Date: 2026-03-08
- Plan: Plan 02 지도와 목록 탐색 기본
- Source specs:
  - `docs/specs/06-map-rendering.md`
  - `docs/specs/07-list-browse.md`

## Environment
- Local dev server: `npm run dev -- --host 127.0.0.1`
- Desktop viewport: `1440x960`
- Mobile viewport: `390x844`
- Visual QA method: Playwright runtime screenshots + AI visual inspection

## Runtime Evidence
```json
{
  "desktopTitle": "Nurimap",
  "desktopListCount": 3,
  "mobileDetailVisible": true
}
```

## Manual QA Checklist
### Map Rendering
- [pass] 초기 지도 위치가 HUD 기준 `37.558721, 126.92444`로 표시된다.
- [pass] 식당/카페 마커가 다른 색상과 라벨로 구분된다.
- [pass] 지도 마커를 기준으로 한 탐색 구조가 우측 지도 영역에 표시된다.
- [pass] 목록/상세와 함께 지도 마커가 공존한다.
- [auto-pass] `level 5` 라벨 표시 / `level 6` 라벨 숨김은 자동 테스트로 검증했다.

### List Browse
- [pass] 목록에서 place 비교가 가능하다.
- [pass] 제로페이 가능 place에는 평균 별점 UI 높이와 맞는 제로페이 badge가 보인다.
- [pass] 제로페이 미확인/불가 place에는 제로페이 badge가 보이지 않는다.
- [pass] 데스크톱 목록 item 클릭 시 상세 내용이 바뀐다.
- [pass] 모바일 목록 페이지에서 place를 누르면 전체 화면 상세 페이지가 열린다.
- [auto-pass] 목록 로딩/에러/빈 상태는 자동 테스트로 검증했다.

## Visual Notes
- `desktop-browse.png`에서 좌측 사이드바 목록 3개, 우측 지도 마커 3개, floating detail panel이 동시에 보였다.
- `desktop-browse.png`에서 식당 마커는 주황, 카페 마커는 파랑으로 구분되었다.
- `desktop-detail-selected.png`에서 목록 선택 후 상세 패널이 선택한 place 정보로 갱신되는 것을 확인했다.
- `mobile-map.png`에서 하단 floating button UI가 보였다.
- `mobile-list.png`에서 모바일 목록 페이지 진입을 확인했다.
- `mobile-detail.png`에서 모바일 전체 화면 상세 페이지 진입을 확인했다.

## Supporting Files
- `artifacts/qa/plan-02/desktop-browse.png`
- `artifacts/qa/plan-02/desktop-detail-selected.png`
- `artifacts/qa/plan-02/mobile-map.png`
- `artifacts/qa/plan-02/mobile-list.png`
- `artifacts/qa/plan-02/mobile-detail.png`
- `artifacts/qa/plan-02/run-playwright.mjs`

## Conclusion
Plan 02의 지도/목록 기본 탐색 흐름은 spec과 자동 테스트, 수동 QA evidence 기준으로 검증되었다.
