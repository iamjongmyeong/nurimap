# Spec: Review

## Summary
anonymous-visible CTA와 authenticated write contract를 포함한 리뷰 작성 규칙을 정의한다.

## Scope
- anonymous `평가 남기기` gating
- 리뷰 작성
- 리뷰 작성 단계의 별점 평가
- detail 하단 `평가 남기기` CTA 가시성 규칙
- add-rating child surface 진입/복귀
- 작성자/작성일 표시
- 사용자당 place별 1건 규칙
- place 등록 초기 review 연동
- 리뷰 저장 비동기 상태

## Functional Requirements
- anonymous 사용자는 detail에서 리뷰와 작성자 정보를 볼 수 있어야 한다.
- anonymous 또는 authenticated 사용자가 같은 place에 아직 review를 작성하지 않았으면 detail 하단에서 `평가 남기기` CTA를 볼 수 있다.
- anonymous 사용자가 CTA를 누르면 browser-native confirm `누가 등록했는지 알 수 있게 로그인해주세요.`를 먼저 보여준다.
- anonymous 사용자가 confirm을 취소하면 같은 detail 맥락에 머문다.
- anonymous 사용자가 confirm을 수락하면 기존 OTP + 이름 입력 흐름으로 이동하고, 완료 후 같은 place detail의 add-rating surface로 복귀한다.
- 로그인 사용자는 같은 place에 review 하나만 작성할 수 있다.
- 일반 리뷰 작성 경로는 detail 하단 `평가 남기기` CTA를 통해 진입한다.
- 현재 사용자가 이미 같은 place에 review를 작성했다면 새 review 작성 CTA나 새 작성 entry를 노출하지 않는다.
- add-rating은 detail-owned child surface로 열리고, durable/shareable route는 계속 `/places/:placeId`를 유지한다.
- add-rating에서 back/cancel 시 사용자는 같은 place detail 맥락으로 복귀한다.
- 리뷰 작성 단계에서 별점 평가를 함께 입력한다.
- 별점 입력 UI는 5단계 평가 affordance를 사용한다.
- review는 place에 대한 사용자의 단일 `rating_score`를 함께 가진다.
- 별점은 1점에서 5점 사이 정수만 허용한다.
- place 등록 시 입력한 초기 리뷰와 별점은 동일 Review 엔터티로 저장한다.
- place 등록 경로에서 이미 review가 있는 사용자가 같은 place를 다시 등록하려 하면, 기존 review를 업데이트할지 판단할 수 있는 확인 단계를 둔다.
- review lifecycle의 세부 허용 범위(기존 review overwrite 허용 여부 등)는 selected spec과 place registration/merge spec이 함께 정한다.
- 일반 리뷰 작성 경로에서는 이미 review가 있는 사용자가 새 review를 추가할 수 없지만, place 등록 경로의 overwrite confirm에서는 기존 review의 별점/후기를 갱신할 수 있다.
- 리뷰는 place 상세에 작성자와 작성일과 함께 표시한다.
- 리뷰 수정/삭제 지원 여부는 selected spec이 정한다.
- 리뷰 저장 상태는 `review_submit = idle | submitting | error`로 관리한다.
- 리뷰 저장 중에는 저장 버튼을 다시 누를 수 없다.
- 리뷰 저장 실패 시 입력한 리뷰와 별점 값을 유지한다.
- add-rating 저장 성공 후 사용자는 같은 place detail로 복귀하고, 최신 리뷰 목록/평균 별점/별점 수/내 리뷰 상태가 즉시 갱신된 결과를 본다.
- place 등록 경로에서 review overwrite 시 후기를 비워 두면 기존 후기 내용은 유지하고 별점만 갱신한다.

## Canonical Runtime / API Contract
- 일반 리뷰 작성의 canonical endpoint는 `POST /api/places/:placeId/reviews`다. place identity는 request body가 아니라 URI로 전달한다.
- 이 요청은 authenticated app session + CSRF cookie/header pair를 요구한다.
- anonymous read-open 정책은 review create route에 적용되지 않는다.
- 일반 리뷰 route는 현재 사용자의 첫 review 생성만 담당한다. 이미 같은 place에 review가 있으면 `409 { status: 'existing_review', place, message }` conflict를 반환하고 둘째 review를 만들지 않는다.
- 기존 review overwrite는 일반 review route의 별도 RPC flag가 아니라 `place-submissions/:submissionId/confirmations` 흐름 안에서만 허용한다.
- legacy `POST /api/place-review` compatibility wrapper는 제거되었다. 일반 리뷰 작성은 canonical nested review route만 사용한다.

## Acceptance Criteria
- anonymous 사용자는 detail의 리뷰/작성자 정보를 볼 수 있다.
- review가 없는 사용자는 detail CTA를 본다.
- anonymous CTA click은 native confirm을 먼저 보여주고, confirm 수락 후 로그인/이름 입력이 끝나면 같은 place add-rating으로 복귀한다.
- 한 사용자는 같은 place에 review 1건만 가진다.
- add-rating은 detail-owned child surface로 열리고 back/cancel 시 detail로 복귀한다.
- 리뷰 작성 시 입력된 별점은 평균 별점과 별점 수에 반영된다.
- 저장 성공 후 detail로 복귀하고 새 리뷰가 즉시 보인다.
- place 등록 시 입력한 초기 리뷰와 별점이 같은 review 규칙으로 저장된다.
- 일반 리뷰 작성은 `POST /api/places/:placeId/reviews` nested route로 식별되고 place identity를 body에 중복 전달하지 않는다.
- place 등록 경로에서 이미 review가 있는 사용자는 확인 단계를 통해 기존 review를 업데이트할 수 있다.
- 이미 review를 작성한 사용자는 새 review를 추가할 수 없다.
- 리뷰는 작성자와 작성일과 함께 상세에 표시된다.
- 리뷰 저장 중에는 진행 중 상태가 보인다.
- 리뷰 저장 실패 시 입력한 리뷰와 별점이 유지된다.

## TDD Implementation Order
1. anonymous CTA gating 테스트를 작성한다.
2. review가 없는 사용자 CTA visible 테스트를 작성한다.
3. 이미 review가 있는 사용자 CTA hidden 테스트를 작성한다.
4. add-rating child surface 진입/복귀 테스트를 작성한다.
5. 사용자당 place별 review 1건 규칙 테스트를 작성한다.
6. 리뷰 작성 단계 별점 입력 테스트를 작성한다.
7. 별점 범위 검증 테스트를 작성한다.
8. 비로그인 write 차단 테스트를 작성한다.
9. 평균 별점 반영 테스트를 작성한다.
10. 저장 성공 후 detail 즉시 반영 테스트를 작성한다.
11. place 등록 초기 review 연동 테스트를 작성한다.
12. 작성자/작성일 표시 테스트를 작성한다.
13. 리뷰 저장 중 진행 상태 테스트를 작성한다.
14. 리뷰 저장 중 버튼 비활성화 테스트를 작성한다.
15. 리뷰 저장 실패 시 입력 유지 테스트를 작성한다.
16. 구현한다.
17. 전체 테스트를 통과시킨다.

## Required Test Cases
- anonymous CTA visible + native confirm gating
- review가 없는 로그인 사용자 CTA visible + 리뷰/별점 작성 성공
- 이미 review가 있는 사용자의 CTA hidden
- add-rating child surface 진입/복귀
- 사용자당 place별 review 1건 유지
- 별점 1~5 외 값 실패
- 비로그인 사용자 write 실패
- 리뷰 저장 후 평균 별점/별점 수 갱신
- 저장 성공 후 detail 즉시 반영
- place 등록 초기 review 연동
- place 등록 경로의 중복 리뷰 확인 단계
- `POST /api/places/:placeId/reviews`가 URI-carried place identity와 duplicate-review conflict를 사용함
- 이미 review가 있는 사용자의 추가 review 차단
- 작성자/작성일 표시
- 리뷰 저장 중 진행 상태 표시
- 리뷰 저장 중 버튼 비활성화
- 리뷰 저장 실패 시 입력 유지

## Manual QA Checklist
- anonymous 사용자는 detail에서 리뷰와 작성자 정보를 본다.
- anonymous 사용자가 `평가 남기기`를 누르면 native confirm이 먼저 뜨고, 취소하면 같은 detail에 남는다.
- confirm을 수락해 로그인/이름 입력을 마치면 같은 place add-rating으로 이어진다.
- review가 없는 로그인 사용자는 detail에서 `평가 남기기` CTA를 본다.
- add-rating에서 별점 버튼과 선택 후기 입력을 함께 입력할 수 있다.
- 같은 place에 이미 review가 있는 사용자는 새 리뷰 작성 CTA를 보지 않는다.
- add-rating에서 back/cancel 시 같은 detail로 돌아간다.
- 리뷰 작성 후 detail에 즉시 보인다.
- 평균 별점과 별점 수가 갱신된다.
- place 등록 후 초기 리뷰와 별점이 같은 review 규칙으로 반영된다.
- place 등록 경로에서 이미 review가 있으면 업데이트 여부를 판단할 수 있는 확인 단계가 보인다.
- 작성자와 작성일이 함께 보인다.
- 리뷰 저장 중 진행 상태가 보인다.
- 리뷰 저장 중 버튼이 비활성화된다.
- 리뷰 저장 실패 시 입력한 리뷰와 별점이 유지된다.

## QA Evidence
- 테스트 실행 결과
- 리뷰/별점 수동 검증 결과
