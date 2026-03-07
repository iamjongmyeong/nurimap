# Domain Model

## Naming Rule
- 내부 대표 도메인 객체는 `place`다.
- `location`은 좌표 또는 지도 위치 정보에만 사용한다.
- `place_type`은 `restaurant | cafe`다.
- `zeropay_status`는 `available | unavailable | needs_verification`다.
- `recommendation`은 내부 도메인 용어다. UI에서는 `추천` 또는 `좋아요`로 표현할 수 있다.

## Core Entities

### Place
사내 사용자가 지도에서 탐색하는 canonical 장소 엔터티다.

후보 필드:
- `id`
- `naver_place_id`
- `naver_place_url`
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
- 동일 `naver_place_id`는 동일 place로 본다.
- place_type은 식당/카페 2종만 사용한다.
- zeropay_status는 3상태로 관리한다.
- 저장되는 place는 반드시 `latitude`, `longitude`를 가져야 한다.

### Review
사용자가 place에 남기는 텍스트 의견이다.

후보 필드:
- `id`
- `place_id`
- `author_user_id`
- `content`
- `created_at`
- `updated_at`

핵심 규칙:
- 로그인 사용자만 작성 가능하다.
- 작성자와 작성일이 상세 화면에 보여야 한다.
- 수정/삭제 가능 여부는 추후 확정한다.

### Rating
사용자가 place에 남기는 1점에서 5점 사이의 별점 엔터티다.

후보 필드:
- `id`
- `place_id`
- `user_id`
- `score`
- `created_at`
- `updated_at`

핵심 규칙:
- 점수는 1점에서 5점 사이의 정수만 허용한다.
- 한 사용자는 place마다 하나의 rating만 가진다.
- 같은 사용자가 다시 평가하면 기존 rating을 수정한다.
- rating은 review 없이도 독립적으로 남길 수 있다.

### Recommendation
사용자의 place 추천 액션을 나타내는 엔터티다.

후보 필드:
- `id`
- `place_id`
- `user_id`
- `created_at`

핵심 규칙:
- place별 추천 수 집계가 가능해야 한다.
- 한 사용자는 place마다 하나의 recommendation 상태만 가진다.
- 같은 사용자가 추천을 다시 누르면 recommendation을 취소한다.

### User
인증된 사내 사용자 엔터티다.

후보 필드:
- `id`
- `email`
- `email_domain`
- `created_at`
- `last_seen_at`

핵심 규칙:
- 허용 도메인은 `@nurimedia.co.kr`다.
- place 등록자, 리뷰 작성자, 추천자 연결에 사용한다.

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
| Place | Rating | 한 place에는 여러 rating이 달릴 수 있다 |
| User | Rating | 한 사용자는 여러 place를 평가할 수 있다 |
| Place | Review | 한 place에는 여러 review가 달릴 수 있다 |
| User | Review | 한 사용자는 여러 review를 작성할 수 있다 |
| Place | Recommendation | 한 place에는 여러 recommendation이 달릴 수 있다 |
| User | Recommendation | 한 사용자는 여러 place를 추천할 수 있다 |

## Derived Views
- Place List View
  - `name`, `road_address`, `average_rating`, `review_count`
- Place Detail View
  - `name`, 주소, `place_type`, `average_rating`, `rating_count`, 등록자, `recommendation_count`, review 목록
- Map Marker View
  - `latitude`, `longitude`, `place_type`, `name`

## Data Integrity Rules
- `naver_place_id`는 canonical uniqueness 후보 키다.
- place 저장 전 좌표를 확보해야 한다.
- 좌표 추출 실패 시 `road_address`, 이후 `land_lot_address` 순서로 geocoding fallback을 시도한다.
- geocoding까지 실패하면 place를 저장하지 않는다.
- `name`, 주소, 좌표는 최신 성공한 외부 추출값을 우선한다.
- `place_type`은 최신 사용자 입력값을 우선한다.
- `zeropay_status`는 확인된 상태가 `needs_verification`보다 우선하고, 확인된 상태끼리 충돌하면 최신 사용자 입력값을 우선한다.
- place_type과 zeropay_status는 enum으로 제한한다.
