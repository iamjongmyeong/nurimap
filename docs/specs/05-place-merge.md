# Spec FR-05: Place Merge

## Summary
중복 place를 `naver_place_id` 기준으로 병합하고, 필드 충돌 우선순위를 정의한다.

## Scope
- 중복 판정
- 병합 처리
- 필드 충돌 우선순위
- 사용자별 review uniqueness 유지

## Functional Requirements
- `naver_place_id`를 canonical 중복 판정 키로 사용한다.
- 기존 `naver_place_id`가 있으면 새 place를 만들지 않는다.
- 병합 성공 시 place 추가 UI를 닫고 병합된 기존 place 상세 화면을 연다.
- 병합 성공 시 지도와 목록을 최신 상태로 갱신한다.
- 병합 성공은 신규 생성과 구분 가능한 성공 메시지로 표시한다.
- 필드 충돌 우선순위:
  - `naver_place_id`, `naver_place_url`은 canonical 식별자로 유지
  - `name`, 주소, 좌표는 최신 성공한 외부 추출값 우선
  - `place_type`은 최신 사용자 입력값 우선
  - `zeropay_status`는 확정값이 `needs_verification`보다 우선
  - 확정값끼리 충돌하면 최신 사용자 입력값 우선
- review와 별점은 `(place_id, author_user_id)` 기준 1건만 유지한다.
  - 현재 사용자가 이미 같은 place에 review를 가진 상태에서 병합이 발생하면 제목이 `이미 리뷰를 남긴 장소예요`인 modal을 표시하고 새 review를 추가하지 않는다.
  - 현재 사용자가 같은 place에 review가 없는 상태에서 병합이 발생하면 입력한 초기 리뷰와 별점을 첫 review로 저장할 수 있다.
  - recommendation은 사용자별 단일 상태를 유지한다.

## Acceptance Criteria
- 같은 `naver_place_id`는 place 1건으로 유지된다.
- 충돌 필드는 우선순위 규칙대로 병합된다.
- 사용자 기여 데이터는 누적/갱신된다.
- 병합 후 같은 사용자에 대한 중복 review가 생성되지 않는다.
- 병합 과정에서 현재 사용자에게 기존 review가 있으면 `이미 리뷰를 남긴 장소예요` modal을 확인할 수 있다.
- 병합 성공 시 새 place를 만들지 않고 기존 place 상세 화면이 열린다.
- 병합 성공 시 신규 생성과 다른 성공 메시지를 확인할 수 있다.

## TDD Implementation Order
1. 신규 place 생성 테스트를 작성한다.
2. 중복 `naver_place_id` 병합 테스트를 작성한다.
3. 외부 추출값 우선 테스트를 작성한다.
4. `zeropay_status` 우선순위 테스트를 작성한다.
5. 사용자 기여 데이터 누적 테스트를 작성한다.
6. 병합 후 review uniqueness 유지 테스트를 작성한다.
7. 기존 review 존재 시 중복 리뷰 modal 표시 테스트를 작성한다.
8. 병합 성공 후 기존 상세 이동 테스트를 작성한다.
9. 병합 성공 메시지 테스트를 작성한다.
10. 구현한다.
11. 전체 테스트를 통과시킨다.

## Required Test Cases
- 신규 place 생성
- 중복 place 병합
- 외부 추출값 우선 반영
- `needs_verification`보다 확정 상태 우선
- 별점/리뷰/추천 누적 처리
- 병합 후 review uniqueness 유지
- 기존 review 존재 시 중복 리뷰 modal 표시
- 병합 성공 시 기존 place 상세 이동
- 병합 성공 메시지 표시

## Manual QA Checklist
- 중복 등록 시 새 row가 생기지 않는다.
- 병합 후 상세 데이터가 기대값과 맞다.
- 병합 후 같은 사용자의 review가 중복 생성되지 않는다.
- 기존 review가 있으면 `이미 리뷰를 남긴 장소예요` modal이 보인다.
- 병합 성공 시 기존 place 상세 화면이 열린다.
- 병합 성공 시 신규 생성과 구분되는 메시지가 보인다.

## QA Evidence
- 테스트 실행 결과
- 중복 병합 수동 검증 결과
