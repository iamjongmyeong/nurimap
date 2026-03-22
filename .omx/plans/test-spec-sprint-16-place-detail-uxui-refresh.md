# Test Spec: Sprint 16 Place Detail UX/UI Refresh

## Objective
사용자 제공 mobile reference 기준으로 place detail UI를 재정렬하면서, 기존 상세 행동 회귀가 없음을 검증한다.

## References
- `docs/05-sprints/sprint-16/planning.md`
- `docs/03-specs/04-place-detail.md`
- `docs/04-design/browse-and-detail.md`
- `src/app-shell/NurimapAppShell.tsx`
- `src/app-shell/NurimapDetail.test.tsx`

## Verification Scope
- fixed top back header
- place info block 정보/순서/spacing intent
- 평가 및 리뷰 section variants
- desktop/mobile detail behavior 회귀
- loading/error and hidden-legacy-module 회귀

## Automated Test Matrix

| Area | Assertion |
|---|---|
| Mobile detail shell | `mobile-detail-page`가 full-screen page로 렌더되고 상단 고정형 `56px` header + 뒤로 가기 control이 존재한다 |
| Header behavior | 뒤로 가기 버튼이 기존 mobile map 복귀/selected place 유지 동작을 깨지 않는다 |
| Place info block | 이름, 주소, `added_by_name`, place type, zeropay label, rating summary가 reference 순서대로 노출되고 outer spacing이 `16/24/16` intent를 따른다 |
| Zeropay conditional | `zeropay_status !== available`이면 제로페이 row가 숨겨진다 |
| Review section title | `평가 및 리뷰` 라벨이 노출되고 section outer spacing이 `24px` intent를 따른다 |
| Review with content | 작성자/날짜/별점/본문이 노출된다 |
| Rating-only review variant | 작성자/날짜/별점만 있고 본문 없는 리뷰가 레이아웃을 깨지 않는다 |
| No-review variant | 리뷰가 없을 때 agreed empty-state 또는 fallback copy가 표시된다 |
| Hidden legacy modules | 네이버 이동 / 추천 / 내 리뷰 / 리뷰 작성 UI가 계속 숨겨진다 |
| Loading/error | `place_detail_load = loading | error` 시 기존 상태와 retry action이 유지된다 |
| Desktop parity | desktop sidebar detail에서도 같은 content hierarchy가 노출되고 map visibility가 유지된다 |

## Proposed Test Files
- `src/app-shell/NurimapDetail.test.tsx`
- 필요 시 `src/App.test.tsx`

## AI Agent Interactive QA
- Screenshot reference와 실제 detail UI를 비교해 아래를 확인한다.
  - header가 상단 고정처럼 보이는가
  - info block이 카드/chip이 아니라 세로 정보 리스트처럼 보이는가
  - section spacing이 reference의 느슨한 white-space 구조를 따르는가
  - review row가 본문 유무에 따라 자연스럽게 변형되는가

## Browser Automation QA
- Viewport:
  - Mobile `390x800`
  - Desktop `1280x900`
- Scenarios:
  1. 모바일 목록 → 상세 진입 → back → 지도 복귀
  2. 모바일 상세에서 정보 block / review block capture
  3. 데스크톱 sidebar 목록 → 상세 전환 → map visibility 확인
- Expected evidence path:
  - `artifacts/qa/sprint-16/`

## User QA Required
- 모바일 reference와 비교했을 때 typography/spacing/icon 느낌이 의도와 맞는지 최종 확인
- desktop adaptation이 과도하게 해석되지 않았는지 확인
- 본문 없는 review variant/no-review variant가 기대와 맞는지 확인

## Risks To Watch
1. 현재 `DetailCard`의 카드/gradient/chip 구조를 제거하면서 desktop spacing이 무너질 수 있다.
2. review variant 테스트가 없으면 본문 없는 review row가 회귀할 수 있다.
3. `added_by_name` 노출은 data model에 있지만 현재 테스트가 없어서 누락되기 쉽다.

## Exit Signal
- targeted Vitest 통과
- AI visual QA 결과가 reference hierarchy를 설명 가능
- Browser automation evidence가 `qa.md`에 기록됨
- 사용자 직접 QA 항목 상태가 명시됨
