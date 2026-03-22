# Security And Ops

이 문서는 Nurimap의 인증, 세션, 접근 제어, 검색 차단, abuse 방지, 운영 로그/환경변수 규칙의 source of truth다.
route/state ownership과 integration pipeline은 [System Runtime](./system-runtime.md), 도메인 엔터티와 무결성은 [Domain Model](./domain-model.md)에서 다룬다.

## Security Goals
- 서비스는 사내 구성원만 사용한다.
- 인증되지 않은 사용자는 앱과 API를 사용할 수 없다.
- 이메일 입력과 OTP 요청 흐름은 abuse 방지 정책을 가진다.
- 검색 엔진과 외부 크롤러 노출을 최소화한다.

## Protected Surface Policy
- 전체 앱은 로그인 뒤에만 접근 가능하다.
- `place` 등록과 리뷰 작성 같은 변경성 액션은 모두 인증된 사용자만 수행한다.
- 브라우저와 API는 같은 인증 기준을 적용한다.

## Authentication Policy

### Login Gate
- 비로그인 사용자는 로그인 화면 외의 화면을 볼 수 없다.
- API도 동일하게 인증을 강제한다.
- OTP 검증이 완료되기 전까지는 app shell을 열지 않는다.

### Email Domain Restriction
- 허용 이메일 도메인은 `@nurimedia.co.kr` 하나다.
- 클라이언트에서 1차 검증한다.
- 서버와 인증 완료 후 사용자 정보에서도 다시 검증한다.
- 단, 운영자가 환경변수로 명시한 bypass 이메일 allowlist는 local dev / local QA에서만 예외적으로 허용할 수 있다. non-local runtime은 allowlist/env가 남아 있어도 bypass를 로그인 성공 경로로 사용하지 않는다.
- bypass 이메일 목록 값 자체는 public repository에 커밋하지 않고 환경변수에서만 관리한다.

### Email OTP Policy
- 이메일 OTP 방식만 canonical 로그인 방식으로 지원한다.
- 허용 도메인이 아니면 OTP 발송을 시도하지 않는다.
- OTP는 발급 후 5분 동안만 유효하다.
- 로그인 이메일에는 서비스 식별 정보와 OTP 코드를 포함한다.
- 새 OTP를 발급하면 이전 미사용 OTP도 즉시 무효화한다.
- OTP는 한 번 성공적으로 사용하면 다시 사용할 수 없다.
- `AUTH_BYPASS_ENABLED=true` 이고 이메일이 `AUTH_BYPASS_EMAILS` allowlist에 있어도, bypass는 loopback/local origin에서만 OTP 입력 없는 로그인으로 허용한다.
- bypass는 기본적으로 비활성화 상태를 유지하고, local dev / local QA에서만 명시적으로 켠다.

기본 보호 수치:
- 동일 이메일은 active cooldown cycle 안에서 최대 5회까지 대기 시간 없이 재요청할 수 있다.
- 동일 이메일의 6번째 요청부터는 5분 cooldown을 적용한다.

제한 초과 처리:
- cooldown에 걸린 재요청은 즉시 거절하고 남은 대기 시간을 안내한다.
- cooldown이 끝나면 해당 이메일의 resend burst count는 reset된다.
- 무효화되었거나 이미 사용한 OTP는 더 이상 사용할 수 없다.
- 제한 초과 응답은 계정 존재 여부를 노출하지 않는 일반화된 메시지로 반환한다.
- 제한 초과 이벤트와 반복 실패는 운영 로그에 남긴다.
- bypass 로그인 사용도 운영 로그에 남긴다.

## Session Policy
- 로그인 성공 시 backend-issued app session cookie를 사용한다.
- 같은 브라우저 프로필로 재접속하면 backend session bootstrap으로 로그인 상태를 복원한다.
- frontend는 Supabase access token / refresh token을 직접 저장하거나 갱신하지 않는다.
- 세션 절대 만료는 90일이다.
- 90일이 지나면 재로그인이 필요하다.
- 다른 브라우저, 시크릿 창, 쿠키 삭제, 로그아웃 시에는 세션이 유지되지 않는다.
- 앱 시작 시 session cookie가 있어도 `GET /api/auth/session` 또는 보호된 API 확인으로 유효성을 재검증한다.

## Environment Separation Policy
- canonical 환경 축은 `local dev / test / remote preview-development / production`이다.
- 각 환경은 secret과 mutable data target을 명시적으로 구분해야 하며, 특히 `production`은 다른 환경과 DB write target을 공유하면 안 된다.
- local dev는 local Supabase와 loopback origin을 사용한다. local runtime은 remote project를 암묵적으로 기본값으로 삼지 않는다.
- `test`는 가능하면 전용 test DB 또는 전용 test Supabase target을 사용한다. 전용 target이 아직 없을 때만 reset 가능한 local DB를 짧은 범위의 isolated run에 재사용할 수 있다.
- remote preview/development의 기본 역할은 production과 분리된 deploy/release 확인이다.
- preview/development가 **UI/deploy separation check만 수행하는 경우**, 별도 backend target을 필수로 요구하지 않는다.
- preview/development가 **backend-integrated verification**까지 수행하려면, 그때는 production과 분리된 non-production backend target을 명시적으로 연결해야 한다.
- production은 production 전용 DB/Supabase/auth origin을 사용하고, destructive verification이나 migration은 explicit target confirmation 이후에만 수행한다.
- backend-integrated verification을 수행하는 환경에서는 최소한 아래 server-side key set의 존재를 확인한다:
  - DB target: `DATABASE_URL` 또는 동등한 server DB URL
  - Supabase server target: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
  - browser bootstrap/public origin: `PUBLIC_APP_URL`
- browser에 노출 가능한 key는 public client/runtime key로 한정한다. 예: `NEXT_PUBLIC_SUPABASE_*`, `PUBLIC_KAKAO_MAP_APP_KEY`.
- bypass는 local dev 전용이다. preview/development/production에서 env가 남아 있더라도 runtime은 non-loopback bypass를 거절해야 하며, local bypass 사용은 운영 로그와 QA handoff에서 구분 가능해야 한다.

## Authorization Policy
- place 등록과 리뷰 작성은 인증된 사용자만 수행한다.
- 등록자와 리뷰 작성자 정보는 사용자 ID와 연결한다.
- backend authorization/business logic이 canonical enforcement다.
- DB 레벨 RLS는 필요 시 defense-in-depth로만 사용할 수 있으며, 제품 규칙의 primary source of truth로 삼지 않는다.
- 클라이언트에는 service role key를 노출하지 않는다.

## Search Engine Blocking
- 앱 HTML에 `noindex, nofollow` 정책을 적용한다.
- `robots.txt`는 모든 크롤링을 차단한다.
- 서버 응답에도 가능하면 `X-Robots-Tag: noindex, nofollow`를 추가한다.
- 로그인 게이트가 1차 보호선, 검색 차단 설정이 2차 보호선 역할을 한다.

## Map/API Abuse Prevention
- 지도 이동 이벤트는 debounce/throttle로 제어한다.
- 동일 정규화 주소 geocoding 결과는 캐시 우선 정책을 둔다.
- place 등록 API와 place lookup API는 rate limit을 적용한다.
- place lookup / geocoding 캐시는 bounded size + TTL 정책으로 유지해 무한 성장하지 않게 한다.
- 현재 serverless runtime의 rate limiting / cache bounding은 in-memory best-effort 1차 방어로 운영한다. cross-instance 일관성이 필요해지면 shared persistence-backed guard로 승격한다.

## Operational Rules
- 민감한 환경변수는 Vercel 환경변수와 서버 런타임에서만 사용한다.
- 브라우저에는 JavaScript SDK처럼 클라이언트 사용이 전제된 플랫폼 키만 노출한다. Kakao Map 연동 시에는 JavaScript 키를 등록된 JavaScript SDK 도메인에서만 사용하고, REST API 키·어드민 키·service role key·secret은 브라우저에 노출하지 않는다.
- 이메일 주소 로그는 전체 원문 대신 마스킹된 형태를 우선 사용한다.
- 인증 실패와 원격 조회 실패는 운영 로그로 남긴다.
- OTP 요청 제한 초과와 잘못된/만료/무효화된 코드 사용은 별도 보안 이벤트로 기록한다.
- bypass 로그인 사용, `request-otp` 수락/전달 실패는 운영 로그에서 구분 가능해야 한다.
- 실제 bypass 이메일 값은 tracked code/docs/tests/examples에 직접 쓰지 않는다.
