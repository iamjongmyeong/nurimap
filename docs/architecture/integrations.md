# Integrations

## Overview
Nurimap은 외부 서비스와의 연동을 place 등록, 지도 렌더링, 인증, 외부 딥링크 네 가지 범주로 나눈다.

## Naver URL Ingestion

### Supported Input Shapes
- `https://map.naver.com/p/search/.../place/{placeId}?...`
- `https://map.naver.com/p/entry/place/{placeId}?...`

### Canonicalization Rule
모든 입력 URL은 아래 형태로 정규화한다.

```text
https://map.naver.com/p/entry/place/{placeId}
```

### Extraction Contract
- 입력
  - raw Naver URL
- 출력
  - `naver_place_id`
  - canonical Naver URL

### Failure Cases
- `map.naver.com`이 아님
- `placeId`가 없음
- 지원하지 않는 URL 형식

## Naver Place Data Lookup

### Goal
등록 전에 아래 정보를 확보하는 것이 목표다.

- `name`
- `road_address`
- `land_lot_address`
- `latitude`
- `longitude`

### Current Candidate Strategy
현재 가장 유력한 후보는 `placeId` 기반 서버 측 조회다.

후보 흐름:
1. 클라이언트가 raw URL을 제출한다.
2. 서버가 URL을 검증하고 `naver_place_id`를 추출한다.
3. 서버가 place 데이터를 조회한다.
4. 좌표 확보는 아래 우선순위로 진행한다.
   - 1순위: 네이버 응답의 위도/경도 사용
   - 2순위: `road_address`를 Kakao geocoding으로 변환
   - 3순위: `land_lot_address`를 Kakao geocoding으로 변환
5. 최종 좌표를 확보하면 place 생성 또는 병합을 진행한다.
6. 네이버 응답 자체가 실패하면 alert를 표시하고 등록 프로세스를 종료한다.
7. 최종 좌표 확보에 실패하면 alert를 표시하고 등록 프로세스를 종료한다.

### Current Technical Observation
현 시점 탐색으로는 HTML 직접 파싱보다 `placeId -> place summary JSON` 경로가 더 현실적이다. 내부 API 형태는 확인되었지만 공식 공개 API가 아니므로 구현 단계에서 안정성, 약관, fallback 정책을 다시 검증해야 한다.

### Integration Rules
- 브라우저에서 직접 Naver 조회를 하지 않는다.
- 외부 응답 원문은 내부 서버 경계를 통해 다룬다.
- 동일 `naver_place_id` 조회는 캐시를 우선 고려한다.
- Kakao 지도 표시는 최종 좌표를 가진 place만 허용한다.
- 네이버 좌표가 없으면 Kakao 주소 검색으로 좌표를 보강한다.
- 도로명 주소 geocoding 실패 시 지번 주소 geocoding을 한 번 더 시도한다.
- 네이버 응답 자체가 실패하면 저장하지 않고 사용자에게 명확한 alert를 제공한다.
- 좌표 확보에 최종 실패하면 저장하지 않고 사용자에게 명확한 alert를 제공한다.

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
- 지도 이동/확대축소 이벤트는 과도한 API 재호출을 만들지 않도록 debounce 또는 throttle을 적용한다.
- 지도 위에 표시되는 place는 모두 `latitude`, `longitude`를 가진 상태여야 한다.

### Geocoding Fallback
- Kakao Web API의 `services.Geocoder().addressSearch()` 또는 동등한 Kakao Local API를 이용해 주소를 좌표로 변환할 수 있다.
- 등록 시점에 좌표를 확정해 저장하고, 지도 렌더링 시점에는 재변환을 반복하지 않는다.

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

## Naver Deep Link

### Purpose
place 상세 화면에서 사용자가 Naver 지도 앱 또는 웹으로 이동할 수 있게 한다.

### Preferred Reference
- canonical Naver URL을 기본 연결 대상로 사용한다.
- 네이티브 앱 scheme 최적화 여부는 구현 단계에서 별도 확정한다.

### Failure Handling
- 앱 딥링크가 실패하면 웹 URL을 fallback으로 사용한다.
