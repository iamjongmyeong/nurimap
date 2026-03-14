# Spec: Place Merge

## Summary
중복 place를 현재 canonical 판정 규칙에 따라 병합하고, 필드 충돌 우선순위를 정의한다.

## Scope
- 중복 판정
- 병합 처리
- 필드 충돌 우선순위
- 사용자별 review uniqueness 유지

## Functional Requirements
- 현재 canonical 중복 판정 키는 정규화된 `name + road_address` 조합이다.
- `road_address`가 없는 경우에만 `name + land_lot_address`를 보조 중복 판정 키로 사용할 수 있다.
- 기존 canonical key가 있으면 새 place를 만들지 않는다.
- 병합 또는 업데이트 성공 시 등록 화면을 닫고 기존 place 상세 화면을 연다.
- 병합 또는 업데이트 성공 시 지도와 목록을 최신 상태로 갱신한다.
- 중복 장소 처리 전에는 browser confirm으로 기존 장소에 반영할지 묻는다.
- 필드 충돌 우선순위:
  - canonical duplicate key는 정규화된 `name + road_address`를 기준으로 유지한다.
  - `name`, 주소, 좌표는 최신 사용자 확인값 우선
  - `place_type`은 최신 사용자 입력값 우선
  - `zeropay_status`는 확정값이 `needs_verification`보다 우선
  - 확정값끼리 충돌하면 최신 사용자 입력값 우선
- review와 별점은 `(place_id, author_user_id)` 기준 1건만 유지한다.
  - 현재 사용자가 같은 place에 review가 없는 상태에서 중복이 발생하면, confirm 후 입력한 초기 후기와 별점을 기존 place의 첫 review로 저장할 수 있다.
  - 현재 사용자가 같은 place에 review가 있는 상태에서 중복이 발생하면, confirm 후 입력한 평가/후기로 내 review를 덮어쓸 수 있다.
  - 이때 `review_content`가 비어 있으면 기존 후기 내용은 유지하고 `rating_score`만 갱신한다.
  - `place_type`, `zeropay_status`도 같은 confirm에서 함께 반영한다.
  - recommendation은 사용자별 단일 상태를 유지한다.

## Acceptance Criteria
- 같은 canonical duplicate key는 place 1건으로 유지된다.
- 충돌 필드는 우선순위 규칙대로 병합된다.
- 사용자 기여 데이터는 누적/갱신된다.
- 병합 후 같은 사용자에 대한 중복 review가 생성되지 않는다.
- 병합 과정에서 browser confirm이 보인다.
- confirm `취소` 시 현재 등록 화면에 머무르고 입력값이 유지된다.
- 병합 또는 업데이트 성공 시 새 place를 만들지 않고 기존 place 상세 화면이 열린다.

## TDD Implementation Order
1. 신규 place 생성 테스트를 작성한다.
2. 중복 canonical key 병합 테스트를 작성한다.
3. 최신 사용자 확인값 우선 테스트를 작성한다.
4. `zeropay_status` 우선순위 테스트를 작성한다.
5. 사용자 기여 데이터 누적 테스트를 작성한다.
6. 병합 후 review uniqueness 유지 테스트를 작성한다.
7. 중복 장소 confirm 표시 테스트를 작성한다.
8. 중복 장소 confirm `확인` 처리 테스트를 작성한다.
9. 중복 장소 confirm `취소` 유지 테스트를 작성한다.
10. 기존 review overwrite 테스트를 작성한다.
11. 후기 비어 있음 시 평가만 갱신 테스트를 작성한다.
12. 병합 또는 업데이트 성공 후 기존 상세 이동 테스트를 작성한다.
13. 구현한다.
14. 전체 테스트를 통과시킨다.

## Required Test Cases
- 신규 place 생성
- 중복 place 병합
- 최신 사용자 확인값 우선 반영
- `needs_verification`보다 확정 상태 우선
- 별점/리뷰/추천 누적 처리
- 병합 후 review uniqueness 유지
- 중복 장소 confirm 표시
- 중복 장소 confirm `확인` 처리
- 중복 장소 confirm `취소` 유지
- 기존 review overwrite
- 후기 비어 있음 시 평가만 갱신
- 병합 또는 업데이트 성공 시 기존 place 상세 이동

## Manual QA Checklist
- 중복 등록 시 새 row가 생기지 않는다.
- 병합 후 상세 데이터가 기대값과 맞다.
- 병합 후 같은 사용자의 review가 중복 생성되지 않는다.
- 중복 장소가 발견되면 browser confirm이 보인다.
- 내 review가 이미 있으면 overwrite 여부를 묻는 browser confirm이 보인다.
- 후기를 비워 두고 overwrite하면 기존 후기 내용은 유지되고 평가만 갱신된다.
- 병합 또는 업데이트 성공 시 기존 place 상세 화면이 열린다.

## QA Evidence
- 테스트 실행 결과
- 중복 병합 수동 검증 결과
