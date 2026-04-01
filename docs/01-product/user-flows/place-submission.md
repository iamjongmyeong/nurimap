# Place Submission

## Scope
- anonymous `장소 추가` auth gating
- 장소 추가 진입
- Naver URL entry
- 장소명/주소 직접 입력
- geocoding
- 중복 장소 처리
- 신규 생성과 기존 장소 병합

## Place Submission Flow
1. anonymous 또는 로그인 사용자가 `장소 추가`를 누르거나 direct `/add-place`로 진입한다.
2. anonymous 사용자는 browser-native confirm `누가 등록했는지 알 수 있게 로그인해주세요.`를 먼저 본다.
3. anonymous 사용자가 confirm을 취소하면 현재 browse/detail 맥락에 그대로 머문다.
4. anonymous 사용자가 confirm을 수락하면 OTP 로그인과 필요 시 이름 입력을 완료한 뒤 원래 add-place intent로 복귀한다.
5. 시스템은 데스크톱에서는 기존 목록 영역 안의 sidebar surface를, 모바일에서는 canonical `/add-place` full-screen page를 연다.
6. 사용자는 먼저 네이버 지도 URL을 입력하거나, 바로 `직접 입력하기`로 넘어간다.
7. 사용자가 `장소 정보 가져오기`를 누르면 시스템은 URL lookup을 시도한다.
8. URL lookup이 성공하면 시스템은 기존 manual add-place form을 연다. 이때 이름과 주소만 미리 채워진다.
9. non-empty URL이 잘못된 형식이면 시스템은 URL entry step에 머무르며 input field inline error로 수정이 필요함을 알려준다.
10. `invalid_url`이 아닌 non-empty URL lookup 실패라면 시스템은 안내 후 기존 manual add-place form을 열고 사용자가 계속 수동 입력할 수 있게 한다.
11. 사용자는 이름과 주소를 확인하거나 수정한다.
12. 사용자는 장소 구분, 제로페이 상태, 평가를 입력하고 필요하면 후기를 작성한다.
13. 필수 입력값이 비어 있으면 사용자는 현재 등록 화면에서 보완 안내를 받는다.
14. 사용자가 `등록`을 누르면 시스템은 입력값을 검증하고 geocoding으로 좌표를 확보한다.
15. 좌표 확보에 실패하면 시스템은 사용자가 주소를 다시 확인할 수 있도록 현재 화면에 머물게 한다.
16. 좌표 확보에 성공하면 시스템이 중복 장소와 현재 사용자의 기존 review 여부를 확인한다.
17. 중복 장소가 발견되면 시스템은 기존 장소에 입력한 정보를 반영할지 사용자에게 확인한다.
18. 현재 사용자가 같은 장소에 review를 이미 작성한 상태라면, 사용자는 자신의 기존 평가/후기를 업데이트하는 흐름으로 안내받는다.
19. 사용자가 confirm에서 `확인`을 누르면 시스템은 기존 장소에 입력한 평가/후기와 장소 정보를 반영한다.
20. 사용자가 confirm에서 `취소`를 누르면 현재 등록 화면에 그대로 남고 입력값은 유지된다.
21. 현재 사용자의 review가 없으면 시스템은 기존 장소에 입력한 평가/후기를 추가하고 장소 정보를 반영한 뒤 기존 장소 상세 화면으로 이동한다.
22. 현재 사용자의 review가 있으면 시스템은 입력한 평가/후기로 내 리뷰를 덮어쓴다. 이때 후기가 비어 있으면 기존 후기는 유지하고 평가만 변경한다.
23. 신규 장소 생성에 성공하면 등록 화면을 닫고 지도와 목록을 갱신한 뒤 새 장소 상세 화면을 연다.
24. 기존 장소 병합 또는 업데이트에 성공하면 등록 화면을 닫고 지도와 목록을 갱신한 뒤 기존 장소 상세 화면을 연다.

## Rules
- 데스크톱 장소 등록은 기존 목록 영역 안에서 진행하고, 모바일 장소 등록은 `/add-place` full-screen page로 진행한다.
- anonymous `장소 추가` intent는 confirm -> OTP -> optional name capture 뒤에 원래 add-place surface로 복귀해야 한다.
- `/add-place`는 URL-entry step을 먼저 보여주고, lookup 후 manual form으로 이어진다.
- manual form은 기존 UX/UI와 입력 항목, 등록 버튼 동작, 리뷰 입력 방식, 성공 후 이동 방식을 그대로 유지한다.
- 이름과 도로명 주소는 필수 입력이다.
- `land_lot_address`와 후기는 선택 입력이다.
- 평가 기본값은 5점이다.
- 후기 입력에 500자를 넘겨 붙여넣거나 입력하면 초과분은 버리고 500자까지만 유지한다.
- 좌표 확보 실패 시 사용자가 입력한 값은 유지된다.
- geocoding 실패는 사용자가 주소를 수정하고 다시 시도할 수 있는 방식으로 안내한다.
- 중복 장소 관련 확인은 사용자가 현재 입력을 버리지 않고 판단할 수 있는 방식으로 처리한다.
- 현재 사용자가 이미 같은 장소에 review를 작성한 경우 confirm 이후 입력한 평가/후기로 내 리뷰를 덮어쓸 수 있다. 후기가 비어 있으면 기존 후기는 유지하고 평가만 변경한다.
- 중복 장소 confirm을 취소하면 등록 화면에 그대로 머문다.
- dirty state에서 뒤로가기/닫기를 누르면 사용자는 입력 손실 가능성을 확인받아야 한다.
- 장소 등록 성공 시 별도 완료 화면은 두지 않는다.

## Failure Expectations
- anonymous confirm을 취소하면 사용자는 현재 browse/detail 맥락에 그대로 머물러야 한다.
- non-empty URL이 잘못된 형식이면 사용자는 URL entry step에서 inline error를 보고 URL을 수정할 수 있어야 한다.
- `invalid_url`이 아닌 URL lookup 실패 시 사용자는 같은 등록 흐름 안에서 manual form으로 계속 진행할 수 있어야 한다.
- direct manual bypass가 가능해야 한다.
- manual form 뒤로가기를 누르면 URL-entry step으로 돌아가야 한다.
- geocoding 실패 시 사용자는 같은 등록 화면 안에서 주소를 수정하고 다시 시도할 수 있어야 한다.
- 중복 장소 발견 시 사용자는 기존 장소에 반영할지 현재 화면에서 판단할 수 있어야 한다.
- 저장 실패 시 사용자는 현재 등록 맥락을 유지한 채 다시 시도할 수 있어야 한다.
- 실패 시 `name`, `road_address`, `land_lot_address`, `place_type`, `zeropay_status`, 별점, 후기 입력값을 유지해야 한다.
