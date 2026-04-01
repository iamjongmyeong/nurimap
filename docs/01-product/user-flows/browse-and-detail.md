# Browse And Detail

## Scope
- anonymous browse access
- 지도 탐색
- 목록 탐색
- 목록 영역 전환
- 장소 상세 진입과 탐색 맥락 유지
- 상세 진입과 복귀
- detail 안의 add-rating child surface
- 공유 가능한 상세 진입
- browse auth control state
- write CTA auth gating

## Browse Flow
1. 사용자는 로그인하지 않아도 `/` browse 또는 공유/북마크한 `/places/:placeId` 상세 링크로 직접 진입할 수 있다.
2. desktop browse에서는 text `로그인`/`로그아웃`, mobile browse에서는 icon-button `로그인`/`로그아웃` auth control을 본다.
3. 데스크톱에서는 목록에서 장소를 선택하거나 지도 마커를 클릭한다.
4. 모바일에서는 하단 고정 탭 바의 `목록` 탭으로 장소 목록으로 이동하거나 지도 마커를 클릭한다.
5. 모바일의 하단 탭 바 active 상태는 현재 primary surface(`지도`/`목록`)와 함께 바뀌고, 장소 등록 화면에서는 GNB가 숨겨진다.
6. 목록에서는 평균 별점, 리뷰 수, 제로페이 가능 여부를 함께 확인한다.
7. 장소를 선택하면 공유 가능한 상세 상태로 진입한다.
8. 데스크톱에서는 목록 영역 안의 내용이 상세 화면으로 전환된다.
9. 모바일에서는 상세 화면이 전체 화면으로 열린다.
10. 현재 사용자에게 `my_review === null`이면 detail 하단의 `평가 남기기` CTA를 본다. anonymous click은 먼저 로그인 confirm을 거친다.
11. anonymous 사용자가 `장소 추가`를 시도하면 browser-native confirm `누가 추가했는지 알 수 있도록 로그인해주세요.`를 본다.
12. anonymous 사용자가 `평가 남기기`를 시도하면 browser-native confirm `누가 등록했는지 알 수 있도록 로그인해주세요.`를 본다.
13. confirm을 취소하면 사용자는 현재 browse/detail 맥락에 그대로 머문다.
14. confirm을 수락하면 사용자는 기존 OTP + 이름 입력 흐름으로 이동하고, 완료 후 원래 add-place 또는 add-rating intent로 복귀한다.
15. authenticated 사용자가 mobile 하단 탭 바의 `추가` 탭을 누르면 `/add-place` full-screen 등록 화면으로 이동하고, desktop `장소 추가` CTA는 기존 sidebar place-add surface를 연다.
16. 등록 화면을 닫으면 사용자는 직전의 목록 탐색 맥락으로 돌아가며, direct entry/refresh처럼 이전 맥락이 없으면 `/`로 복귀한다.
17. 상세에서 평균 별점, 별점 수, 장소 구분, 제로페이 가능 여부, 장소를 추가한 사람 이름, 리뷰를 본다.
18. 리뷰와 평가는 가장 최근 항목부터 위에서 아래 순서로 본다.
19. 데스크톱에서는 닫기 액션으로, 모바일에서는 뒤로 가기 액션 또는 브라우저 기본 뒤로 가기로 탐색 화면으로 돌아간다.
20. authenticated 사용자가 로그아웃하면 browse/detail은 anonymous 상태로 유지되고 auth control만 `로그인` 상태로 바뀐다.

## Rules
- anonymous 사용자도 browse/detail read를 볼 수 있어야 한다.
- 상세는 공유 가능하고 다시 진입 가능한 상태여야 한다.
- 데스크톱과 모바일은 서로 다른 surface를 써도 같은 장소 탐색 흐름으로 읽혀야 한다.
- 모바일의 화면 뒤로 가기 버튼과 브라우저 기본 뒤로 가기는 같은 결과를 만들어야 한다.
- add-rating은 detail에 종속된 transient surface이며 별도 durable route를 만들지 않는다.
- 탐색 화면으로 돌아갈 때 선택한 장소와 지도 위치 맥락을 최대한 유지해야 한다.
- 목록과 지도는 같은 장소 선택 상태를 공유해야 한다.
- 장소 등록은 탐색 흐름을 떠나는 별도 독립 flow가 아니라 기존 탐색 맥락 안의 전환으로 처리한다.
- anonymous write intent는 native confirm과 기존 OTP flow를 통해 authenticated write로 전환된다.
- 상세의 리뷰/평가 리스트는 최신 항목이 위로 오도록 보여준다.
- 리뷰가 0건이어도 사용자는 상세의 리뷰 영역 맥락을 잃지 않아야 한다.
- 로그아웃은 browse/detail 맥락을 끊지 않고 write-only gate만 anonymous 상태로 되돌린다.

## Failure Expectations
- 목록, 상세, 지도 로딩 실패는 현재 맥락을 이해할 수 있는 방식으로 드러나야 한다.
- 지도 loading 동안에는 사용자가 실제 지도로 오해하지 않는 명시적 진행 중 상태를 보여야 한다.
- 지도 runtime failure 시에는 현재 browse/detail 맥락을 유지한 채 다시 시도할 수 있어야 한다.
- 상세 진입 실패가 나도 사용자가 탐색 상태를 잃지 않아야 한다.
- add-rating 실패나 취소가 detail/browse 맥락 상실로 이어지면 안 된다.
- 등록 화면에서 주소 geocoding이나 저장이 실패해도 사용자가 목록 영역 맥락을 잃지 않아야 한다.
- anonymous write confirm을 취소해도 browse/detail 맥락이 사라지면 안 된다.
