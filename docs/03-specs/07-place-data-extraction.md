# Spec: Place Data Extraction

## Summary
`naver_place_id`를 기준으로 place 데이터를 서버에서 조회하고, 최종 좌표를 확보한다.

## Scope
- 서버 측 place 조회
- 좌표 fallback
- 실패 시 등록 중단
- 조회 실패 피드백
- 조회 비동기 상태

## Functional Requirements
- place 조회는 서버 측에서 수행한다.
- 최소 대상 필드는 `name`, `road_address`, `land_lot_address`, `latitude`, `longitude`다.
- 좌표 확보 우선순위는 아래와 같다.
  1. 네이버 응답의 위도/경도
  2. `road_address` geocoding
  3. `land_lot_address` geocoding
- 조회 성공 시 place 추가 UI는 같은 화면 안의 다음 단계로 이어진다.
- 조회 성공 시 place 추가 UI 상단에 조회된 `name`과 대표 주소를 요약으로 표시한다.
- 대표 주소는 `road_address`를 우선 사용하고, 없으면 `land_lot_address`를 사용한다.
- 조회된 `name`과 대표 주소는 읽기 전용이며 사용자가 수정할 수 없다.
- 네이버 응답 실패 시 실패 modal을 표시하고 place 추가 UI에 머문다.
- 좌표를 끝까지 확보하지 못하면 실패 modal을 표시하고 place 추가 UI에 머문다.
- 조회 실패 또는 좌표 확보 실패 시 사용자가 입력한 Naver Map URL은 유지한다.
- 실패 modal에는 `다시 시도`와 `닫기` 액션을 제공한다.
- 조회 상태는 `place_lookup = idle | validating_url | loading | error`로 관리한다.
- `place_lookup = loading` 동안 같은 URL 조회를 다시 실행할 수 없다.

## Acceptance Criteria
- 네이버 좌표가 있으면 그대로 사용한다.
- 네이버 좌표가 없으면 주소 geocoding fallback을 순차적으로 시도한다.
- 조회 성공 시 같은 place 추가 UI 안의 다음 단계에서 place 이름과 대표 주소 요약이 보인다.
- 조회 성공 후 보이는 place 이름과 대표 주소는 읽기 전용이다.
- 네이버 응답 실패 시 저장이 진행되지 않고 실패 modal이 보인다.
- 최종 좌표 확보 실패 시 저장이 진행되지 않고 실패 modal이 보인다.
- 조회 실패 또는 좌표 확보 실패 시 입력한 Naver Map URL이 유지된다.
- 실패 modal의 `다시 시도`를 누르면 같은 URL로 조회를 다시 시도할 수 있다.
- 조회 중에는 진행 중 상태가 보이고 같은 URL 조회를 중복 실행할 수 없다.

## TDD Implementation Order
1. 네이버 조회 성공 테스트를 작성한다.
2. 네이버 좌표 우선 사용 테스트를 작성한다.
3. `road_address` fallback 테스트를 작성한다.
4. `land_lot_address` fallback 테스트를 작성한다.
5. 조회 성공 후 읽기 전용 place 요약 표시 테스트를 작성한다.
6. 조회 중 진행 상태 테스트를 작성한다.
7. 네이버 실패 modal 테스트를 작성한다.
8. 좌표 실패 modal 테스트를 작성한다.
9. 실패 후 URL 유지 테스트를 작성한다.
10. 조회 중 중복 실행 방지 테스트를 작성한다.
11. 실패 modal 재시도 테스트를 작성한다.
12. 구현한다.
13. 전체 테스트를 통과시킨다.

## Required Test Cases
- 네이버 응답 성공
- 네이버 좌표 사용
- 도로명 주소 fallback 성공
- 지번 주소 fallback 성공
- 조회 성공 후 place 이름/대표 주소 읽기 전용 표시
- 조회 중 진행 상태 표시
- 네이버 실패 시 modal 표시
- 최종 좌표 실패 시 modal 표시
- 조회 실패 후 URL 유지
- 조회 중 중복 실행 방지
- 실패 modal의 `다시 시도`

## Manual QA Checklist
- 네이버 좌표가 있는 place는 정상 진행된다.
- 주소 fallback이 필요한 place는 정상 진행된다.
- 조회 성공 후 같은 화면에서 place 이름과 대표 주소가 읽기 전용으로 보인다.
- 조회 중 진행 상태가 보인다.
- 조회 실패 시 modal이 보인다.
- 조회 실패 후 입력한 Naver Map URL이 유지된다.
- 조회 중 같은 URL 조회를 다시 실행할 수 없다.
- modal의 `다시 시도`로 재시도할 수 있다.

## QA Evidence
- 테스트 실행 결과
- fallback 수동 검증 결과
