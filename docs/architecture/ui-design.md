# UI Design

This document is the source of truth for UI structure, state, and interaction rules.

관련 문서: [User Flow](./user-flow.md)

## Global Layout Rules
- breakpoint: `768px`
- 지도 시작 위치
  - 주소: `서울 마포구 양화로19길 22-16`
  - 좌표: `37.558721, 126.924440`

## Desktop Layout `>= 768px`

### Base State
- 지도를 전체 화면으로 표시한다.
- 왼쪽에 목록 사이드바를 띄운다.
  - 너비: `390px`
  - 높이: 전체 높이
- 사이드바에는 접기/펼치기 버튼이 있다.
- 장소 추가 버튼은 사이드바 상단에 배치한다.
  - 크기: `342px x 48px`
  - floating button은 사용하지 않는다.

### Detail State
- 목록 또는 지도에서 장소 선택 시 상세 패널을 연다.
- 상세 패널은 사이드바 오른쪽의 지도 위에 떠 있는 floating panel로 표시한다.
  - 너비: `390px`
  - 높이: `calc(100vh - 48px)`
  - 상단 inset: `24px`
  - 하단 inset: `24px`
  - 사이드바와 간격: `24px`
  - `48px`는 상단 bar 높이가 아니라 `24px + 24px` inset 합이다.
- 상세 패널은 둥근 모서리와 그림자를 가진다.
- 지도는 상세 패널 뒤에서 계속 보여야 한다.
- X 버튼으로 닫는다.

## Mobile Layout `< 768px`

### Base State
- 지도를 전체 화면으로 표시한다.
- 화면 하단에 floating button UI를 배치한다.
  - 버튼 구성: `목록 보기`, `장소 추가`
  - 위치: 화면 하단
- `목록 보기` 버튼을 누르면 장소 목록 페이지로 이동한다.
- `장소 추가` 버튼을 누르면 장소 추가 UI를 연다.

### Detail State
- 장소 목록 페이지 또는 지도에서 장소 선택 시 장소 상세 화면을 연다.
- 모바일 장소 상세 화면은 전체 화면 페이지로 표시한다.
- 왼쪽 화살표 모양 뒤로 가기 버튼을 누르면 지도 화면으로 이동한다.
- 브라우저 기본 뒤로 가기도 화면의 뒤로 가기 버튼과 같은 동작을 해야 한다.
- 지도 화면으로 돌아갈 때 선택한 장소를 유지한다.
- 지도 화면으로 돌아갈 때 지도는 선택한 장소 위치를 기준으로 보여준다.

## UI State Model
### Navigation State
| State | Description |
|---|---|
| `auth_required` | 로그인 전 상태 |
| `auth_link_sent` | 로그인 링크 발송 후 대기 상태 |
| `auth_link_invalid` | 만료, 사용 완료, 무효화된 링크의 인증 실패 화면 상태 |
| `name_required` | 이름 입력이 필요한 상태 |
| `map_browse` | 지도 탐색 기본 상태 |
| `mobile_place_list_open` | 모바일 장소 목록 페이지가 열린 상태 |
| `place_add_open` | 장소 등록 UI가 열린 상태 |
| `place_detail_open` | 데스크톱 상세 패널 또는 모바일 전체 화면 상세가 열린 상태 |

### Async Substate
| Key | Values | Applies To | Description |
|---|---|---|---|
| `auth_request` | `idle`, `submitting`, `error` | 로그인 화면 | 로그인 링크 요청 상태 |
| `auth_link_verify` | `idle`, `verifying`, `error` | 로그인 링크 진입 | 로그인 링크 검증 상태 |
| `name_submit` | `idle`, `submitting`, `error` | 이름 입력 화면 | 이름 저장 상태 |
| `place_lookup` | `idle`, `validating_url`, `loading`, `error` | 장소 추가 UI | Naver Map URL 검증, 조회, 좌표 확보 상태 |
| `place_submit` | `idle`, `submitting`, `error` | 장소 추가 UI | 장소 저장 상태 |
| `place_list_load` | `idle`, `loading`, `empty`, `ready`, `error` | 목록 화면 | 장소 목록 로딩 상태 |
| `place_detail_load` | `idle`, `loading`, `ready`, `error` | 상세 화면 | 장소 상세 로딩 상태 |
| `review_submit` | `idle`, `submitting`, `error` | 리뷰 작성 UI | 리뷰와 별점 저장 상태 |
| `recommendation_toggle` | `idle`, `submitting`, `error` | 추천 버튼 | 추천 추가/취소 요청 상태 |

### State Modeling Principles
- navigation state와 async substate는 분리해서 모델링한다.
- navigation state는 한 시점에 하나만 활성화한다.
- async substate는 현재 화면 안에서 함께 존재할 수 있다.
- `loading` 또는 `submitting` 상태에서는 같은 액션을 다시 실행할 수 없다.
- `error` 상태가 발생해도 전용 실패 화면이 정의된 경우를 제외하면 현재 화면, 입력값, 선택 상태를 유지한다.
- `success`는 장기 유지 상태로 두지 않고 데이터 갱신 또는 다음 navigation state로 즉시 전환한다.
- `empty`는 목록이나 리뷰 컬렉션처럼 데이터가 0건인 화면에서만 사용한다.

## Interaction Notes
- 인증 요청 단계의 실패는 로그인 화면 안에서 inline error로 표시한다.
- 인증 링크 검증 실패는 전용 인증 실패 화면으로 표시한다.
- 인증 에러는 브라우저 기본 `alert`로 표시하지 않는다.
- 로그인 화면에서 인증 요청이 실패해도 사용자가 입력한 이메일은 유지한다.
- `재요청 cooldown` 실패 시 남은 대기 시간을 함께 표시한다.
- 인증 실패 화면에는 `새 로그인 링크 받기`와 `이메일 다시 입력` CTA를 함께 둔다.
- 장소 목록 item에는 이름, 평균 별점, 리뷰 수를 표시한다.
- 장소 목록 item에는 `zeropay_status = available`인 경우 제로페이 로고를 함께 표시한다.
- 목록의 제로페이 로고 높이는 평균 별점 UI 높이와 동일해야 한다.
- `zeropay_status = unavailable | needs_verification`이면 목록에서 제로페이 로고를 표시하지 않는다.
- 장소 추가 UI는 같은 화면 안에서 2단계 progressive disclosure로 구성한다.
- 장소 추가 UI의 1단계는 Naver Map URL 입력과 조회만 우선 보여준다.
- 조회 성공 후 같은 장소 추가 UI의 2단계에서 조회된 장소명과 대표 주소 요약, 등록 입력 UI를 함께 보여준다.
- 2단계의 장소명과 대표 주소는 편집 가능한 input이 아니라 display-only summary UI로 보여준다.
- 2단계의 대표 주소는 `road_address`를 우선 사용하고, 없으면 `land_lot_address`를 사용한다.
- Naver Map URL이 아니면 URL 입력 필드 아래에 `네이버 지도 URL을 입력해주세요.` inline error를 표시한다.
- 장소 조회 실패와 좌표 확보 실패는 브라우저 기본 `alert`가 아니라 modal로 표시한다.
- 장소 조회 실패와 좌표 확보 실패 시 사용자가 입력한 URL은 유지한다.
- 장소 등록 저장 실패 시 사용자가 입력한 `place_type`, `zeropay_status`, 별점, 리뷰는 유지한다.
- 장소 등록 저장 중에는 제출 버튼을 비활성화한다.
- 장소 등록 성공 시 별도 완료 화면 대신 결과 장소 상세 화면을 연다.
- 장소 등록에서 현재 사용자가 해당 장소에 이미 review를 작성한 경우 제목이 `이미 리뷰를 남긴 장소예요`인 modal을 표시한다.
- 이 modal은 본문 없이 제목만 사용한다.
- 이 modal의 CTA는 `장소 상세 보기`, `닫기`를 사용한다.
- `장소 상세 보기`를 누르면 기존 장소 상세 화면으로 이동한다.
- `닫기`를 누르면 장소 등록 화면을 닫고 지도 탐색 상태로 돌아간다.
- 장소 등록의 초기 별점과 리뷰 입력 UI는 현재 사용자가 해당 장소에 review가 없을 때만 표시한다.
- 장소 상세의 `내 별점 상태`는 현재 사용자의 단일 review `rating_score`를 기준으로 표시한다.
- 현재 사용자가 이미 같은 장소에 review를 작성한 경우 리뷰 작성 UI를 노출하지 않는다.
- 현재 사용자가 이미 같은 장소에 review를 작성한 경우 기존 내 리뷰와 내 별점 상태를 보여준다.
- 데스크톱 상세는 지도 위에 떠 있는 floating panel로 표시한다.
- 데스크톱 상세의 `48px`는 상단 bar가 아니라 상단 `24px`와 하단 `24px` inset 합이다.
- 데스크톱 상세는 둥근 모서리와 그림자를 가진 카드처럼 보여야 한다.
- 데스크톱에서도 지도는 상세 패널 뒤에서 계속 보여야 한다.
- 모바일 장소 상세 화면은 전체 화면 페이지로 표시한다.
- 모바일 장소 상세 화면의 뒤로 가기 버튼과 브라우저 기본 뒤로 가기는 같은 동작을 해야 한다.
- 모바일 장소 상세 화면에서 지도 화면으로 복귀할 때 선택한 장소는 유지한다.
- 모바일 장소 상세 화면에서 지도 화면으로 복귀할 때 지도는 선택한 장소 위치를 기준으로 보여준다.
- 지도 라벨은 기본적으로 `level 1-5`에서 표시하고 `level 6`부터 숨긴다.
- 장소 상세에서 Naver 이동 버튼은 항상 일관된 위치에 둔다.
- 이름 입력 화면은 단일 input field 하나만 사용한다.
- 이름 input은 빈 값 제출을 허용하지 않는다.
- 별점 입력 UI는 숫자 입력 필드가 아니라 별 모양 버튼을 사용한다.
- 장소 추가 화면에서는 5번째 별이 기본 선택 상태여야 한다.
- 모바일에서 지도 화면, 장소 목록 페이지, 상세 화면의 전환은 사용자가 맥락을 잃지 않도록 유지해야 한다.
