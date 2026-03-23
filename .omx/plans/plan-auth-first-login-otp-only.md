# Plan: First-login OTP-only auth mail

## Requirements Summary
- 첫 로그인 사용자가 `POST /api/auth/request-otp`를 호출해도 signup confirmation 메일이 아니라 일반 OTP 메일로 수렴해야 한다.
- 기존 OTP verify contract와 auth phase/UI contract는 유지한다.
- 허용 도메인, `AUTH_ALLOWED_EMAILS`, cooldown, bypass 예외, server-owned bookkeeping 정책은 깨지면 안 된다.

## Acceptance Criteria
- 허용된 신규 이메일(first login) 요청 시 server는 signup confirmation side effect 없이 일반 OTP request path로 수렴한다.
- 일반 OTP 발송 호출은 missing user를 implicit signup에 맡기지 않고, existing confirmed user 대상으로만 `signInWithOtp`를 호출한다.
- 신규 허용 사용자도 request 성공 후 `app_metadata.nurimap_auth` bookkeeping이 저장된다.
- 기존 사용자 OTP request, exact allowlist, bypass-only rejection, cooldown, verify flow 회귀가 없다.
- `src/server/authService.test.ts` 관련 테스트가 green이고 build/typecheck가 깨지지 않는다.

## Implementation Steps
1. **Pre-provision path 설계**
   - `src/server/authService.ts`의 request flow(`393-443`)를 기준으로, missing user를 first-login 전에 admin boundary에서 명시적으로 준비하는 helper를 추가한다.
   - admin boundary는 `createSupabaseAdminClient()` 경로만 사용하고, 일반 OTP 발송은 여전히 publishable auth client를 유지한다.
2. **OTP 발송 경로 전환**
   - `src/server/authService.ts:333-338` / `api/_lib/_authService.ts:333-338`의 `shouldCreateUser: true` 경로를 implicit signup-free path로 바꾼다.
   - 신규 user create race(동일 이메일 동시 요청) 시 duplicate-email류 failure를 refetch fallback으로 흡수한다.
3. **Bookkeeping / tests 정렬**
   - `src/server/authService.test.ts`에서 first-login provisioning 시나리오를 “signInWithOtp가 user를 만든다”가 아니라 “server가 user를 준비한 뒤 OTP를 보낸다”로 바꾼다.
   - 기존 사용자/allowlist/cooldown/bypass/verify 회귀를 함께 확인한다.
4. **Verification**
   - 관련 unit tests + build/typecheck를 실행한다.
   - 필요하면 sprint QA docs에 이번 auth hotfix evidence를 짧게 반영한다.

## Risks And Mitigations
- **Risk:** admin create path가 duplicate user race에 취약할 수 있음
  **Mitigation:** create 실패 시 existing user refetch fallback 추가.
- **Risk:** code fix 후에도 hosted template 설정이 OTP가 아닐 수 있음
  **Mitigation:** final report에 dashboard-side follow-up(템플릿/confirm-email) 분리 명시.
- **Risk:** mirrored serverless file(`api/_lib/_authService.ts`) 미동기화
  **Mitigation:** `src/server`와 `api/_lib`를 같은 패턴으로 함께 수정하고 diff 확인.

## Verification Steps
- `pnpm exec vitest run src/server/authService.test.ts`
- `pnpm exec vitest run src/server/apiAuthVerifyOtp.test.ts src/server/releaseHardening.test.ts`
- `pnpm build`

## Notes
- 이 plan은 `$plan` direct mode 산출물로 만들고, 아래 autopilot impl 문서의 입력으로 재사용한다.
