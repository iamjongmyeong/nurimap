# Spec: Place Detail

## Summary
anonymous/authenticated 사용자가 공통 canonical detail route에서 place 상세와 리뷰를 보고, write CTA는 로그인 전환을 거쳐 add-rating으로 이어지는 규칙을 정의한다.

## Scope
- anonymous detail access
- 상세 표시 필드
- 데스크톱 상세 닫기 동작
- 데스크톱 목록 영역 전환형 상세
- 모바일 상세 표현 방식
- 모바일 뒤로 가기 동작
- canonical detail route direct entry
- 상세 로딩/오류 상태
- detail 하단 `평가 남기기` CTA와 add-rating 전 auth gating

## Functional Requirements
- anonymous 사용자는 로그인하지 않아도 `/places/:placeId` 상세와 리뷰, 작성자/등록자 정보를 볼 수 있어야 한다.
- 상세 화면에는 이름, 주소, 장소 추가자 이름, 종류, 평균 별점, 별점 수, 제로페이 가능 여부, 리뷰를 표시한다.
- 리뷰와 평가는 가장 최근에 작성된 항목이 위로 오도록 최신순으로 표시한다.
- 화면에 표시하는 `별점 수`는 내부 집계 필드 `review_count`를 의미한다.
- detail은 공유 가능하고 다시 진입 가능한 canonical detail route를 가진다.
- canonical detail route direct entry 또는 refresh 시 유효한 placeId면 해당 상세 화면이 열린다.
- canonical detail route direct entry 또는 refresh는 background map viewport를 자동으로 이동하거나 확대/축소하지 않는다.
- 유효하지 않은 `placeId`로 진입하면 사용자는 안전한 browse 상태(`/`)로 복귀해야 한다.
- 데스크톱과 모바일에서 동일한 정보 구조를 유지한다.
- 데스크톱 상세는 별도 floating panel이 아니라 기존 목록 영역 안에서 열린다.
- 데스크톱에서 닫기 액션을 누르면 상세를 닫고 목록 탐색 상태(`/`)로 돌아간다.
- 모바일 상세는 modal이나 bottom sheet가 아니라 전체 화면 페이지로 표시한다.
- 모바일에서 화면의 뒤로 가기 버튼과 브라우저 기본 뒤로 가기는 browse origin에 따라 이동한다: list-origin이면 목록으로, map-origin이면 지도로, origin-less direct-entry/refresh detail이면 목록 fallback으로 복귀한다.
- 상세 진입과 복귀는 데스크톱/모바일 모두 background map viewport를 자동으로 이동하거나 확대/축소하지 않는다.
- 상세를 닫고 browse 상태로 돌아가면 지도/목록은 선택된 place가 없는 것처럼 보여야 한다.
- anonymous viewer를 포함해 현재 사용자에게 `my_review === null`이면 detail 하단에 `평가 남기기` CTA를 표시한다.
- 현재 사용자에게 `my_review !== null`이면 새 review 작성용 CTA나 composer entry를 표시하지 않는다.
- anonymous 사용자가 `평가 남기기`를 누르면 browser-native confirm `누가 등록했는지 알 수 있게 로그인해주세요.`를 먼저 보여준다.
- anonymous 사용자가 confirm을 취소하면 같은 detail 맥락에 그대로 머문다.
- anonymous 사용자가 confirm을 수락하면 기존 OTP + 이름 입력 흐름으로 이동하고, 완료 후 같은 place detail의 add-rating child surface로 복귀한다.
- authenticated 사용자의 `평가 남기기` CTA는 detail-owned add-rating child surface를 연다.
- add-rating은 standalone durable route를 만들지 않고 현재 `/places/:placeId` detail 맥락 안에서 동작한다.
- add-rating에서 back/cancel 시 사용자는 같은 place detail로 안전하게 복귀한다.
- add-rating 저장 성공 후 사용자는 같은 place detail로 복귀하고, 새 리뷰와 갱신된 집계가 즉시 보인다.
- 상세 상태는 `place_detail_load = idle | loading | ready | error`로 관리한다.
- 상세 로딩 중에는 필드 대신 진행 중 상태를 표시한다.
- 상세 로딩 실패 시 현재 상세 컨테이너에서 에러와 재시도 액션을 표시한다.
- 리뷰 본문이 비어 있는 항목은 본문 없이 평점만 표시한다.
- 리뷰가 0건이어도 `평가 및 리뷰` 섹션은 유지하되, empty-state용 별도 문구나 카드는 표시하지 않는다.

## Acceptance Criteria
- anonymous 사용자도 상세 필드, 리뷰, 장소를 추가한 사람 이름을 볼 수 있다.
- canonical detail route direct entry 시 상세가 열린다.
- canonical detail route direct entry/refresh는 background map auto-pan/auto-zoom을 만들지 않는다.
- invalid `placeId` 진입 시 안전한 browse 상태로 복귀한다.
- 데스크톱 상세가 목록 영역 내부 전환 방식으로 표시된다.
- 데스크톱 닫기 액션으로 목록 탐색 상태(`/`)로 돌아간다.
- 모바일 상세는 전체 화면 페이지로 표시된다.
- 상세 진입/복귀는 데스크톱/모바일 모두 background map auto-pan/auto-zoom을 만들지 않는다.
- 모바일 detail back은 list-origin / map-origin / no-origin contract를 따른다.
- 상세 복귀 후 browse 상태에서는 선택된 place가 없는 것처럼 보인다.
- `my_review === null`인 detail에서 `평가 남기기` CTA가 보이고, anonymous click은 native confirm을 먼저 보여준다.
- confirm 수락 후 로그인/이름 입력이 끝나면 같은 place add-rating surface로 복귀한다.
- `my_review !== null`인 detail에서는 CTA가 보이지 않는다.
- add-rating 저장 성공 후 detail 복귀와 새 리뷰/집계 즉시 반영을 확인할 수 있다.
- 상세 로딩 중에는 진행 중 상태가 보인다.
- 상세 로딩 실패 시 재시도 액션을 확인할 수 있다.
- 리뷰와 평가는 최신순으로 정렬되어 보인다.
- 본문이 없는 평가는 본문 없이 렌더링된다.
- 리뷰가 0건이면 섹션 본문에 empty-state 카피가 보이지 않는다.

## TDD Implementation Order
1. anonymous detail 진입 테스트를 작성한다.
2. 상세 필드 표시 테스트를 작성한다.
3. `/places/:placeId` direct entry 테스트를 작성한다.
4. invalid `placeId` fallback 테스트를 작성한다.
5. 데스크톱 sidebar 내부 상세 전환 테스트를 작성한다.
6. 데스크톱 닫기 액션 테스트를 작성한다.
7. 모바일 전체 화면 상세 테스트를 작성한다.
8. 상세 진입/복귀 auto-pan/auto-zoom 부재 테스트를 작성한다.
9. detail CTA visible/hidden + anonymous gating 테스트를 작성한다.
10. add-rating child surface 진입/복귀 테스트를 작성한다.
11. add-rating 저장 성공 후 detail 즉시 반영 테스트를 작성한다.
12. 상세 로딩 상태 테스트를 작성한다.
13. 상세 로딩 실패 상태 테스트를 작성한다.
14. 장소 추가자 이름 표시 테스트를 작성한다.
15. 리뷰/평가 최신순 정렬 테스트를 작성한다.
16. rating-only review 렌더링 테스트를 작성한다.
17. review 0건 empty-state 미노출 테스트를 작성한다.
18. 구현한다.
19. 전체 테스트를 통과시킨다.

## Required Test Cases
- anonymous `/places/:placeId` detail 진입
- 평균 별점/별점 수 표시
- 장소 추가자/종류/제로페이/리뷰 표시
- canonical detail route direct entry
- invalid `placeId` browse fallback
- 데스크톱 sidebar 내부 상세 전환 표시
- 데스크톱 닫기 시 목록 화면(`/`) 복귀
- 모바일 전체 화면 상세 표시
- 상세 진입/복귀 시 background map auto-pan/auto-zoom 없음
- `my_review === null` detail의 CTA visible + anonymous gating
- `my_review !== null` detail의 CTA hidden
- add-rating child surface 진입/복귀
- add-rating 저장 성공 후 detail 즉시 반영
- 상세 로딩 상태 표시
- 상세 로딩 실패 시 재시도
- 리뷰/평가 최신순 정렬
- rating-only review 본문 미노출
- review 0건 empty-state 카피 미노출
- 장소 추가자 이름 표시
- refresh 후 detail 유지

## Manual QA Checklist
- anonymous 상태에서도 `/places/:placeId` 상세가 열린다.
- 상세에서 필요한 정보와 리뷰/작성자 정보가 모두 보인다.
- 존재하지 않는 `placeId`면 browse 상태로 돌아간다.
- 데스크톱 상세가 목록 영역 안에서 전환된다.
- 데스크톱에서 닫기 액션으로 목록 탐색 상태(`/`)로 돌아간다.
- 모바일 상세가 전체 화면으로 열린다.
- 모바일 뒤로 가기 시 browse origin에 맞는 surface로 돌아간다.
- 상세 진입/복귀와 direct detail refresh에서 background map auto-pan/auto-zoom이 없다.
- 상세 복귀 후 지도/목록이 선택 전처럼 보인다.
- anonymous 사용자가 `평가 남기기`를 누르면 native confirm이 먼저 뜨고, 취소하면 같은 detail에 남는다.
- confirm을 수락해 로그인/이름 입력을 마치면 같은 place add-rating으로 이어진다.
- `my_review !== null`인 place에서는 CTA가 보이지 않는다.
- add-rating 저장 성공 후 새 리뷰와 집계가 즉시 보인다.
- 상세 로딩 중 진행 상태가 보인다.
- 상세 로딩 실패 시 재시도 액션이 보인다.
- 리뷰와 평가가 최신 항목부터 보인다.
- 본문이 없는 평가는 본문 없이 보인다.
- 리뷰가 0건이면 empty-state 카피 없이 섹션 본문이 비어 있다.

## QA Evidence
- 테스트 실행 결과
- 상세 화면 수동 검증 결과
