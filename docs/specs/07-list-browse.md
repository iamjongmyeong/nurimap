# Spec FR-07: List Browse

## Summary
place 목록 표시와 목록 기반 탐색 규칙을 정의한다.

## Scope
- 목록 표시 필드
- 목록 선택 동작

## Functional Requirements
- 목록에는 이름, 주소, 평균 별점, 리뷰 수를 표시한다.
- 목록에서 place를 선택하면 상세 화면과 연동된다.
- 목록은 place를 빠르게 비교할 수 있어야 한다.

## Acceptance Criteria
- 목록에 평균 별점과 리뷰 수가 보인다.
- 목록 선택 시 상세 화면이 열린다.

## TDD Implementation Order
1. 목록 표시 필드 테스트를 작성한다.
2. 상세 연동 테스트를 작성한다.
3. 빈 목록 상태 테스트를 작성한다.
4. 구현한다.
5. 전체 테스트를 통과시킨다.

## Required Test Cases
- 이름/주소/평균 별점/리뷰 수 표시
- 목록 선택 시 상세 연동
- 데이터 없음 상태 처리

## Manual QA Checklist
- 목록에서 place 비교가 가능하다.
- 클릭 시 상세가 열린다.

## QA Evidence
- 테스트 실행 결과
- 목록 수동 검증 결과
