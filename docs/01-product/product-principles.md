# Product Principles

## Purpose
이 문서는 Nurimap 제품을 설계하고 구현할 때 흔들리지 않아야 할 상위 원칙을 정리한다.
기능 우선순위, 상세 spec, Sprint scope는 바뀔 수 있지만 아래 원칙은 기준으로 유지한다.

## 1. Internal-Only First
- Nurimap은 사내 구성원을 위한 내부 제품이다.
- 공개 서비스, 외부 회원가입, 검색 유입 최적화는 기본 방향이 아니다.
- 인증, 접근 제어, 검색 엔진 비노출은 제품 정체성의 일부다.

## 2. Spec First, Then Build
- 구현은 선택된 spec을 기준으로 시작한다.
- spec에 없는 기능을 구현으로 먼저 확정하지 않는다.
- 포함 범위, 제외 범위, acceptance criteria는 구현 전에 문서로 먼저 고정한다.

## 3. Sprint Scope Must Stay Explicit
- 이번 Sprint의 목표와 범위는 `planning.md`에 먼저 고정한다.
- 선택된 spec과 무관한 요구사항을 묶어서 같이 구현하지 않는다.
- 범위를 몰래 넓히는 구현은 허용하지 않는다.

## 4. Change Before Implementation
- 변경 요청이 들어오면 즉시 구현하지 않고 먼저 change log에 기록한다.
- 현재 Sprint에 반영할지, 다음 Sprint로 미룰지 결정한 뒤에만 관련 spec과 Sprint 문서를 갱신한다.
- 큰 계획 위에 변경을 계속 덧붙이지 않고, 현재 유효한 범위를 다시 정리한 뒤 실행한다.

## 5. AI Autonomy Must Stay Inside Documented Scope
- AI Agent는 현재 Sprint와 선택된 spec 안에서만 자율적으로 실행한다.
- 문서에 없는 요구사항, 충돌하는 해석, 구조적으로 큰 결정은 조용히 확정하지 않는다.
- 중요한 판단은 기록 가능해야 하며, 다른 사람이 이어서 봐도 이유를 이해할 수 있어야 한다.

## 6. Contribution Must Stay Lightweight
- 장소 등록은 가능한 한 적은 입력으로 끝나야 한다.
- 사용자가 Naver Map URL 하나로 시작할 수 있어야 한다.
- 입력 부담을 줄이는 방향이 우선이다.

## 7. Browsing Must Be Fast And Clear
- 지도, 목록, 상세 화면은 빠르게 비교하고 판단하는 경험을 제공해야 한다.
- 데스크톱과 모바일 모두 사용자가 맥락을 잃지 않도록 흐름을 설계한다.
- 정보는 많더라도 핵심 판단에 필요한 구조가 먼저 보여야 한다.

## 8. Data Must Be Trustworthy
- 동일 장소는 `naver_place_id` 기준으로 하나의 canonical place로 유지한다.
- 좌표, 주소, 집계 값, 리뷰 상태는 문서화된 규칙과 일치해야 한다.
- 불확실하거나 검증되지 않은 데이터는 조용히 저장하지 않는다.

## 9. Failure Must Be Understandable
- 실패 상태는 사용자에게 이해 가능한 방식으로 드러나야 한다.
- 입력값과 맥락은 가능하면 유지하고, 다시 시도할 수 있어야 한다.
- 브라우저 기본 alert 같은 임시 처리에 기대지 않는다.
