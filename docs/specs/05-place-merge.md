# Spec FR-05: Place Merge

## Summary
중복 place를 `naver_place_id` 기준으로 병합하고, 필드 충돌 우선순위를 정의한다.

## Scope
- 중복 판정
- 병합 처리
- 필드 충돌 우선순위

## Functional Requirements
- `naver_place_id`를 canonical 중복 판정 키로 사용한다.
- 기존 `naver_place_id`가 있으면 새 place를 만들지 않는다.
- 필드 충돌 우선순위:
  - `naver_place_id`, `naver_place_url`은 canonical 식별자로 유지
  - `name`, 주소, 좌표는 최신 성공한 외부 추출값 우선
  - `place_type`은 최신 사용자 입력값 우선
  - `zeropay_status`는 확정값이 `needs_verification`보다 우선
  - 확정값끼리 충돌하면 최신 사용자 입력값 우선
  - 별점/리뷰/추천은 사용자별 기록으로 누적 또는 갱신

## Acceptance Criteria
- 같은 `naver_place_id`는 place 1건으로 유지된다.
- 충돌 필드는 우선순위 규칙대로 병합된다.
- 사용자 기여 데이터는 누적/갱신된다.

## TDD Implementation Order
1. 신규 place 생성 테스트를 작성한다.
2. 중복 `naver_place_id` 병합 테스트를 작성한다.
3. 외부 추출값 우선 테스트를 작성한다.
4. `zeropay_status` 우선순위 테스트를 작성한다.
5. 사용자 기여 데이터 누적 테스트를 작성한다.
6. 구현한다.
7. 전체 테스트를 통과시킨다.

## Required Test Cases
- 신규 place 생성
- 중복 place 병합
- 외부 추출값 우선 반영
- `needs_verification`보다 확정 상태 우선
- 별점/리뷰/추천 누적 처리

## Manual QA Checklist
- 중복 등록 시 새 row가 생기지 않는다.
- 병합 후 상세 데이터가 기대값과 맞다.

## QA Evidence
- 테스트 실행 결과
- 중복 병합 수동 검증 결과
