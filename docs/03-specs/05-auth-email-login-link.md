# Spec: Auth Email OTP

## Summary
회사 이메일 **6자리 OTP 인증**, 재전송 정책, 인증 실패 처리 기준을 정의한다. 이 문서는 인증 기능 요구사항과 검증 기준의 source of truth다.

## Scope
- 허용 도메인 검증
- OTP 발급 요청
- OTP 입력 및 검증
- 인증 실패 처리
- 요청/검증 비동기 상태
- 최초 로그인 후 이름 수집
- 이름 저장 비동기 상태
- 세션 생성 및 복원
- OTP 재전송 정책

## Functional Requirements
- 허용 도메인은 `@nurimedia.co.kr` 하나다.
- 운영자가 환경변수로 지정한 exact allowlist 이메일은 허용 도메인이 아니어도 일반 OTP 요청을 보낼 수 있다.
- 운영자가 환경변수로 지정한 bypass 이메일은 OTP 입력 없이 바로 로그인할 수 있다.
- 허용 도메인이 아니면 OTP를 발급하지 않는다.
- exact allowlist 이메일은 bypass와 별개로 동작하며, non-local runtime에서도 일반 OTP 로그인 경로를 유지한다.
- 허용 도메인이 아닌 이메일 입력은 로그인 화면에서 처리하고, 입력값은 유지한다.
- 로그인 이메일에는 서비스 식별 정보와 6자리 OTP 코드가 포함되어야 한다.
- OTP는 발급 후 5분 동안만 유효하다.
- 새 OTP를 발급하면 이전 미사용 OTP는 무효화된다.
- OTP는 한 번 성공적으로 검증되면 다시 사용할 수 없다.
- 동일 이메일은 한 cooldown cycle 안에서 최대 3회까지 대기 시간 없이 재전송할 수 있다.
- 동일 이메일의 4번째 요청부터는 5분 cooldown을 적용한다.
- cooldown이 끝나면 해당 이메일의 resend burst count는 reset된다.
- cooldown에 걸린 요청은 로그인 화면 request context로 수렴하고, 남은 대기 시간을 `0분 00초` 형식으로 보여주며 입력 이메일을 유지한다.
- OTP 요청 성공 후에는 페이지 이동 없이 현재 auth 흐름 안에서 OTP 입력 상태를 표시한다.
- OTP 입력 상태에는 사용자가 입력한 이메일 주소와 인증 CTA가 함께 보여야 한다.
- OTP 입력 상태에서 사용자는 새 이메일을 다시 입력하는 흐름으로 돌아갈 수 있어야 한다.
- 잘못된 코드 입력은 OTP 입력 상태 안에서 처리하고, 사용자는 같은 이메일 컨텍스트로 다시 시도할 수 있어야 한다.
- 만료된 코드, 더 새 코드 발급으로 무효화된 코드, 일반 검증 실패는 사용자가 이해할 수 있는 설명으로 보여야 하며 내부 error code를 그대로 노출하지 않는다.
- recoverable verify 문제는 OTP 입력 상태에서 처리할 수 있어야 한다.
- 예상하지 못한 인증 오류는 auth failure surface로 처리할 수 있다.
- 인증 실패 상태에서는 앱 메인 화면으로 진입할 수 없다.
- 인증 관련 오류는 브라우저 기본 `alert`로 표시하지 않는다.
- 로그인 화면의 요청 상태는 `auth_request = idle | submitting | error`로 관리한다.
- OTP 검증 상태는 `auth_otp_verify = idle | submitting | error`로 관리한다.
- `auth_request = submitting` 동안 OTP 요청 버튼을 다시 누를 수 없다.
- `auth_otp_verify = submitting` 동안 OTP 확인 버튼을 다시 누를 수 없다.
- auth phase는 `loading | auth_required | otp_required | verifying | auth_failure | name_required | authenticated`로 관리한다.
- `verifying` 동안 인증 결과가 확정되기 전까지 앱 메인 화면으로 진입할 수 없다.
- request-otp 또는 OTP verify 요청이 지연되거나 응답하지 않아도 auth flow는 무한 대기 상태에 머물지 않고 terminal auth state로 수렴해야 한다.
- OTP 입력 도중 새로고침해도 검증은 무한 대기 상태에 머물지 않고 terminal auth state로 수렴해야 한다.
- 이미 유효한 세션이 있는 상태에서는 세션 복원을 우선 적용한다.
- 로그인 화면과 OTP 입력 화면은 모바일과 데스크톱 모두 같은 auth surface hierarchy를 사용한다.
- 로그인 화면에는 브랜드 식별 요소와 로그인 목적 안내가 있어야 한다.
- 이메일 input은 접근성용 label을 유지해야 한다.
- 이메일이 비어 있거나 형식이 유효하지 않으면 OTP 요청 버튼은 비활성화된다.
- OTP 코드는 숫자 6자리여야 한다.
- OTP가 6자리가 아니면 확인 버튼은 비활성화되거나 검증 요청을 보내지 않아야 한다.
- 로그인 성공 시 같은 브라우저에서 최대 90일 세션을 유지한다.
- bypass 이메일 목록 자체는 환경변수로만 관리하고 tracked source에는 직접 적지 않는다.
- exact allowlist 이메일 목록도 환경변수로만 관리하고 tracked source에는 직접 적지 않는다.
- 비로그인 사용자는 보호된 화면과 API에 접근할 수 없다.
- 로그인 성공 후 사용자 이름이 비어 있으면 이름 입력 화면으로 보낸다.
- 이름 입력은 단일 input field 하나로 받는다.
- 이름 input은 비울 수 없다.
- 이름은 1글자 이상 입력되면 유효하다.
- 이름은 최대 10글자까지 입력할 수 있다.
- 10글자를 초과하는 타이핑은 입력되지 않아야 하고, 붙여넣기된 초과분은 제거한다.
- 이름 저장 상태는 `name_submit = idle | submitting | error`로 관리한다.
- `name_submit = submitting` 동안 저장 버튼을 다시 누를 수 없다.
- 이름 저장 실패 시 이름 입력 화면에 머물며 입력값을 유지한다.
- 이름 입력 완료 전에는 앱 메인 화면으로 진입할 수 없다.
- 이름이 이미 있는 사용자는 이름 입력 화면을 건너뛴다.

## Canonical Runtime / API Contract
- canonical OTP request endpoint는 `POST /api/auth/request-otp`다.
- request body는 `{ email: string, requireBypass?: boolean }`를 사용한다.
- backend의 일반 OTP request/verify는 Supabase publishable/anon auth client를 사용하고, `auth.admin.*` 작업만 service-role/admin client를 사용한다.
- 정상 OTP 발급 성공 응답은 `{ status: 'success', mode: 'otp', message: '인증 코드를 보냈어요.' }`다.
- bypass 성공 응답은 `{ status: 'success', mode: 'bypass', message: '테스트 계정으로 바로 로그인합니다.', tokenHash: string, verificationType: 'magiclink' | 'signup' | 'invite' }`를 사용한다.
- cooldown 응답은 `{ status: 'error', code: 'cooldown', message: string, retryAfterSeconds: number }`를 사용한다.
- 일반 request error 응답은 `{ status: 'error', code: 'invalid_domain' | 'delivery_failed' | 'bypass_required', message: string }`를 사용한다.
- canonical 일반 OTP verify endpoint는 `POST /api/auth/verify-otp`다.
- verify request body는 `{ email: string, token: string }`를 사용한다.
- verify 성공 시 backend는 app session cookie를 설정하고 `{ status: 'success', nextPhase: 'authenticated' | 'name_required' }`를 반환한다.
- auth bootstrap source of truth는 `GET /api/auth/session`이다.
- server-side resend/cooldown bookkeeping은 Supabase auth user의 `app_metadata.nurimap_auth` 안에 유지하되 `day_key`, `day_count`, `last_requested_at`, `last_verified_at` 같은 OTP-era 필드만 남긴다.
- bypass 경로는 canonical user auth flow가 아니라 dev/test convenience 예외다. 이 경로는 기존 `tokenHash` + `verificationType` session adoption shape를 유지할 수 있다.

## Failure Copy Contract
- OTP 입력 실패 사용자 문구는 `이 코드는 사용할 수 없어요.`를 사용한다.
- generic auth failure 문구는 `인증에 실패했어요. 새 코드를 받아주세요.`를 사용한다.

## Acceptance Criteria
- 허용 도메인이 아닌 이메일은 OTP를 발급할 수 없다.
- 운영자가 환경변수로 지정한 exact allowlist 이메일은 허용 도메인이 아니어도 OTP를 발급할 수 있다.
- 허용 도메인이 아닌 이메일 입력 시 로그인 화면에 실패 상태가 보이고 입력 이메일이 유지된다.
- OTP 요청 성공 후 같은 auth surface 안에서 입력 이메일을 포함한 OTP 입력 상태가 보인다.
- 로그인 이메일에서 서비스 식별, 6자리 OTP 코드, 유효시간 안내를 확인할 수 있다.
- OTP는 5분 뒤 만료된다.
- 새 OTP 발급 후 이전 미사용 OTP는 실패한다.
- 같은 이메일은 burst 3회까지 즉시 재요청할 수 있다.
- 같은 이메일의 4번째 요청부터는 5분 cooldown이 적용되고 남은 대기 시간이 `0분 00초` 형식으로 표시되며 입력 이메일이 유지된다.
- 잘못된 OTP를 입력하면 앱은 로그인되지 않고, 사용자는 같은 OTP 입력 상태에서 다시 시도할 수 있다.
- 만료되었거나 무효화된 OTP는 로그인되지 않고, 사용자는 새 OTP 요청 경로를 볼 수 있다.
- OTP 확인 중에는 처리 상태가 보이고 결과 확정 전 앱 메인 화면으로 이동하지 않는다.
- OTP 확인 중 새로고침하거나 네트워크가 hang되어도 무한히 `verifying`에 머물지 않는다.
- 로그인 성공 시 세션이 생성되고 재접속 시 복구된다.
- 환경변수로 지정된 bypass 이메일은 OTP 입력 없이도 로그인된다.
- non-local runtime에서도 exact allowlist 이메일은 bypass가 아니라 일반 OTP 경로로 인증할 수 있다.
- 로그인 성공 후 이름이 비어 있으면 이름 입력 화면으로 이동한다.
- 이름 input은 한 개이며, 빈 값은 허용되지 않는다.
- 이름 input은 최대 10글자까지만 유지된다.
- 이름은 1글자 이상이면 저장할 수 있다.
- 이름 저장 중에는 진행 중 상태가 보인다.
- 이름 저장 중에는 저장 버튼을 다시 누를 수 없다.
- 이름 저장 실패 시 입력한 이름이 유지된다.
- 이름 입력을 완료해야 앱 메인 화면으로 진입할 수 있다.
- 이름이 이미 저장된 사용자는 이름 입력 없이 앱으로 진입한다.
- `POST /api/auth/request-otp` 응답 계약과 bypass 응답 계약이 문서와 구현에서 일치한다.
- 일반 OTP verify는 `POST /api/auth/verify-otp`를 통해 backend가 수행한다.
- verify 성공 시 app session cookie가 설정되고, 앱은 `GET /api/auth/session`을 기준으로 인증 상태를 복원한다.
- server-side resend/cooldown state는 `app_metadata.nurimap_auth`에 남고 OTP-era 필드로 정리된다.

## TDD Implementation Order
1. 허용 도메인 검증 테스트를 작성한다.
2. 허용 도메인 실패 상태 + 입력 유지 테스트를 작성한다.
3. OTP 발급 요청 테스트를 작성한다.
4. OTP 요청 성공 후 이메일 표시 상태 테스트를 작성한다.
5. OTP 형식(숫자 6자리) validation 테스트를 작성한다.
6. OTP happy path 테스트를 작성한다.
7. wrong-code 실패 테스트를 작성한다.
8. expired-code 실패 테스트를 작성한다.
9. 새 코드 발급 후 이전 코드 invalidation 테스트를 작성한다.
10. burst 3회 허용 / 4번째 cooldown 정책 테스트를 작성한다.
11. cooldown 안내 형식 테스트를 작성한다.
12. OTP 요청 실패 시 이메일 유지 테스트를 작성한다.
13. 요청 중 버튼 비활성화 테스트를 작성한다.
14. OTP 확인 중 버튼 비활성화 테스트를 작성한다.
15. OTP 검증 중 처리 상태 테스트를 작성한다.
16. OTP verify pending hang timeout 수렴 테스트를 작성한다.
17. refresh / hard refresh terminal-state 테스트를 작성한다.
18. bypass 이메일 즉시 로그인 테스트를 작성한다.
19. 이름 없는 사용자 온보딩 리다이렉트 테스트를 작성한다.
20. 이름 입력 검증 테스트를 작성한다.
21. 이름 저장 중 진행 상태 테스트를 작성한다.
22. 이름 저장 중 버튼 비활성화 테스트를 작성한다.
23. 이름 저장 실패 시 입력 유지 테스트를 작성한다.
24. 이름 저장 후 앱 진입 테스트를 작성한다.
25. 세션 복원 테스트를 작성한다.
26. 보호 라우트 / 보호 API 차단 테스트를 작성한다.
27. 구현한다.
28. 전체 테스트를 통과시킨다.

## Required Test Cases
- 허용 도메인 이메일은 허용된다.
- 다른 도메인은 거부된다.
- exact allowlist 이메일은 허용 도메인이 아니어도 일반 OTP 요청이 된다.
- 다른 도메인 입력 시 실패 상태와 입력 이메일 유지
- OTP 요청 성공 후 같은 surface 안에서 이메일 표시 + OTP 입력 UI 표시
- 로그인 이메일에 6자리 OTP와 서비스 식별/유효시간 안내 포함
- OTP 5분 만료
- 새 OTP 발급 시 이전 OTP 무효화
- burst 3회 허용 / 4번째 cooldown
- cooldown 안내 형식 표시
- 요청 중 OTP 요청 버튼 비활성화
- OTP 확인 중 확인 버튼 비활성화
- OTP 검증 중 처리 상태 표시
- OTP verify pending hang timeout 수렴 + generic failure 설명 표시
- refresh / hard refresh 이후 terminal auth state 전환
- bypass 이메일 즉시 로그인 성공
- non-local runtime에서 exact allowlist 이메일은 bypass가 아니라 일반 OTP 경로를 사용
- 보호 화면/API 차단
- 이름 없는 사용자 이름 입력 화면 이동
- 이름 있는 사용자 앱 진입
- 이름 입력 검증 / 길이 제한
- 이름 저장 중 진행 상태 및 버튼 비활성화
- 이름 저장 실패 시 입력 유지

## Manual QA Checklist
- 허용 도메인 이메일로 OTP 요청이 된다.
- 허용 도메인이 아닌 이메일로 요청이 막히고 입력값이 유지된다.
- exact allowlist 이메일은 허용 도메인이 아니어도 OTP 요청이 된다.
- 로그인 메일에서 서비스 식별, 6자리 OTP, 유효시간 안내를 확인할 수 있다.
- OTP 요청 성공 후 페이지 이동 없이 입력 이메일을 포함한 OTP 입력 상태가 보인다.
- 올바른 OTP를 입력하면 로그인된다.
- 잘못된 OTP를 입력하면 같은 OTP 입력 상태에서 다시 시도할 수 있다.
- 만료된 OTP는 실패하고 새 OTP 요청 경로가 보인다.
- 재발급 후 이전 OTP는 실패한다.
- OTP 요청 중 버튼이 비활성화된다.
- OTP 확인 중 버튼이 비활성화된다.
- 로그인 화면과 OTP 입력 화면은 모바일과 데스크톱에서 같은 auth surface hierarchy로 보인다.
- OTP 검증 중 처리 상태가 보인다.
- OTP 입력 상태에서 새로고침하거나 네트워크가 지연돼도 무한 로딩에 머물지 않는다.
- cooldown 진입 시 남은 대기 시간이 `0분 00초` 형식으로 보인다.
- cooldown 실패 시 입력한 이메일이 유지된다.
- 인증 실패 화면 또는 OTP 입력 화면에서 내부 reason code 대신 사람이 이해할 수 있는 설명이 보인다.
- bypass 이메일은 같은 인증 액션에서 동작한다.
- non-local runtime에서 exact allowlist 이메일은 bypass가 아니라 OTP 입력 화면으로 진입한다.
- 이름이 없는 계정은 로그인 후 이름 입력 화면으로 이동한다.
- 이름 input 하나만 보이고, 빈 값으로는 제출할 수 없다.
- 이름 저장 중 진행 상태가 보인다.
- 이름 저장 중 버튼이 비활성화된다.
- 이름 저장 실패 시 입력한 이름이 유지된다.
- 1글자 이상 입력하면 저장되고 앱으로 진입한다.
- 로그아웃 후 보호 화면 접근이 막힌다.

## QA Evidence
- 테스트 실행 결과
- OTP 이메일 수동 검증 결과
- 이름 입력 온보딩 수동 검증 결과
- 세션 복원/로그아웃 검증 결과
