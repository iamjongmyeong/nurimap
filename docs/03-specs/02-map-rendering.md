# Spec: Map Rendering

## Summary
Kakao Map 위에 place를 마커와 라벨로 렌더링하는 규칙과 runtime loading/failure fallback UI를 정의한다.

## Scope
- 지도 초기 중심
- 마커 타입 분기
- 라벨 표시 정책
- 확대/축소 control
- 마커 선택 동작
- runtime loading/failure fallback

## Functional Requirements
- 지도 초기 중심은 `37.558721, 126.924440`이다.
- `place_type`에 따라 다른 마커 아이콘을 사용한다.
- 라벨은 `level 1-5`에서 표시하고 `level 6`부터 숨긴다.
- Kakao Maps JavaScript API의 공식 확대/축소 control을 지도 위에 노출한다.
- 확대/축소 control 조작 결과는 내부 `mapLevel` 상태와 동기화되어야 한다.
- 지도에 표시되는 place는 모두 좌표를 가져야 한다.
- 지도 마커를 선택하면 해당 place 선택 상태가 갱신되고 상세 화면과 연동된다.
- runtime browser에서 Kakao SDK가 아직 준비되지 않았을 때는 fake-map gradient를 loading UX로 사용하지 않고, 약한 placeholder 배경 위에 spinner와 `지도를 불러오는 중이에요.` 문구를 표시한다.
- runtime browser에서 Kakao SDK load failure 또는 runtime unavailable 상태가 발생하면 현재 browse/detail 맥락을 유지한 채 지도 영역 안에 `지도를 불러오지 못했어요.` 제목, `네트워크 상태를 확인한 뒤 다시 시도해주세요.` 설명, `다시 시도` 버튼을 표시한다.
- 테스트/JSDOM에서는 deterministic fallback renderer를 사용할 수 있지만, runtime browser의 loading/failure UI와 동일한 역할로 간주하지 않는다.

## Acceptance Criteria
- 식당과 카페가 다른 마커로 보인다.
- `level 5`에서는 라벨이 보인다.
- `level 6`에서는 라벨이 숨겨진다.
- 확대/축소 control이 보이고, 조작하면 `mapLevel`과 라벨 표시 상태가 함께 갱신된다.
- 지도 마커를 선택하면 해당 place 상세 흐름이 열린다.
- Kakao SDK loading 중에는 약한 placeholder 배경 위에 spinner와 `지도를 불러오는 중이에요.` 문구가 보이고, 가짜 마커/가짜 지도 화면은 보이지 않는다.
- Kakao SDK failure/unavailable 상태에서는 `지도를 불러오지 못했어요.`, `네트워크 상태를 확인한 뒤 다시 시도해주세요.`, `다시 시도`가 보인다.

## TDD Implementation Order
1. 초기 중심 테스트를 작성한다.
2. 마커 타입 분기 테스트를 작성한다.
3. 지도 마커 선택 상세 연동 테스트를 작성한다.
4. 라벨 임계값 테스트를 작성한다.
5. 확대/축소 control 표시 및 상태 연동 테스트를 작성한다.
6. 좌표 없는 데이터 제외 테스트를 작성한다.
7. 지도 loading placeholder 테스트를 작성한다.
8. 지도 failure/unavailable retry UI 테스트를 작성한다.
9. 구현한다.
10. 전체 테스트를 통과시킨다.

## Required Test Cases
- 초기 중심 좌표
- `place_type`별 마커 분기
- 지도 마커 선택 시 상세 연동
- `level 5` 라벨 표시
- `level 6` 라벨 숨김
- 확대/축소 control 표시 및 상태 연동
- runtime loading 상태 placeholder/spinner/문구 표시
- runtime failure/unavailable 상태 failure copy + `다시 시도` 표시

## Manual QA Checklist
- 초기 지도 위치가 맞다.
- 마커 타입이 구분된다.
- 지도 마커를 누르면 해당 place 상세 흐름으로 이동한다.
- 확대/축소 시 라벨 표시가 바뀐다.
- 확대/축소 버튼이 보이고 클릭으로 줌 단계가 바뀐다.
- Kakao SDK 로딩 중에는 이상한 fake-map 대신 `지도를 불러오는 중이에요.` 문구와 spinner가 보이고, 가짜 마커/가짜 지도 화면은 보이지 않는다.
- Kakao SDK 실패 시 현재 맥락을 잃지 않고 `지도를 불러오지 못했어요.`, `네트워크 상태를 확인한 뒤 다시 시도해주세요.`, `다시 시도`가 보인다.

## QA Evidence
- 테스트 실행 결과
- 지도 수동 검증 결과
