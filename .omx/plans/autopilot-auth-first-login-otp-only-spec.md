# Autopilot Spec: First-login OTP-only auth mail

## Goal
- Nurimap auth request가 첫 로그인에서도 signup confirmation 메일이 아니라 일반 OTP 메일로 동작하게 만든다.

## Non-goals
- auth UI redesign
- bypass 정책 변경
- verify endpoint contract 변경

## Functional Intent
- allowed email first-login -> backend pre-provision -> publishable `signInWithOtp` -> OTP mail
- existing user -> current OTP flow 유지
- verify path -> current `type: 'email'` 유지

## Code Touchpoints
- `src/server/authService.ts`
- `api/_lib/_authService.ts`
- `src/server/authService.test.ts`

## Key Design Choice
- implicit signup(`shouldCreateUser: true`) 대신 admin boundary에서 허용된 신규 user를 명시적으로 준비하고, 실제 OTP 발송은 existing user 대상으로만 수행한다.

## Why This Choice
- Supabase signup confirmation template 분기로 새는 원인을 코드에서 직접 제어할 수 있다.
- spec가 요구하는 “로그인 이메일에는 6자리 OTP 코드 포함” 계약과 더 잘 맞는다.
