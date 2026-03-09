# Spec: Naver Map URL Normalization

## Summary
지원하는 Naver Map URL을 검증하고 canonical URL과 `naver_place_id`로 정규화한다.

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
- Naver Map URL이 아니면 URL 입력 필드 아래에 inline error로 `네이버 지도 URL을 입력해주세요.` 문구를 표시한다.
- URL 형식 검증 실패 시 사용자가 입력한 URL은 유지한다.

## Acceptance Criteria
- 지원 URL은 모두 동일한 canonical URL로 변환된다.
- 지원하지 않는 URL은 inline error `네이버 지도 URL을 입력해주세요.`와 함께 실패한다.
- `placeId`가 없으면 inline error `네이버 지도 URL을 입력해주세요.`와 함께 실패한다.
- URL 형식 검증 실패 시 입력한 URL이 유지된다.

## TDD Implementation Order
1. 지원 URL 판정 테스트를 작성한다.
2. `placeId` 추출 테스트를 작성한다.
3. canonical URL 생성 테스트를 작성한다.
4. 비지원 URL inline error 테스트를 작성한다.
5. URL 유지 테스트를 작성한다.
6. 구현한다.
7. 전체 테스트를 통과시킨다.

## Required Test Cases
- `search/.../place/{placeId}` 형식 인식
- `entry/place/{placeId}` 형식 인식
- 다른 호스트 거부
- `placeId` 누락 실패
- canonical URL 변환 성공
- 비지원 URL 입력 시 `네이버 지도 URL을 입력해주세요.` 표시
- URL 형식 검증 실패 시 입력값 유지

## Manual QA Checklist
- 지원 URL을 붙여넣으면 정규화된다.
- 잘못된 URL을 붙여넣으면 `네이버 지도 URL을 입력해주세요.` inline error가 보인다.
- 잘못된 URL을 붙여넣어도 입력값은 유지된다.

## QA Evidence
- 테스트 실행 결과
- 지원/비지원 URL 샘플 검증 결과
