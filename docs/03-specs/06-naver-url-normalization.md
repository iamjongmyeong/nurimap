# Spec: Naver Map URL Normalization (Deferred)

## Summary
현재 기본 등록 흐름은 URL 입력을 사용하지 않는다. 이 문서는 추후 필요 시 지원할 수 있는 Naver Map URL 정규화 규칙을 정의한다.

## Scope
- 향후 선택 기능으로 도입할 수 있는 URL 형식 검증
- `placeId` 추출
- canonical URL 생성
- 비차단 오류 처리

## Functional Requirements
- 현재 기본 등록 흐름은 이름/주소 직접 입력이다.
- 추후 필요 시 Naver Map URL 입력을 선택 기능으로 다시 검토할 수 있다.
- 지원 형식 예시:
  - `https://naver.me/{shortCode}`
  - `https://map.naver.com/p/favorite/.../place/{placeId}?...`
  - `https://map.naver.com/p/search/.../place/{placeId}?...`
  - `https://map.naver.com/p/entry/place/{placeId}?...`
- `naver.me` short link는 서버에서 redirect 대상 URL을 해석한 뒤 `placeId`를 추출한다.
- 입력 URL에서 `placeId`를 추출할 수 있으면 canonical URL은 `https://map.naver.com/p/entry/place/{placeId}`로 통일한다.
- 현재 릴리즈에서는 URL 입력이 없어도 등록 흐름이 동작해야 한다.
- URL 정규화 실패 시 사용자가 입력한 값은 유지한다.

## Acceptance Criteria
- 지원 URL은 canonical URL로 변환된다.
- URL 입력을 사용하지 않아도 등록 흐름은 정상 동작한다.
- `placeId`가 없으면 canonical URL 생성에 실패할 수 있다.
- URL 정규화 실패 시 입력한 값이 유지된다.

## TDD Implementation Order
1. 지원 URL 판정 테스트를 작성한다.
2. `placeId` 추출 테스트를 작성한다.
3. canonical URL 생성 테스트를 작성한다.
4. short link redirect 해석 테스트를 작성한다.
5. URL 입력 미사용 상태 테스트를 작성한다.
6. 구현한다.
7. 전체 테스트를 통과시킨다.

## Required Test Cases
- `naver.me/{shortCode}` short link 해석
- `favorite/.../place/{placeId}` 형식 인식
- `search/.../place/{placeId}` 형식 인식
- `entry/place/{placeId}` 형식 인식
- URL 입력 없이도 등록 흐름 유지
- `placeId` 누락 시 canonicalization 실패
- canonical URL 변환 성공
- URL 형식 검증 실패 시 입력값 유지

## Manual QA Checklist
- 향후 URL 입력을 다시 붙이더라도 canonical URL 규칙이 유지된다.
- URL 입력을 사용하지 않아도 기본 등록 흐름은 동작한다.

## QA Evidence
- 테스트 실행 결과
- URL 샘플 검증 결과
