# Sprint Summary

- Sprint 18에서는 Nurimap auth의 canonical contract를 magic link에서 6자리 email OTP로 전환했다.
- 서버 경계는 `POST /api/auth/request-otp`와 OTP-era `app_metadata.nurimap_auth` bookkeeping으로 정리했고, 클라이언트는 `auth_required -> otp_required -> verifying -> auth_failure|name_required|authenticated` 흐름으로 재구성했다.
- legacy `verify-link` / `consume-link`는 normal auth path가 아니라 explicit fallback/410 route로 축소했다.

# Completed

- live source-of-truth 문서를 OTP 기준으로 정렬했다.
- server auth policy / service와 `api/_lib/*` duplicated boundary를 OTP request 기준으로 전환했다.
- canonical request route `POST /api/auth/request-otp`를 추가했다.
- bypass flow와 protected API `verifyAccessToken` 계약을 유지했다.
- client auth context / AuthProvider / test harness를 OTP flow 기준으로 재구성했다.
- auth regression test suite, 전체 vitest suite, lint, build를 통과했다.

# Not Completed

- browser automation evidence 수집은 아직 하지 않았다.
- deployed 환경의 실제 이메일 수신/OTP 로그인 검증은 아직 하지 않았다.

# Carry-over

- browser automation으로 Sprint 18 auth flow를 캡처하고 `artifacts/qa/sprint-18/` 증빙을 남긴다.
- deployed 환경의 live email verification과 hard refresh 체감 확인은 사용자 QA handoff로 넘긴다.

# Change Outcomes
- CHG-01 Auth source-of-truth OTP cutover — completed
- CHG-02 Server auth boundary immediate cutover — completed
- CHG-03 Client auth phase / UI / legacy cleanup — completed

# Risks

- 현재 ops logger event name은 여전히 `auth.request_link.*`를 사용해, 런타임 의미는 OTP지만 로그 네이밍은 legacy 흔적이 남아 있다.
- `request-link` alias route를 남겨 두었기 때문에 canonical contract는 `request-otp`지만, 완전 제거 전까지는 compatibility path가 존재한다.
- live deployed 환경의 실제 전달성/스팸 분류/코드 입력 UX는 아직 사용자 확인이 필요하다.

# Retrospective

- auth mode 전환은 문서 계약 고정 -> server boundary -> client state machine -> legacy cleanup 순서로 진행하니 혼선이 적었다.
- `omx team`은 dirty worktree safety gate 때문에 바로 쓰기 어려웠고, 이번 작업은 단일 에이전트 + bounded subagent 방식이 더 실용적이었다.
- local bypass와 auto-login을 미리 꺼 두고 baseline 테스트를 먼저 확보한 것이 OTP 전환 중 회귀 판단에 도움이 됐다.
