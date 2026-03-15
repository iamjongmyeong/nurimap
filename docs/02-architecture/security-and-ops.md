# Security And Ops

## Security Goals
- 서비스는 사내 구성원만 사용한다.
- 인증되지 않은 사용자는 앱과 API를 사용할 수 없다.
- 이메일 입력과 로그인 링크 요청 흐름은 abuse 방지 정책을 가진다.
- 검색 엔진과 외부 크롤러 노출을 최소화한다.

## Authentication Policy

### Login Gate
- 전체 앱은 로그인 뒤에만 접근 가능하다.
- 비로그인 사용자는 로그인 화면 외의 화면을 볼 수 없다.
- API도 동일하게 인증을 강제한다.

### Email Domain Restriction
- 허용 이메일 도메인은 `@nurimedia.co.kr` 하나다.
- 클라이언트에서 1차 검증한다.
- 서버와 인증 완료 후 사용자 정보에서도 다시 검증한다.
- 단, 운영자가 환경변수로 명시한 bypass 이메일 allowlist는 테스트/운영 예외로 별도 허용할 수 있다.
- bypass 이메일 목록 값 자체는 public repository에 커밋하지 않고 환경변수에서만 관리한다.

### Login Link Policy
- 이메일 로그인 링크 방식만 지원한다.
- 허용 도메인이 아니면 로그인 링크 발송을 시도하지 않는다.
- 로그인 전용 URL은 발급 후 5분 동안만 유효하다.
- 로그인 이메일에는 로그인 전용 URL을 포함한다.
- 로그인 전용 URL은 직접 로그인에 사용할 수 있다.
- 새 로그인 링크를 발급하면 이전 로그인 전용 URL도 즉시 무효화한다.
- 로그인 전용 URL은 한 번 사용하면 다시 사용할 수 없다.
- `AUTH_BYPASS_ENABLED=true` 이고 이메일이 `AUTH_BYPASS_EMAILS` allowlist에 있으면 로그인 링크 클릭 없이 즉시 로그인할 수 있다.
- bypass는 기본적으로 비활성화 상태를 유지하고, 필요한 환경에서만 명시적으로 켠다.

기본 보호 수치:
- 동일 이메일은 active cooldown cycle 안에서 최대 5회까지 대기 시간 없이 재요청할 수 있다.
- 동일 이메일의 6번째 요청부터는 5분 cooldown을 적용한다.

제한 초과 처리:
- cooldown에 걸린 재요청은 즉시 거절하고 남은 대기 시간을 안내한다.
- cooldown이 끝나면 해당 이메일의 resend burst count는 reset된다.
- 무효화되었거나 이미 사용한 로그인 전용 URL은 더 이상 사용할 수 없다.
- 제한 초과 응답은 계정 존재 여부를 노출하지 않는 일반화된 메시지로 반환한다.
- 제한 초과 이벤트와 반복 실패는 운영 로그에 남긴다.
- bypass 로그인 사용도 운영 로그에 남긴다.

## Session Policy
- 로그인 성공 시 Supabase 세션을 브라우저 저장소에 영속 저장한다.
- 같은 브라우저 프로필로 재접속하면 저장된 세션을 읽는다.
- access token이 만료되면 refresh token으로 자동 갱신한다.
- 세션 절대 만료는 90일이다.
- 90일이 지나면 재로그인이 필요하다.
- 다른 브라우저, 시크릿 창, 저장소 삭제, 로그아웃 시에는 세션이 유지되지 않는다.
- 앱 시작 시 저장 세션이 있어도 `getUser()` 또는 보호된 API 확인으로 유효성을 재검증한다.

Supabase 설정 기본안:
- `persistSession: true`
- `autoRefreshToken: true`
- `SESSIONS_TIMEBOX = 2160 hours`
- `SESSIONS_INACTIVITY_TIMEOUT = 0`
- `SESSIONS_SINGLE_PER_USER = false`

## Authorization Policy
- place 등록, 리뷰 작성, 추천은 인증된 사용자만 수행한다.
- 등록자와 리뷰 작성자 정보는 사용자 ID와 연결한다.
- DB 레벨에서는 RLS를 전제로 한다.
- 클라이언트에는 service role key를 노출하지 않는다.

## Search Engine Blocking
- 앱 HTML에 `noindex, nofollow` 정책을 적용한다.
- `robots.txt`는 모든 크롤링을 차단한다.
- 서버 응답에도 가능하면 `X-Robots-Tag: noindex, nofollow`를 추가한다.
- 로그인 게이트가 1차 보호선, 검색 차단 설정이 2차 보호선 역할을 한다.

## Map/API Abuse Prevention
- 지도 이동 이벤트는 debounce/throttle로 제어한다.
- 동일 정규화 주소 geocoding 결과는 캐시 우선 정책을 둔다.
- place 등록 API는 rate limit을 적용한다.

## Operational Rules
- 민감한 환경변수는 Vercel 환경변수와 서버 런타임에서만 사용한다.
- 브라우저에는 공개 가능한 Kakao Map key만 노출한다.
- 이메일 주소 로그는 전체 원문 대신 마스킹된 형태를 우선 사용한다.
- 인증 실패와 원격 조회 실패는 운영 로그로 남긴다.
- 로그인 링크 요청 제한 초과와 무효/만료 링크 사용은 별도 보안 이벤트로 기록한다.
