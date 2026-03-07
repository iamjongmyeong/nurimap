# Spec FR-03: Place Data Extraction

## Summary
`naver_place_id`를 기준으로 place 데이터를 서버에서 조회하고, 최종 좌표를 확보한다.

## Scope
- 서버 측 place 조회
- 좌표 fallback
- 실패 시 등록 중단

## Functional Requirements
- place 조회는 서버 측에서 수행한다.
- 최소 대상 필드는 `name`, `road_address`, `land_lot_address`, `latitude`, `longitude`다.
- 좌표 확보 우선순위는 아래와 같다.
  1. 네이버 응답의 위도/경도
  2. `road_address` geocoding
  3. `land_lot_address` geocoding
- 네이버 응답 실패 시 alert를 표시하고 등록을 종료한다.
- 좌표를 끝까지 확보하지 못하면 alert를 표시하고 등록을 종료한다.

## Acceptance Criteria
- 네이버 좌표가 있으면 그대로 사용한다.
- 네이버 좌표가 없으면 주소 geocoding fallback을 순차적으로 시도한다.
- 네이버 응답 실패 시 저장이 진행되지 않는다.
- 최종 좌표 확보 실패 시 저장이 진행되지 않는다.

## TDD Implementation Order
1. 네이버 조회 성공 테스트를 작성한다.
2. 네이버 좌표 우선 사용 테스트를 작성한다.
3. `road_address` fallback 테스트를 작성한다.
4. `land_lot_address` fallback 테스트를 작성한다.
5. 네이버 실패 종료 테스트를 작성한다.
6. 좌표 실패 종료 테스트를 작성한다.
7. 구현한다.
8. 전체 테스트를 통과시킨다.

## Required Test Cases
- 네이버 응답 성공
- 네이버 좌표 사용
- 도로명 주소 fallback 성공
- 지번 주소 fallback 성공
- 네이버 실패 시 종료
- 최종 좌표 실패 시 종료

## Manual QA Checklist
- 네이버 좌표가 있는 place는 정상 진행된다.
- 주소 fallback이 필요한 place는 정상 진행된다.
- 실패 시 alert가 보인다.

## QA Evidence
- 테스트 실행 결과
- fallback 수동 검증 결과
