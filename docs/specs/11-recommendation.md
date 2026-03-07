# Spec FR-11: Recommendation

## Summary
추천 추가/취소와 추천 수 집계 규칙을 정의한다.

## Scope
- 추천 추가
- 추천 취소
- 추천 수 집계

## Functional Requirements
- 로그인 사용자만 추천할 수 있다.
- 한 사용자는 place마다 하나의 recommendation 상태만 가진다.
- 추천 버튼을 다시 누르면 추천을 취소한다.
- 추천 수를 집계해 상세 화면에 표시한다.

## Acceptance Criteria
- 로그인 사용자는 추천을 추가/취소할 수 있다.
- 추천 수가 정확히 반영된다.

## TDD Implementation Order
1. 추천 추가 테스트를 작성한다.
2. 추천 취소 테스트를 작성한다.
3. 추천 수 집계 테스트를 작성한다.
4. 비로그인 차단 테스트를 작성한다.
5. 구현한다.
6. 전체 테스트를 통과시킨다.

## Required Test Cases
- 추천 추가 성공
- 추천 버튼 재클릭 시 취소
- 추천 수 집계 갱신
- 비로그인 사용자 실패

## Manual QA Checklist
- 추천 버튼 클릭 시 수가 증가한다.
- 다시 클릭 시 취소된다.
- 추천 수가 상세 화면에 반영된다.

## QA Evidence
- 테스트 실행 결과
- 추천 수동 검증 결과
