# Spec: Place Registration

## Summary
place 직접 입력 등록 흐름과 저장 전 검증 규칙을 정의한다.

## Scope
- 등록 폼의 기능 요구
- 이름/주소 입력
- 장소 구분 입력
- 제로페이 상태 입력
- 별점 입력
- 후기 입력
- 입력값 검증
- 초기 별점 기본값
- 초기 리뷰 생성 규칙
- 기존 review 사용자 처리
- 저장 실패 처리
- 저장 성공 후 이동
- 저장 비동기 상태

## Functional Requirements
- place 등록은 기존 목록 영역 안의 단일 폼으로 구성한다.
- 필수 입력은 `name`, `road_address`, `place_type`, `zeropay_status`, `rating_score`다.
- `land_lot_address`와 `review_content`는 선택 입력이다.
- `place_type = restaurant | cafe`
- `zeropay_status = available | unavailable | needs_verification`
- 초기 별점 기본값은 5점이다.
- 초기 별점은 1점에서 5점 사이 정수만 허용한다.
- 사용자는 환경에 맞는 입력 방식으로 별점을 변경할 수 있어야 한다.
- 후기는 500자 이하로 제한한다.
- 후기 입력에 500자 초과 내용을 붙여넣거나 입력하면 초과분은 버리고 500자까지만 유지한다.
- 후기 입력은 여러 줄 입력을 지원한다.
- 등록 요청 시 geocoding으로 최종 좌표를 확보한 경우에만 저장을 진행한다.
- place 등록 시 입력한 초기 별점과 후기는 등록자의 첫 Review 엔터티로 저장한다.
- 중복 장소가 발견되면 기존 장소에 입력한 내용을 반영할지 사용자에게 확인한다.
- 사용자가 확인에서 `확인`을 누르면 기존 장소에 입력한 평가/후기와 장소 구분/제로페이 정보를 반영한다.
- 사용자가 확인에서 `취소`를 누르면 등록 화면에 그대로 머무르고 입력값을 유지한다.
- 현재 사용자가 대상 place에 이미 review를 작성한 경우, 입력한 평가/후기로 내 리뷰를 덮어쓸 수 있다. 이때 `review_content`가 비어 있으면 기존 후기 내용은 유지하고 `rating_score`만 갱신한다.
- 저장 중에는 제출 버튼을 비활성화하고 진행 중 상태를 표시한다.
- 저장 중에는 별도 안내 박스를 추가로 보여주지 않는다.
- 저장 실패 시 사용자가 현재 등록 맥락을 유지한 채 다시 시도할 수 있어야 한다.
- 등록 성공 시 등록 화면을 닫고 지도와 목록을 최신 상태로 갱신한 뒤 결과 place 상세 화면으로 이동한다.
- 등록 성공 시 별도 완료 화면은 두지 않는다.
- 저장 상태는 `place_submit = idle | submitting | error`로 관리한다.

## Canonical Runtime / API Contract
- canonical direct-entry normalization/lookup endpoint는 `POST /api/place-lookups`다. raw 입력(`name`, `roadAddress`, `landLotAddress?`)을 받아 backend가 geocoding/정규화/좌표 확보를 수행한다.
- canonical place registration endpoint는 `POST /api/place-submissions`다. 이 요청은 authenticated app session + CSRF cookie/header pair가 있을 때만 허용한다.
- `POST /api/place-submissions`는 lookup 결과와 draft(`place_type`, `zeropay_status`, `rating_score`, `review_content`)를 받아 새 place 생성 또는 bounded duplicate conflict를 반환한다.
- duplicate가 감지되면 서버는 기존 place를 즉시 mutate하지 않고 `409 { status: 'confirm_required', submissionId, reason, place, confirmMessage }` shape로 확인 흐름을 반환한다.
- duplicate confirm canonical endpoint는 `POST /api/place-submissions/:submissionId/confirmations`다. 사용자가 `취소`하면 confirmation resource를 만들지 않고 local draft만 유지한다.
- legacy `POST /api/place-entry` compatibility wrapper는 제거되었다. place registration은 canonical `place-lookups` + `place-submissions` + `place-submissions/:submissionId/confirmations` flow만 사용한다.

## Acceptance Criteria
- place 등록은 같은 목록 영역 안의 단일 폼으로 진행된다.
- 이름, 주소, 장소 구분, 제로페이, 평가 입력이 가능하다.
- 후기 입력은 여러 줄 입력을 지원한다.
- 초기 별점은 기본적으로 5점 선택 상태다.
- 사용자는 환경에 맞는 입력 방식으로 별점을 변경할 수 있다.
- 잘못된 enum 값은 저장되지 않는다.
- 후기 500자 초과 입력 시 초과분이 버려지고 500자까지만 유지된다.
- 좌표 없는 place는 저장되지 않는다.
- geocoding 실패 시 사용자는 현재 등록 화면에서 주소를 수정하고 다시 시도할 수 있다.
- 현재 사용자가 대상 place에 review가 없을 때만 초기 후기 저장이 가능하다.
- place 등록 성공 시 입력한 초기 별점과 후기가 등록자의 첫 review로 저장된다.
- 중복 장소가 발견되면 기존 장소 반영 여부를 사용자가 판단할 수 있다.
- duplicate conflict는 `submissionId`와 기존 place 요약을 반환하고 explicit confirmation 전에는 기존 place를 바꾸지 않는다.
- confirm에서 `취소`를 누르면 등록 화면이 닫히지 않고 입력값이 유지된다.
- 현재 사용자가 대상 place에 이미 review가 있고 후기를 비워 두면 기존 후기 내용은 유지되고 평가만 바뀐다.
- 저장 중에는 제출 버튼을 다시 누를 수 없다.
- 저장 실패 시 입력한 값이 유지된다.
- 등록 성공 시 지도와 목록이 최신 상태로 갱신된다.
- 등록 성공 시 결과 place 상세 화면이 열린다.
- 저장 중에는 진행 중 상태가 보인다.

## TDD Implementation Order
1. 단일 등록 폼 렌더링 테스트를 작성한다.
2. 핵심 입력 필드 존재 테스트를 작성한다.
3. 장소 구분/제로페이 선택 테스트를 작성한다.
4. 초기 별점 기본값 테스트를 작성한다.
5. 별점 변경 테스트를 작성한다.
6. 환경별 별점 입력 테스트를 작성한다.
7. 후기 길이 clamp 테스트를 작성한다.
8. 후기 multiline 입력 테스트를 작성한다.
9. 좌표 없는 등록 차단 테스트를 작성한다.
10. 초기 리뷰 생성 테스트를 작성한다.
11. geocoding 실패 후 현재 등록 맥락 유지 테스트를 작성한다.
12. 중복 장소 확인 흐름 표시 테스트를 작성한다.
13. 중복 장소 확인 `확인` 처리 테스트를 작성한다.
14. 중복 장소 확인 `취소` 유지 테스트를 작성한다.
15. 기존 review overwrite 테스트를 작성한다.
16. 후기 비어 있음 시 평가만 갱신 테스트를 작성한다.
17. dirty state 뒤로가기/닫기 확인 테스트를 작성한다.
18. 저장 중 진행 상태 테스트를 작성한다.
19. 저장 중 제출 버튼 비활성화 테스트를 작성한다.
20. 저장 실패 시 입력값 유지 테스트를 작성한다.
21. 등록 성공 후 지도/목록 갱신 테스트를 작성한다.
22. 등록 성공 후 상세 이동 테스트를 작성한다.
23. 구현한다.
24. 전체 테스트를 통과시킨다.

## Required Test Cases
- 단일 등록 폼 렌더링
- 핵심 입력 필드 존재
- 장소 구분 선택
- 제로페이 상태 선택
- 초기 별점 기본값 5점
- 별점 변경
- 환경별 별점 입력
- 후기 500자 초과 입력 clamp
- 후기 multiline 입력
- 좌표 없는 place 등록 차단
- geocoding 실패 시 현재 등록 맥락 유지
- 초기 리뷰가 등록자의 첫 review로 저장됨
- 중복 장소 확인 흐름 표시
- `POST /api/place-submissions` duplicate conflict가 `submissionId`를 포함하고 즉시 mutation하지 않음
- 중복 장소 확인 `확인` 처리
- `POST /api/place-submissions/:submissionId/confirmations` confirm 후 create/merge/update를 반영함
- 중복 장소 확인 `취소` 시 입력 유지
- 기존 review overwrite
- 후기 비어 있음 시 평가만 갱신
- dirty state 뒤로가기/닫기 확인
- 저장 중 제출 버튼 비활성화
- 저장 실패 시 입력값 유지
- 등록 성공 시 지도/목록 갱신
- 저장 중 진행 상태 표시
- 등록 성공 시 결과 place 상세 이동

## Manual QA Checklist
- place 등록이 같은 목록 영역 안의 단일 폼으로 보인다.
- 장소 구분과 제로페이 선택이 가능하다.
- 평가는 별점 입력으로 동작한다.
- 기본 상태에서 5점이 선택되어 있다.
- 환경에 맞는 입력 방식으로 별점을 변경할 수 있다.
- 후기 입력이 여러 줄 입력으로 동작한다.
- 후기 입력에 500자를 넘겨 붙여넣으면 500자까지만 남는다.
- 잘못된 입력 시 보완 안내를 받는다.
- review가 없는 경우에만 초기 후기 저장이 가능하다.
- place 등록 후 초기 후기와 별점이 첫 review로 반영된다.
- geocoding 실패 시 현재 등록 화면에서 주소를 수정하고 다시 시도할 수 있다.
- 저장 중에는 진행 중 상태가 보이고 별도 안내 박스는 보이지 않는다.
- 같은 place가 이미 있으면 기존 장소에 반영할지 확인할 수 있다.
- duplicate 확인 단계에서는 기존 place 요약이 먼저 보이고, `취소` 시 별도 저장 없이 현재 draft가 유지된다.
- 같은 place에 이미 내 review가 있으면 overwrite 여부를 묻는 확인 흐름이 보인다.
- 후기를 비워 두고 overwrite하면 기존 후기 내용은 유지되고 평가만 바뀐다.
- 저장 중 제출 버튼이 비활성화된다.
- 저장 실패 시 입력한 값이 유지된다.
- 등록 성공 후 지도와 목록에 새 place가 반영된다.
- 등록 성공 시 별도 완료 화면 없이 상세 화면으로 이동한다.

## QA Evidence
- 테스트 실행 결과
- 등록 폼 수동 검증 결과
