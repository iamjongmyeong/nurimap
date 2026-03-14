# Integrations

## Overview
Nurimap은 외부 서비스와의 연동을 place 등록, geocoding, 지도 렌더링, 인증 네 가지 범주로 나눈다.

## User-entered Place Input

### Required Inputs
- `name`
- `road_address`
- `place_type`
- `zeropay_status`
- `rating_score`

### Optional Inputs
- `land_lot_address`
- `review_content`

### Validation Rule
- 이름과 도로명 주소는 필수다.
- 장소 구분, 제로페이 상태, 평가는 저장 전에 반드시 유효한 값이어야 한다.
- 선택 입력값은 비어 있어도 등록 흐름을 막지 않는다.

### Failure Cases
- 이름이 비어 있음
- 도로명 주소가 비어 있음
- enum 값이 유효하지 않음
- 입력 필드 아래에 inline error를 표시하고 현재 화면에 머문다.

## Address Geocoding

### Goal
등록 전에 아래 정보를 확보하는 것이 목표다.

- `name`
- `road_address`
- `land_lot_address`
- `latitude`
- `longitude`

### Primary Strategy
현재 기본 전략은 **사용자 입력 주소 기반 서버 측 geocoding**이다.

후보 흐름:
1. 클라이언트가 `name`, `road_address`, `place_type`, `zeropay_status`, `rating_score`, 선택 `land_lot_address`, 선택 `review_content`를 제출한다.
2. 서버가 필수 입력과 enum 값을 검증한다.
3. 서버가 좌표 확보를 아래 우선순위로 시도한다.
   - 1순위: `road_address` geocoding
   - 2순위: `land_lot_address` geocoding
4. 최종 좌표를 확보하면 place 저장을 진행한다.
5. geocoding이 실패하면 저장하지 않고 실패 상태를 반환한다.

### Integration Rules
- 브라우저에서 직접 geocoding 민감 호출을 하지 않는다.
- 입력값 검증과 geocoding은 서버 경계를 통해 수행한다.
- 동일 정규화 주소 geocoding 결과는 캐시를 우선 고려한다.
- Kakao 지도 표시는 최종 좌표를 가진 place만 허용한다.
- 도로명 주소 geocoding 실패 시 지번 주소 geocoding을 한 번 더 시도한다.
- geocoding에 최종 실패하면 저장하지 않고 사용자에게 실패 상태를 제공한다.

## Kakao Map

### Purpose
place를 지도에 표시하고 탐색 상태를 관리한다.

### Inputs
- Kakao Map app key
- 중심 좌표: `37.558721, 126.924440`
- place 목록

### Rendering Rules
- `place_type`에 따라 다른 마커 아이콘을 사용한다.
- 지도를 충분히 축소하면 이름 라벨을 숨긴다.
- 지도에는 Kakao 공식 zoom control을 노출하고, 앱 상태는 `zoom_changed` 이벤트와 `getLevel()` 기준으로 동기화한다.
- 지도 이동/확대축소 이벤트는 과도한 API 재호출을 만들지 않도록 debounce 또는 throttle을 적용한다.
- 지도 위에 표시되는 place는 모두 `latitude`, `longitude`를 가진 상태여야 한다.

## Supabase

### Auth
- 이메일 로그인 링크 인증
- 로그인 이메일에 로그인 전용 URL 제공
- 로그인 전용 URL은 직접 로그인 링크로 사용함
- 같은 브라우저 90일 세션 유지

### Database
- place
- review
- recommendation
- 사용자 식별 정보
