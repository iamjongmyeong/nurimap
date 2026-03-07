# Spec FR-02: Naver URL Normalization

## Summary
지원하는 네이버 지도 URL을 검증하고 canonical URL과 `naver_place_id`로 정규화한다.

## Scope
- URL 형식 검증
- `placeId` 추출
- canonical URL 생성
- 오류 처리

## Functional Requirements
- `map.naver.com` 호스트만 허용한다.
- 지원 형식 예시:
  - `https://map.naver.com/p/search/.../place/{placeId}?...`
  - `https://map.naver.com/p/entry/place/{placeId}?...`
- 입력 URL에서 `placeId`를 추출한다.
- canonical URL은 `https://map.naver.com/p/entry/place/{placeId}`로 통일한다.
- 잘못된 URL은 즉시 실패 처리한다.

## Acceptance Criteria
- 지원 URL은 모두 동일한 canonical URL로 변환된다.
- 지원하지 않는 URL은 실패한다.
- `placeId`가 없으면 실패한다.

## TDD Implementation Order
1. 지원 URL 판정 테스트를 작성한다.
2. `placeId` 추출 테스트를 작성한다.
3. canonical URL 생성 테스트를 작성한다.
4. 비지원 URL 실패 테스트를 작성한다.
5. 구현한다.
6. 전체 테스트를 통과시킨다.

## Required Test Cases
- `search/.../place/{placeId}` 형식 인식
- `entry/place/{placeId}` 형식 인식
- 다른 호스트 거부
- `placeId` 누락 실패
- canonical URL 변환 성공

## Manual QA Checklist
- 지원 URL을 붙여넣으면 정규화된다.
- 잘못된 URL을 붙여넣으면 오류가 보인다.

## QA Evidence
- 테스트 실행 결과
- 지원/비지원 URL 샘플 검증 결과
