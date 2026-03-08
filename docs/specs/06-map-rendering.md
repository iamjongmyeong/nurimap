# Spec FR-06: Map Rendering

## Summary
Kakao Map 위에 place를 마커와 라벨로 렌더링하는 규칙을 정의한다.

## Scope
- 지도 초기 중심
- 마커 타입 분기
- 라벨 표시 정책
- 마커 선택 동작

## Functional Requirements
- 지도 초기 중심은 `37.558721, 126.924440`이다.
- `place_type`에 따라 다른 마커 아이콘을 사용한다.
- 라벨은 `level 1-5`에서 표시하고 `level 6`부터 숨긴다.
- 지도에 표시되는 place는 모두 좌표를 가져야 한다.
- 지도 마커를 선택하면 해당 place 선택 상태가 갱신되고 상세 화면과 연동된다.

## Acceptance Criteria
- 식당과 카페가 다른 마커로 보인다.
- `level 5`에서는 라벨이 보인다.
- `level 6`에서는 라벨이 숨겨진다.
- 지도 마커를 선택하면 해당 place 상세 흐름이 열린다.

## TDD Implementation Order
1. 초기 중심 테스트를 작성한다.
2. 마커 타입 분기 테스트를 작성한다.
3. 지도 마커 선택 상세 연동 테스트를 작성한다.
4. 라벨 임계값 테스트를 작성한다.
5. 좌표 없는 데이터 제외 테스트를 작성한다.
6. 구현한다.
7. 전체 테스트를 통과시킨다.

## Required Test Cases
- 초기 중심 좌표
- `place_type`별 마커 분기
- 지도 마커 선택 시 상세 연동
- `level 5` 라벨 표시
- `level 6` 라벨 숨김

## Manual QA Checklist
- 초기 지도 위치가 맞다.
- 마커 타입이 구분된다.
- 지도 마커를 누르면 해당 place 상세 흐름으로 이동한다.
- 확대/축소 시 라벨 표시가 바뀐다.

## QA Evidence
- 테스트 실행 결과
- 지도 수동 검증 결과
