# Spec FR-04: Place Registration

## Summary
place 추가 입력 흐름과 저장 전 검증 규칙을 정의한다.

## Scope
- place 추가 UI
- 입력값 검증
- 초기 별점 기본값

## Functional Requirements
- 입력값은 `place_type`, `zeropay_status`, 초기 별점, 리뷰를 포함한다.
- `place_type = restaurant | cafe`
- `zeropay_status = available | unavailable | needs_verification`
- 초기 별점 UI는 별 모양 버튼을 사용한다.
- 초기 별점 기본값은 5점이다.
- 초기 별점은 1점에서 5점 사이 정수만 허용한다.
- 리뷰는 500자 이하로 제한한다.
- 최종 좌표를 확보한 경우에만 등록 흐름을 진행한다.

## Acceptance Criteria
- 초기 별점은 기본적으로 5점 선택 상태다.
- 잘못된 enum 값은 저장되지 않는다.
- 리뷰 500자 초과는 실패한다.
- 좌표 없는 place는 저장 단계로 넘어가지 않는다.

## TDD Implementation Order
1. enum 검증 테스트를 작성한다.
2. 초기 별점 기본값 테스트를 작성한다.
3. 별점 범위 테스트를 작성한다.
4. 리뷰 길이 제한 테스트를 작성한다.
5. 좌표 없는 등록 차단 테스트를 작성한다.
6. 구현한다.
7. 전체 테스트를 통과시킨다.

## Required Test Cases
- 초기 별점 기본값 5점
- 별점 1~5 외 값 실패
- 리뷰 500자 초과 실패
- 좌표 없는 place 등록 차단

## Manual QA Checklist
- place 추가 화면에서 5번째 별이 기본 선택이다.
- 잘못된 입력 시 에러가 보인다.

## QA Evidence
- 테스트 실행 결과
- 등록 폼 수동 검증 결과
