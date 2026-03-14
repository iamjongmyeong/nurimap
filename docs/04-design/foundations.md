# Design Foundations

이 문서는 공통 레이아웃, breakpoint, 상태 모델처럼 전체 UI에 공통 적용되는 디자인 기준을 정의한다.
개별 사용자 흐름별 화면 구조와 상호작용은 `04-design/` 아래 대응 문서에서 다룬다.

관련 문서:
- [Auth And Name Entry Design](./auth-and-name-entry.md)
- [Browse And Detail Design](./browse-and-detail.md)
- [Place Submission Design](./place-submission.md)
- [Review Design](./review.md)
- [Recommendation Design](./recommendation.md)

## Global Layout Rules
- breakpoint: `768px`
- 지도 시작 위치
  - 주소: `서울 마포구 양화로19길 22-16`
  - 좌표: `37.558721, 126.924440`

## Shared State Model
### Navigation State
| State | Description |
|---|---|
| `auth_required` | 로그인 전 상태 |
| `auth_link_sent` | 로그인 링크 발송 후 대기 상태 |
| `auth_link_invalid` | 만료, 사용 완료, 무효화된 링크의 인증 실패 화면 상태 |
| `name_required` | 이름 입력이 필요한 상태 |
| `map_browse` | 지도 탐색 기본 상태 |
| `mobile_place_list_open` | 모바일 목록 화면이 열린 상태 |
| `place_add_open` | 기존 목록 영역이 등록 화면으로 전환된 상태 |
| `place_detail_open` | 데스크톱 상세 패널 또는 모바일 전체 화면 상세가 열린 상태 |

### Async Substate
| Key | Values | Applies To | Description |
|---|---|---|---|
| `auth_request` | `idle`, `submitting`, `error` | 로그인 화면 | 로그인 링크 요청 상태 |
| `auth_link_verify` | `idle`, `verifying`, `error` | 로그인 링크 진입 | 로그인 링크 검증 상태 |
| `name_submit` | `idle`, `submitting`, `error` | 이름 입력 화면 | 이름 저장 상태 |
| `place_submit` | `idle`, `submitting`, `error` | 장소 등록 UI | 입력 검증, geocoding, 저장 상태 |
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
