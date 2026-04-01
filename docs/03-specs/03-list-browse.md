# Spec: List Browse

## Summary
anonymous/authenticated 사용자가 공통 browse surface에서 place 목록을 탐색하고, 상태형 auth control과 write CTA gating을 함께 사용하는 규칙을 정의한다.

## Scope
- anonymous browse access
- 목록 표시 필드
- 목록 선택 동작
- 목록 영역 전환
- 모바일 목록 페이지에서 상세 이동
- canonical detail route 연동
- browse auth control state
- `장소 추가` CTA의 write-only auth gating
- 목록 로딩/빈 상태

## Functional Requirements
- anonymous 사용자는 로그인하지 않아도 `/` browse에서 지도와 목록을 볼 수 있어야 한다.
- 목록에는 이름, 평균 별점, 리뷰 수, 장소 유형을 표시한다.
- 목록에는 `zeropay_status = available`인 place에만 제로페이 가능 표시를 노출한다.
- 제로페이 가능 표시는 사용자가 목록 메타 정보를 해치지 않고 인지할 수 있는 위치에 둔다.
- desktop pointer 환경에서는 제로페이 가능 표시의 의미를 보조적으로 설명할 수 있어야 한다.
- `zeropay_status = unavailable | needs_verification`인 place는 목록에서 제로페이 로고를 표시하지 않는다.
- 목록에서 place를 선택하면 상세 화면과 canonical detail URL(`/places/:placeId`)이 함께 연동된다.
- 목록은 place를 빠르게 비교할 수 있어야 한다.
- 목록 row 하단 메타 라인은 평균 별점, 리뷰 수, 장소 유형 순서로 표시한다.
- 모바일 목록 페이지에서 place를 선택하면 전체 화면 상세 페이지로 이동한다.
- browse auth control은 상태형으로 동작한다: desktop browse는 text `로그인`/`로그아웃`, mobile browse는 icon-button `로그인`/`로그아웃`을 사용한다.
- desktop `로그인` hover color는 `#5862FB`, desktop `로그아웃` hover color는 `#E52E30`를 사용한다.
- 모바일 목록 페이지의 상단 고정 header는 로고 + `누리맵` 브랜드를 왼쪽에, anonymous면 `public/assets/icons/icon-auth-login.svg` 로그인 icon button을, authenticated면 로그아웃 icon button을 오른쪽에 표시한다.
- 모바일 목록 페이지의 목록 row UI는 desktop browse row와 같은 구조를 재사용한다.
- 모바일과 desktop 모두 `장소 추가` affordance는 anonymous 상태에서도 계속 보인다.
- anonymous 사용자가 `장소 추가`를 누르거나 direct `/add-place` entry로 write에 진입하려 하면 browser-native confirm `누가 추가했는지 알 수 있도록 로그인해주세요.`를 먼저 보여준다.
- anonymous 사용자가 confirm을 취소하면 현재 browse 맥락에 그대로 머문다.
- anonymous 사용자가 confirm을 수락하면 기존 OTP + 이름 입력 흐름으로 이동하고, 완료 후 원래 add-place intent로 복귀한다.
- 모바일에서 authenticated 사용자가 `장소 추가`를 누르면 canonical `/add-place` route로 이동해 full-screen 등록 화면을 연다.
- 데스크톱에서 authenticated 사용자가 `장소 추가`를 누르면 기존 sidebar place-add surface를 연다.
- 모바일 등록 화면을 닫으면 사용자는 직전 목록 상태로 돌아가고, direct entry/refresh처럼 이전 context가 없으면 list-first `/`로 복귀한다.
- 목록 상태는 `place_list_load = idle | loading | empty | ready | error`로 관리한다.
- 목록 로딩 중에는 진행 중 상태를 표시한다.
- 목록 데이터가 0건이면 empty state를 표시한다.
- 목록 로딩 실패 시 현재 목록 영역에서 에러와 재시도 액션을 표시한다.

## Acceptance Criteria
- anonymous 사용자도 `/`에서 목록과 지도를 볼 수 있다.
- 목록에 평균 별점과 리뷰 수, 장소 유형이 보인다.
- `zeropay_status = available`인 place 목록 item에는 제로페이 가능 표시가 보인다.
- desktop pointer 환경에서는 제로페이 가능 표시의 의미를 확인할 수 있다.
- `zeropay_status = unavailable | needs_verification`인 place 목록 item에는 제로페이 로고가 보이지 않는다.
- 목록 선택 시 상세 화면이 열리고 canonical detail URL이 반영된다.
- 모바일 목록 페이지에서 place 선택 시 전체 화면 상세 페이지가 열린다.
- desktop browse에서는 text `로그인`/`로그아웃`, mobile browse에서는 icon-button `로그인`/`로그아웃` 상태를 확인할 수 있다.
- anonymous `장소 추가` 시도는 native confirm을 먼저 보여주고, 취소 시 browse에 남는다.
- confirm 수락 후 로그인/이름 입력이 끝나면 원래 add-place intent로 복귀한다.
- 목록 로딩 중에는 진행 중 상태가 보인다.
- 목록 데이터가 없으면 empty state가 보인다.
- 목록 로딩 실패 시 재시도 액션을 확인할 수 있다.
- 모바일 등록 화면을 닫으면 목록 탐색 맥락으로 복귀하고, direct entry/refresh로 이전 context가 없을 때는 list-first `/`로 복귀한다.

## TDD Implementation Order
1. anonymous browse 진입 테스트를 작성한다.
2. 목록 표시 필드 테스트를 작성한다.
3. 제로페이 로고 표시 테스트를 작성한다.
4. 상세 연동 + canonical route 테스트를 작성한다.
5. 모바일 목록에서 전체 화면 상세 이동 테스트를 작성한다.
6. browse auth control state 테스트를 작성한다.
7. anonymous `장소 추가` gating 테스트를 작성한다.
8. 목록 영역 전환 테스트를 작성한다.
9. 목록 로딩 상태 테스트를 작성한다.
10. 빈 목록 상태 테스트를 작성한다.
11. 목록 로딩 실패 상태 테스트를 작성한다.
12. 구현한다.
13. 전체 테스트를 통과시킨다.

## Required Test Cases
- anonymous `/` browse 진입
- 이름/평균 별점/리뷰 수/장소 유형 표시
- `zeropay_status = available`일 때 제로페이 가능 표시
- desktop pointer 환경에서 제로페이 보조 설명 확인 가능
- `zeropay_status = unavailable | needs_verification`일 때 제로페이 로고 미표시
- 목록 선택 시 상세 연동 + canonical route 반영
- 모바일 목록 페이지에서 place 선택 시 전체 화면 상세 이동
- desktop/mobile auth control state + hover/icon contract
- anonymous `장소 추가` click 또는 direct `/add-place` gating
- 목록 영역 전환
- 목록 로딩 상태 표시
- 데이터 없음 상태 처리
- 목록 로딩 실패 시 재시도
- mobile `/add-place` route 진입/닫기

## Manual QA Checklist
- anonymous 상태에서도 `/` browse가 열린다.
- 목록에서 place 비교가 가능하다.
- row 하단 메타 라인에서 장소 유형까지 함께 보인다.
- 제로페이 가능 place에는 제로페이 가능 표시가 보인다.
- desktop pointer 환경에서는 제로페이 보조 설명을 확인할 수 있다.
- 제로페이 미확인 또는 불가 place에는 제로페이 로고가 보이지 않는다.
- 클릭 시 상세가 열리고 URL이 해당 place detail로 바뀐다.
- 모바일 목록 페이지에서 place를 누르면 전체 화면 상세 페이지가 열린다.
- desktop browse에서 text `로그인`/`로그아웃`, mobile browse에서 icon-button `로그인`/`로그아웃` 상태를 확인할 수 있다.
- anonymous `장소 추가` 시도 시 native confirm이 먼저 뜨고, 취소하면 browse에 남는다.
- confirm을 수락해 로그인/이름 입력을 마치면 원래 add-place 흐름으로 이어진다.
- 목록 로딩 중 진행 상태가 보인다.
- 목록 데이터가 없을 때 empty state가 보인다.
- 목록 로딩 실패 시 재시도 액션이 보인다.

## QA Evidence
- 테스트 실행 결과
- 목록 수동 검증 결과
