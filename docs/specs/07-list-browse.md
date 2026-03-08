# Spec FR-07: List Browse

## Summary
place 목록 표시와 목록 기반 탐색 규칙을 정의한다.

## Scope
- 목록 표시 필드
- 목록 선택 동작
- 모바일 목록 페이지에서 상세 이동
- 목록 로딩/빈 상태

## Functional Requirements
- 목록에는 이름, 평균 별점, 리뷰 수를 표시한다.
- 목록에는 `zeropay_status = available`인 place에만 제로페이 로고를 표시한다.
- 목록의 제로페이 로고 높이는 평균 별점 UI 높이와 동일하다.
- `zeropay_status = unavailable | needs_verification`인 place는 목록에서 제로페이 로고를 표시하지 않는다.
- 목록에서 place를 선택하면 상세 화면과 연동된다.
- 목록은 place를 빠르게 비교할 수 있어야 한다.
- 모바일 목록 페이지에서 place를 선택하면 전체 화면 상세 페이지로 이동한다.
- 목록 상태는 `place_list_load = idle | loading | empty | ready | error`로 관리한다.
- 목록 로딩 중에는 진행 중 상태를 표시한다.
- 목록 데이터가 0건이면 empty state를 표시한다.
- 목록 로딩 실패 시 현재 목록 영역에서 에러와 재시도 액션을 표시한다.

## Acceptance Criteria
- 목록에 평균 별점과 리뷰 수가 보인다.
- `zeropay_status = available`인 place 목록 item에는 평균 별점 UI 높이와 같은 제로페이 로고가 보인다.
- `zeropay_status = unavailable | needs_verification`인 place 목록 item에는 제로페이 로고가 보이지 않는다.
- 목록 선택 시 상세 화면이 열린다.
- 모바일 목록 페이지에서 place 선택 시 전체 화면 상세 페이지가 열린다.
- 목록 로딩 중에는 진행 중 상태가 보인다.
- 목록 데이터가 없으면 empty state가 보인다.
- 목록 로딩 실패 시 재시도 액션을 확인할 수 있다.

## TDD Implementation Order
1. 목록 표시 필드 테스트를 작성한다.
2. 제로페이 로고 표시 테스트를 작성한다.
3. 상세 연동 테스트를 작성한다.
4. 모바일 목록에서 전체 화면 상세 이동 테스트를 작성한다.
5. 목록 로딩 상태 테스트를 작성한다.
6. 빈 목록 상태 테스트를 작성한다.
7. 목록 로딩 실패 상태 테스트를 작성한다.
8. 구현한다.
9. 전체 테스트를 통과시킨다.

## Required Test Cases
- 이름/평균 별점/리뷰 수 표시
- `zeropay_status = available`일 때 제로페이 로고 표시
- `zeropay_status = unavailable | needs_verification`일 때 제로페이 로고 미표시
- 목록 선택 시 상세 연동
- 모바일 목록 페이지에서 place 선택 시 전체 화면 상세 이동
- 목록 로딩 상태 표시
- 데이터 없음 상태 처리
- 목록 로딩 실패 시 재시도

## Manual QA Checklist
- 목록에서 place 비교가 가능하다.
- 제로페이 가능 place에는 평균 별점 UI 높이와 같은 제로페이 로고가 보인다.
- 제로페이 미확인 또는 불가 place에는 제로페이 로고가 보이지 않는다.
- 클릭 시 상세가 열린다.
- 모바일 목록 페이지에서 place를 누르면 전체 화면 상세 페이지가 열린다.
- 목록 로딩 중 진행 상태가 보인다.
- 목록 데이터가 없을 때 empty state가 보인다.
- 목록 로딩 실패 시 재시도 액션이 보인다.

## QA Evidence
- 테스트 실행 결과
- 목록 수동 검증 결과
