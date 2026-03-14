# Spec: Place Data Extraction

## Summary
사용자가 입력한 장소명/주소를 기준으로 서버에서 좌표를 확보하고, 저장 가능한 place 데이터를 구성한다.

## Scope
- 서버 측 geocoding
- 좌표 fallback
- 실패 시 등록 중단
- 실패 피드백
- 저장 전 좌표 확보

## Functional Requirements
- place 좌표 확보는 서버 측에서 수행한다.
- 최소 입력 필드는 `name`, `road_address`다.
- 선택 필드는 `land_lot_address`다.
- 좌표 확보 우선순위는 아래와 같다.
  1. `road_address` geocoding
  2. `land_lot_address` geocoding
- 사용자가 `등록`을 실행하면 시스템은 저장 전에 좌표 확보를 시도한다.
- geocoding 실패 시 place는 저장되지 않는다.
- geocoding 실패 시 browser alert으로 `주소를 찾지 못했어요.\n\n입력한 주소를 다시 확인해 주세요.`를 보여준다.
- geocoding 실패 시 주소 입력 필드에 inline error를 표시한다.
- geocoding 실패 시 사용자가 입력한 값은 유지한다.
- `place_submit = submitting` 동안 같은 등록 요청을 다시 실행할 수 없다.

## Acceptance Criteria
- 도로명 주소 geocoding이 성공하면 그 좌표를 사용한다.
- 도로명 주소 geocoding이 실패하면 지번 주소 geocoding fallback을 순차적으로 시도한다.
- geocoding 실패 시 저장이 진행되지 않는다.
- geocoding 실패 시 browser alert과 주소 필드 inline error가 함께 보인다.
- geocoding 실패 시 입력한 값이 유지된다.
- 등록 중에는 진행 중 상태가 보이고 같은 등록 요청을 중복 실행할 수 없다.

## TDD Implementation Order
1. geocoding 성공 테스트를 작성한다.
2. 도로명 주소 우선 사용 테스트를 작성한다.
3. `land_lot_address` fallback 테스트를 작성한다.
4. geocoding 실패 시 저장 차단 테스트를 작성한다.
5. 실패 후 입력값 유지 테스트를 작성한다.
6. 진행 상태 테스트를 작성한다.
7. 중복 실행 방지 테스트를 작성한다.
8. 구현한다.
9. 전체 테스트를 통과시킨다.

## Required Test Cases
- geocoding 성공
- 도로명 주소 geocoding 우선 사용
- 지번 주소 fallback 성공
- geocoding 실패 시 저장 차단
- geocoding 실패 시 browser alert 표시
- geocoding 실패 시 주소 필드 inline error 표시
- geocoding 실패 후 입력값 유지
- 저장 중 진행 상태 표시
- 저장 중 중복 실행 방지

## Manual QA Checklist
- 등록 시 geocoding이 성공하면 place가 저장된다.
- 지번 주소 fallback이 필요한 경우 정상 진행된다.
- geocoding 실패 시 저장되지 않는다.
- geocoding 실패 시 browser alert(`주소를 찾지 못했어요.\n\n입력한 주소를 다시 확인해 주세요.`)이 보인다.
- geocoding 실패 후 입력한 값이 유지된다.
- 저장 중 진행 상태가 보인다.
- 저장 중 같은 요청을 다시 실행할 수 없다.

## QA Evidence
- 테스트 실행 결과
- geocoding fallback 수동 검증 결과
