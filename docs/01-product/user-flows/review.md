# Review

## Scope
- anonymous `평가 남기기` auth gating
- detail 하단 review CTA 진입
- add-rating child surface
- 별점 입력
- 기존 리뷰 사용자 처리
- 작성자와 작성일 표시

## Review Flow
1. anonymous 또는 로그인 사용자가 장소 상세 화면을 연다.
2. 현재 사용자가 아직 같은 place에 review를 작성하지 않았으면 detail 하단에서 `평가 남기기` CTA를 본다.
3. anonymous 사용자가 CTA를 누르면 browser-native confirm `누가 등록했는지 알 수 있게 로그인해주세요.`를 본다.
4. anonymous 사용자가 confirm을 취소하면 같은 detail 맥락에 남는다.
5. anonymous 사용자가 confirm을 수락하면 OTP 로그인과 필요 시 이름 입력을 완료한 뒤 같은 place detail의 add-rating surface로 복귀한다.
6. 로그인 사용자가 CTA를 누르면 같은 place detail 맥락 안의 add-rating surface로 이동한다.
7. 사용자는 별점과 선택 후기를 입력한다.
8. 시스템이 리뷰 내용과 별점이 유효한지 확인한다.
9. 저장 성공 후 사용자는 같은 place detail로 복귀하고, 최신 리뷰 목록과 평균 별점, 별점 수, 내 review 상태를 다시 본다.
10. 현재 사용자가 이미 같은 place에 review를 작성한 경우 새 review CTA를 보지 않고 기존 내 별점 상태와 리뷰를 본다.
11. 작성자와 작성일이 함께 표시된다.

## Rules
- anonymous 사용자는 detail과 리뷰를 볼 수 있지만 write 실행 전에는 로그인해야 한다.
- 한 사용자는 같은 place에 review 하나만 작성할 수 있다.
- 리뷰 작성 시 별점은 1점에서 5점 사이 정수만 허용한다.
- 리뷰 작성 UI는 별 모양 버튼을 사용한다.
- add-rating은 standalone route가 아니라 detail-owned child surface다.
- anonymous CTA는 native confirm -> OTP -> optional name capture 뒤에 원래 add-rating surface로 복귀해야 한다.
- place 등록 경로에서 입력한 초기 리뷰와 별점도 같은 review 규칙을 따른다.

## Failure Expectations
- anonymous confirm을 취소하면 현재 detail 맥락이 유지돼야 한다.
- 리뷰 저장 실패 시 입력한 리뷰와 별점이 유지돼야 한다.
- 이미 review가 있는 사용자는 새 review 작성 경로로 진입하지 않아야 한다.
- add-rating에서 back/cancel 시 사용자는 같은 place detail 맥락으로 복귀해야 한다.
