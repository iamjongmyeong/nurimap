# Domain Model

이 문서는 Nurimap의 canonical 도메인 엔터티, 파생 뷰, 데이터 무결성 규칙의 source of truth다.
런타임 구조, route/state ownership, 외부 연동 파이프라인은 [System Runtime](./system-runtime.md), 인증/세션/운영 정책은 [Security And Ops](./security-and-ops.md)에서 다룬다.

## Naming Rule
- 내부 대표 도메인 객체는 `place`다.
- `location`은 좌표 또는 지도 위치 정보에만 사용한다.
- `place_type`은 `restaurant | cafe`다.
- `zeropay_status`는 `available | unavailable | needs_verification`다.
- 내부 집계 필드명은 `review_count`를 사용하고, UI에서는 필요할 때 `리뷰 수` 또는 `별점 수`로 표현할 수 있다.
- viewer 기준 review 파생 필드명은 `my_review`를 사용한다.
- viewer 기준 rating 파생 필드명은 `my_rating_score`를 사용한다.

## Core Entities

### Place
사내 사용자가 지도에서 탐색하는 canonical 장소 엔터티다.

대표 필드:
- `id`
- `name`
- `road_address`
- `land_lot_address`
- `latitude`
- `longitude`
- `place_type`
- `zeropay_status`
- `created_by_user_id`
- `created_at`
- `updated_at`

핵심 규칙:
- 로그인 사용자만 place를 등록할 수 있다.
- place duplicate 판정의 canonical 기준은 정규화된 `name + road_address` 조합이다.
- `road_address`는 필수값이다.
- `land_lot_address`는 선택값이다.
- place_type은 식당/카페 2종만 사용한다.
- zeropay_status는 3상태로 관리한다.
- 저장이 완료된 place는 반드시 `latitude`, `longitude`를 가진다.
- 좌표 확보 순서와 geocoding fallback은 [System Runtime](./system-runtime.md)의 place write pipeline을 따른다.

### Review
사용자가 place에 남기는 텍스트 의견이다.

대표 필드:
- `id`
- `place_id`
- `author_user_id`
- `rating_score`
- `content`
- `created_at`
- `updated_at`

핵심 규칙:
- 로그인 사용자만 작성 가능하다.
- 한 사용자는 같은 place에 review 하나만 가진다.
- 리뷰 작성 시 별점 평가를 함께 입력한다.
- review의 `rating_score`는 해당 사용자의 place별 단일 별점 상태다.
- `rating_score`는 1점에서 5점 사이의 정수만 허용한다.
- `content`는 500자 이하만 허용한다.
- place 등록 시 입력한 초기 리뷰와 별점은 동일 Review 엔터티로 저장한다.
- 작성자와 작성일이 상세 화면에 보여야 한다.
- review lifecycle의 세부 허용 범위(추가/수정/삭제 지원 여부)는 selected spec이 정한다.

### User
인증된 사내 사용자 엔터티다.

대표 필드:
- `id`
- `email`
- `email_domain`
- `name`
- `created_at`
- `last_seen_at`

핵심 규칙:
- 허용 도메인은 `@nurimedia.co.kr`다.
- 이름은 필수 값이다.
- 최초 로그인 후 이름이 비어 있으면 이름 입력을 완료해야 한다.
- 이름은 단일 input field로 수집하고, 1글자 이상이면 유효하다.
- place 등록자와 리뷰 작성자 연결에 사용한다.

### LoginLink
이메일 로그인에 사용하는 일회성 인증 링크 엔터티다.

대표 필드:
- `id`
- `email`
- `issued_at`
- `expires_at`
- `consumed_at`
- `invalidated_at`

핵심 규칙:
- 허용 도메인 이메일에 대해서만 발급한다.
- 제한된 시간 동안만 유효하다.
- 새 login_link를 발급하면 같은 이메일의 이전 미사용 login_link는 무효화한다.
- 한 번 사용한 login_link는 다시 사용할 수 없다.
- 재요청 제한과 cooldown 같은 세부 보호 수치는 auth/security 정책이 정한다.
- 만료, 사용 완료, 무효화된 login_link는 session을 생성할 수 없다.

### Session
로그인 상태를 나타내는 세션 문맥이다.

대표 필드:
- `user_id`
- `access_token`
- `refresh_token`
- `issued_at`
- `expires_at`
- `browser_storage_key`

핵심 규칙:
- 같은 브라우저 문맥에서 복원 가능한 세션이다.
- 만료/갱신/절대 수명 같은 세부 정책은 auth/security 문서가 정한다.

## Relationships
| From | To | Relation |
|---|---|---|
| User | Place | 한 사용자는 여러 place를 등록할 수 있다 |
| Place | Review | 한 place에는 여러 review가 달릴 수 있다 |
| User | Review | 한 사용자는 여러 review를 작성할 수 있지만, 같은 place에는 하나만 작성할 수 있다 |

## Derived Views
- Place List View
  - `name`, `average_rating`, `review_count`, `zeropay_status`
- Place Detail View
  - `name`, 주소, `place_type`, `average_rating`, `review_count`, `my_rating_score`, `my_review`, 등록자, review 목록
  - review 목록 item: `author_name`, `created_at`, `rating_score`, `content`
- Map Marker View
  - `latitude`, `longitude`, `place_type`, `name`

## Data Integrity Rules
- `normalized_name + normalized_road_address`는 canonical duplicate 후보 키다.
- review는 `(place_id, author_user_id)` 조합으로 하나만 허용한다.
- `review_count`는 리뷰 수와 별점 수를 대표하는 canonical 집계 필드로 사용한다.
- `average_rating`은 review들의 `rating_score` 집계값으로만 계산한다.
- `my_review`는 요청 사용자 기준 review 전체 또는 null이다.
- `my_rating_score`는 요청 사용자 기준 review가 있으면 그 review의 `rating_score`를, 없으면 null을 나타낸다.
- place commit 전에는 좌표를 확보해야 하며, 좌표 확보 절차는 [System Runtime](./system-runtime.md)의 runtime contract를 따른다.
- `name`, 주소, 좌표는 최신 사용자 확인값을 우선한다.
- `place_type`은 최신 사용자 입력값을 우선한다.
- `zeropay_status`는 확인된 상태가 `needs_verification`보다 우선하고, 확인된 상태끼리 충돌하면 최신 사용자 입력값을 우선한다.
- place_type과 zeropay_status는 enum으로 제한한다.
