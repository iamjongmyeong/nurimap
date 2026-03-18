# Auth And Name Entry Design

## Applies When
- 로그인 진입, OTP 입력, 인증 실패, 검증 중, 이름 입력 surface를 다룰 때 적용한다.
- 이 문서는 auth/name entry의 **thin contract**만 정의한다.
- 세부 정책은 아래 source of truth와 함께 해석한다.
  - `docs/01-product/user-flows/auth-and-name-entry.md`
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/02-architecture/security-and-ops.md`

## Visual Source Of Truth
- 현재 작업에 제공된 screenshot / Figma / annotated handoff가 auth surface의 시각 기준이다.
- handoff가 없으면 기존 live auth shell hierarchy를 보존하고 새로운 chrome을 추정 추가하지 않는다.
- 이 문서는 세부 시각 토큰, 타이포그래피 세부값, 자산 경로, exact copy를 고정하지 않는다.

## Surface Contract
- `auth_required`, `otp_required`, `auth_failure`, `verifying`, `name_required`는 같은 auth surface 계열로 읽혀야 한다.
- OTP 요청 성공 후에는 별도 페이지로 벗어나지 않고 같은 auth surface 안에서 OTP 입력 상태로 전환된다.
- OTP 입력 상태는 사용자가 요청한 이메일 맥락과 재시도 affordance를 같은 surface 안에서 이어받아야 한다.
- recoverable OTP 오류는 가능한 한 OTP 입력 surface 안에서 해결되어야 한다.
- 인증 실패는 browse/app shell이 아니라 전용 auth-failure context에서 처리한다.
- 이름 입력은 같은 auth 계열 surface 안에서 단일 이름 입력 흐름으로 유지한다.

## Transition Contract
- OTP 요청 성공은 in-place state transition이어야 하며, 사용자는 방금 요청한 이메일 맥락을 잃지 않아야 한다.
- OTP verify 성공 후에는 `authenticated` 또는 `name_required`로 수렴해야 한다.
- failure recovery CTA는 auth request flow로 돌아가게 해야 하며 auth를 우회해 browse로 진입시키면 안 된다.

## Hidden Invariants
- `verifying`는 transient state이며 refresh, hard refresh, 예외 상황에서도 terminal auth state로 수렴해야 한다.
- 유효 세션이 있으면 세션 복원을 우선한다.
- 인증 전에는 app shell의 탐색 surface를 노출하지 않는다.
- 이름 입력은 browse 진입 전 마지막 gate로 유지한다.

## Failure / Context Rule
- request-otp 단계의 실패는 auth request context 안에서 처리한다.
- wrong/expired/invalidated 같은 recoverable OTP verify 실패는 가능한 한 OTP 입력 context 안에서 처리한다.
- 일반 인증 오류 같은 terminal failure는 auth-failure context 안에서 처리한다.
- resend quota, cooldown policy, 허용 도메인, 세션/security rule은 spec / user-flow / architecture 문서가 source of truth다.
- 메일 템플릿, exact copy, auth policy 숫자는 이 문서에서 중복 정의하지 않는다.

## Out Of Scope
- 구체적인 시각 수치나 자산 경로 같은 세부 가이드
- 이메일 템플릿 구성과 세부 문구
- resend quota 숫자, OTP lifetime, session/security 구현 세부
- browse/detail 또는 place submission surface 규칙
