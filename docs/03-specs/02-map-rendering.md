# Spec: Map Rendering

## Summary
Kakao Map 위에 place를 마커와 라벨로 렌더링하는 규칙과 runtime loading/failure fallback UI를 정의한다.

## Scope
- 지도 초기 중심
- 마커 타입 분기
- 라벨 표시 정책
- 확대/축소 상태 동기화와 지도 chrome 노출 정책
- 마커 선택 동작
- runtime loading/failure fallback

## Functional Requirements
- 지도 초기 중심은 `37.558721, 126.924440`이다.
- `place_type`에 따라 다른 마커 아이콘을 사용한다.
- 마커는 `level 1-4`에서 표시하고 `level 5`부터 숨긴다.
- 라벨은 `level 1-3`에서 표시하고 `level 4`부터 숨긴다.
- 마커와 라벨은 zoom-in 상태일수록 크게, zoom-out 상태일수록 작게 보이며 `level 1 -> 3`로 갈수록 단계적으로 축소된다. `level 4`에서는 marker-only state를 사용한다.
- 별도 level HUD와 확대/축소 control은 지도 위에 노출하지 않는다.
- 지도 확대/축소 결과는 내부 `mapLevel` 상태와 동기화되어야 한다.
- 지도에 표시되는 place는 모두 좌표를 가져야 한다.
- 지도 마커를 선택하면 해당 place 선택 상태가 갱신되고 상세 화면과 연동된다.
- 지도 마커 선택과 detail route sync는 background map viewport를 자동으로 이동하거나 확대/축소하지 않는다.
- runtime browser에서 Kakao SDK가 아직 준비되지 않았을 때는 fake-map처럼 오해될 수 있는 fallback이 아니라 명시적 loading state를 표시한다.
- runtime browser에서 Kakao SDK load failure 또는 runtime unavailable 상태가 발생하면 현재 browse/detail 맥락을 유지한 채 원인 인지와 재시도가 가능한 failure state를 표시한다.
- 테스트/JSDOM에서는 deterministic fallback renderer를 사용할 수 있지만, runtime browser의 loading/failure UI와 동일한 역할로 간주하지 않는다.

## Acceptance Criteria
- 식당과 카페가 다른 마커로 보인다.
- `level 3`에서는 마커와 라벨이 보인다.
- `level 4`에서는 marker만 보이고 label은 숨겨진다.
- `level 5` 이후에는 마커와 라벨이 숨겨진다.
- 별도 level HUD와 확대/축소 control이 보이지 않는다.
- 확대/축소 결과는 `mapLevel`과 라벨 표시 상태에 반영된다.
- 지도 마커를 선택하면 해당 place 상세 흐름이 열린다.
- 지도 마커 선택과 detail route sync가 background map auto-pan/auto-zoom을 만들지 않는다.
- Kakao SDK loading 중에는 사용자가 실제 지도로 오해하지 않는 명시적 진행 중 상태가 보이고, 가짜 마커/가짜 지도 화면은 보이지 않는다.
- Kakao SDK failure/unavailable 상태에서는 현재 맥락을 유지한 채 원인 인지와 재시도 경로를 확인할 수 있다.

## TDD Implementation Order
1. 초기 중심 테스트를 작성한다.
2. 마커 타입 분기 테스트를 작성한다.
3. 지도 마커 선택 상세 연동 테스트를 작성한다.
4. 지도 마커 선택/detail sync의 no-auto-pan/no-auto-zoom 테스트를 작성한다.
5. 라벨 임계값 테스트를 작성한다.
6. level HUD / 확대축소 control 비노출 테스트를 작성한다.
7. 좌표 없는 데이터 제외 테스트를 작성한다.
8. 지도 loading placeholder 테스트를 작성한다.
9. 지도 failure/unavailable retry UI 테스트를 작성한다.
10. 구현한다.
11. 전체 테스트를 통과시킨다.

## Required Test Cases
- 초기 중심 좌표
- `place_type`별 마커 분기
- 지도 마커 선택 시 상세 연동
- 지도 마커 선택/detail sync 시 background map auto-pan/auto-zoom 없음
- `level 3` 마커/라벨 표시
- `level 4` marker-only / label 숨김
- `level 5+` 마커/라벨 숨김
- level HUD / 확대축소 control 비노출
- runtime loading 상태에서 명시적 진행 중 상태 표시
- runtime failure/unavailable 상태에서 재시도 가능한 failure state 표시

## Manual QA Checklist
- 초기 지도 위치가 맞다.
- 마커 타입이 구분된다.
- 지도 마커를 누르면 해당 place 상세 흐름으로 이동한다.
- 확대/축소 시 마커/라벨 크기와 표시 여부가 단계적으로 바뀌고, `level 4`에서는 marker만 남고 `level 5`부터는 둘 다 사라진다.
- 별도 level HUD와 확대/축소 버튼이 보이지 않는다.
- Kakao SDK 로딩 중에는 fake-map 같은 오해 가능한 화면 대신 명시적 진행 중 상태가 보이고, 가짜 마커/가짜 지도 화면은 보이지 않는다.
- Kakao SDK 실패 시 현재 맥락을 잃지 않고 원인 인지와 재시도 경로를 확인할 수 있다.

## QA Evidence
- 테스트 실행 결과
- 지도 수동 검증 결과
