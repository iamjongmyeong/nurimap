# Domain Model

This document is the source of truth for domain rules.

## Naming Rule
- 내부 대표 도메인 객체는 `place`다.
- `location`은 좌표 또는 지도 위치 정보에만 사용한다.
- `place_type`은 `restaurant | cafe`다.
- `zeropay_status`는 `available | unavailable | needs_verification`다.
- `recommendation`은 내부 도메인 용어다. UI에서는 `추천` 또는 `좋아요`로 표현할 수 있다.
- 내부 집계 필드명은 `review_count`를 사용하고, UI에서는 필요할 때 `리뷰 수` 또는 `별점 수`로 표현할 수 있다.
- 현재 사용자 기준 review 파생 필드명은 `my_review`를 사용한다.
- 현재 사용자 기준 recommendation 상태 파생 필드명은 `my_recommendation_active`를 사용한다.

## Core Entities

### Place
사내 사용자가 지도에서 탐색하는 canonical 장소 엔터티다.

후보 필드:
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
- 현재 릴리즈의 canonical 중복 판정 기준은 정규화된 `name + road_address` 조합이다.
- `road_address`는 필수값이다.
- `land_lot_address`는 선택값이다.
- place_type은 식당/카페 2종만 사용한다.
- zeropay_status는 3상태로 관리한다.
- 저장되는 place는 반드시 `latitude`, `longitude`를 가져야 한다.

### Review
사용자가 place에 남기는 텍스트 의견이다.

후보 필드:
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
- 이번 릴리즈에서는 이미 review가 있는 사용자가 같은 place에 새 review를 추가할 수 없다.
- 수정/삭제는 이번 릴리즈 범위에 포함하지 않는다.

### Recommendation
사용자의 place 추천 액션을 나타내는 엔터티다.

후보 필드:
- `id`
- `place_id`
- `user_id`
- `created_at`

핵심 규칙:
- 로그인 사용자만 recommendation을 추가/취소할 수 있다.
- place별 추천 수 집계가 가능해야 한다.
- 한 사용자는 place마다 하나의 recommendation 상태만 가진다.
- 같은 사용자가 추천을 다시 누르면 recommendation을 취소한다.

### User
인증된 사내 사용자 엔터티다.

후보 필드:
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
- place 등록자, 리뷰 작성자, 추천자 연결에 사용한다.

### LoginLink
이메일 로그인에 사용하는 일회성 인증 링크 엔터티다.

후보 필드:
- `id`
- `email`
- `issued_at`
- `expires_at`
- `consumed_at`
- `invalidated_at`

핵심 규칙:
- 허용 도메인 이메일에 대해서만 발급한다.
- 발급 후 5분 동안만 유효하다.
- 새 login_link를 발급하면 같은 이메일의 이전 미사용 login_link는 무효화한다.
- 한 번 사용한 login_link는 다시 사용할 수 없다.
- 동일 이메일은 5분 cooldown 안에 다시 요청할 수 없다.
- 동일 이메일은 하루 최대 5회까지만 login_link를 요청할 수 있다.
- 만료, 사용 완료, 무효화된 login_link는 session을 생성할 수 없다.

### Session
로그인 상태를 나타내는 세션 문맥이다.

후보 필드:
- `user_id`
- `access_token`
- `refresh_token`
- `issued_at`
- `expires_at`
- `browser_storage_key`

핵심 규칙:
- 같은 브라우저에서만 최대 90일 동안 유지한다.
- 브라우저 저장소 삭제, 로그아웃, 90일 절대 만료 시 재로그인이 필요하다.

## Relationships
| From | To | Relation |
|---|---|---|
| User | Place | 한 사용자는 여러 place를 등록할 수 있다 |
| Place | Review | 한 place에는 여러 review가 달릴 수 있다 |
| User | Review | 한 사용자는 여러 review를 작성할 수 있지만, 같은 place에는 하나만 작성할 수 있다 |
| Place | Recommendation | 한 place에는 여러 recommendation이 달릴 수 있다 |
| User | Recommendation | 한 사용자는 여러 place를 추천할 수 있다 |

## Derived Views
- Place List View
  - `name`, `average_rating`, `review_count`, `zeropay_status`
- Place Detail View
  - `name`, 주소, `place_type`, `average_rating`, `review_count`, `my_rating_score`, `my_review`, 등록자, `recommendation_count`, `my_recommendation_active`, review 목록
  - review 목록 item: `author_name`, `created_at`, `rating_score`, `content`
- Map Marker View
  - `latitude`, `longitude`, `place_type`, `name`

## Data Integrity Rules
- `normalized_name + normalized_road_address`는 현재 canonical duplicate 후보 키다.
- review는 `(place_id, author_user_id)` 조합으로 하나만 허용한다.
- recommendation은 `(place_id, user_id)` 조합으로 하나만 허용한다.
- 현재 도메인 규칙에서는 `review_count`를 리뷰 수와 별점 수의 canonical 집계 필드로 사용한다.
- `average_rating`은 review들의 `rating_score` 집계값으로만 계산한다.
- `recommendation_count`는 active recommendation 상태 수만 집계한다.
- `my_review`는 현재 사용자의 review 전체 또는 null이다.
- `my_recommendation_active`는 현재 사용자의 active recommendation 존재 여부를 나타낸다.
- place 저장 전 좌표를 확보해야 한다.
- 좌표 추출 실패 시 `road_address`, 이후 `land_lot_address` 순서로 geocoding fallback을 시도한다.
- geocoding까지 실패하면 place를 저장하지 않는다.
- `name`, 주소, 좌표는 최신 사용자 확인값을 우선한다.
- `place_type`은 최신 사용자 입력값을 우선한다.
- `zeropay_status`는 확인된 상태가 `needs_verification`보다 우선하고, 확인된 상태끼리 충돌하면 최신 사용자 입력값을 우선한다.
- place_type과 zeropay_status는 enum으로 제한한다.
