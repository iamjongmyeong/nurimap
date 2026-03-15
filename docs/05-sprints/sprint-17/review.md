# Sprint Summary

- Sprint 17에서는 최소 hybrid routing 기반으로 canonical detail path(`/places/:placeId`)와 canonical auth verify path(`/auth/verify`)를 도입하면서, 기존 app-shell surface와 `place_add_open` internal state를 유지했다.
- 동시에 auth refresh / hard refresh 무한 로딩 가능성, verify-link failure UX, 로그인 링크 재전송 정책, Kakao map runtime fallback UX를 함께 정리해 production 진입 경계를 안정화했다.
- 구현 후 automated checks, browser automation QA, lint, build는 모두 통과했고, 현재 상태는 **조건부 통과**다. 남은 항목은 deployed 환경의 실제 이메일/hard refresh/user QA 확인이다.

# Completed

- `/places/:placeId` direct entry, refresh, browser back, detail back이 동작하도록 canonical detail path를 구현했다.
- desktop에서는 sidebar detail, mobile에서는 full-screen detail contract를 유지했다.
- `place_add_open`과 `mobile_place_list_open`은 계속 internal UI state로 유지했고, 장소 등록 성공 후에는 canonical detail path로 이동하도록 정리했다.
- auth flow에 `request-link`, `verify-link` timeout 보호를 추가해 `loading` / `verifying` 무한 지속 가능성을 줄였다.
- auth nonce 소비 시점을 `verify-link` 즉시 소모가 아니라 session adoption 성공 뒤 `consume-link` 단계로 분리해, fresh link가 미리 `used`로 처리되는 문제를 줄였다.
- `/auth/verify` canonical entry와 legacy `/?auth_mode=verify...` query를 병행 지원하도록 구현했다.
- auth verify failure reason을 아래 한국어 문구로 고정했다.
  - `expired` → `로그인 링크가 만료됐어요.\n새 로그인 링크를 받아주세요.`
  - `used` → `이미 사용한 링크예요.\n새 로그인 링크를 받아주세요.`
  - `invalidated` → `로그인 링크가 만료됐어요.\n새 로그인 링크를 받아주세요.`
- auth failure screen은 브랜드 영역 + `인증에 실패했어요 🥲` 제목 + 2줄 본문 + 세로 CTA(`새 링크 받기`, `이메일 다시 입력`) 기준으로 다시 정렬했다.
- generic auth failure 문구를 `인증에 실패했어요. 로그인 링크를 다시 받아주세요.`로 통일했다.
- 로그인 링크 재전송 정책을 `burst 5회 허용 -> 6번째부터 5분 cooldown`으로 변경했고, cooldown 문구를 `MM분 SS초 후에 다시 시도해주세요.` / `SS초 후에 다시 시도해주세요.` 형식으로 정리했다.
- runtime map loading/failure UX를 아래 기준으로 정리했다.
  - loading: 약한 placeholder 배경 + spinner + `지도를 불러오는 중이에요.`
  - failure/unavailable: `지도를 불러오지 못했어요.`, `네트워크 상태를 확인한 뒤 다시 시도해주세요.`, `다시 시도`
- test/JSDOM용 deterministic fallback renderer는 유지하되, runtime user-facing fallback과 역할을 분리했다.
- deployed `/api/place-entry`가 unexpected error 시 HTML server error 대신 JSON 500을 반환하도록 hardening했고, `api/**` 상대 import의 explicit `.js` specifier regression guard를 추가했다.
- auth nonce 소비 시점은 `verify-link` 즉시 소모가 아니라 `consume-link` finalize 단계로 분리해, fresh link가 다른 세션에서 곧바로 `used`가 되는 문제를 줄였다.
- request-link 단계별 timing, Resend acceptance metadata, delivery failure details를 운영 로그에 남기도록 관측성을 보강했다.
- Sprint 17 source-of-truth 문서와 decision log를 갱신했다.
- Browser Automation QA를 수행하고 `artifacts/qa/sprint-17/`에 증빙을 남겼다.

# Not Completed

- deployed 환경에서 실제 로그인 메일 수신 후 `/auth/verify` 링크 클릭 / 재전송 / 이전 링크 invalidation UX를 아직 확인하지 않았다.
- macOS 브라우저에서 `Command + Shift + R` hard refresh 재현 결과를 아직 기록하지 않았다.
- deployed 환경에서 Kakao SDK 차단/실패 상황의 체감 fallback UX를 아직 확인하지 않았다.
- `docs/06-history/decisions.md`의 신규 Sprint 17 entry들은 아직 `Related commit: TBD` 상태다.

# Carry-over

- deployed 환경 User QA
  - 실제 이메일 링크 수신/클릭
  - 재전송 후 이전 링크 invalidation UX
  - macOS hard refresh
  - 실제 Kakao runtime failure 체감 확인
- Sprint 종료/커밋 시점에 `docs/06-history/decisions.md`의 `Related commit` 갱신
- 필요 시 preview/deployed env 관찰 결과를 기준으로 auth/map copy 또는 density를 미세 조정

# Change Outcomes
- CHG-01 Minimal hybrid routing with canonical detail URL — completed
- CHG-02 Auth bootstrap hardening and verify-route migration — completed
- CHG-03 Auth resend policy and UX writing update — completed
- CHG-04 Map runtime loading/failure fallback UX clarification — completed

# Risks

- 이번 Sprint에서는 필요한 주소 체계만 가볍게 직접 연결하는 방식으로 구현했다. 현재 범위에서는 충분하지만, 앞으로 주소 기반 화면이 더 많아지면 아래 개선 방향을 다시 검토할 수 있다.
  - 전용 라우터 도입
  - 로그인 전/후 화면 분리
  - URL 상태와 내부 UI 상태 역할 분리
  - 공통 레이아웃 단위로 화면 구조화
  - 잘못된 주소 / 없는 페이지 처리 추가
  - 화면별 데이터 로딩/에러 처리 정리
- auth verify failure UX와 timeout convergence는 automated/browser scope에서는 통과했지만, 실제 배포 환경의 메일 client/redirect/path 조합에서 차이가 남아 있을 수 있다.
- Kakao SDK runtime failure는 브라우저 자동화로 request abort 시나리오를 검증했지만, 실제 사용자 네트워크/확장 프로그램/차단 환경에서는 다른 failure signature가 나올 수 있다.

# Retrospective

- routing, auth, map fallback을 멀티 에이전트로 분할한 뒤 리더가 통합/재검증하는 방식이 이번 Sprint에서는 효과적이었다.
- 브라우저 자동화 QA를 실제로 돌리면서 auth verify failure가 dev 환경에서 로그인 폼으로 덮이는 회귀를 발견했고, 코드/테스트를 바로 보강할 수 있었다. 이 경험상 auth와 route 경계 작업에는 browser automation을 계속 유지하는 것이 가치가 크다.
- source-of-truth 문서와 decision log를 구현 전에 먼저 고정해 둔 덕분에, 기능/UX/QA 기준을 서로 맞추기가 쉬웠다.
