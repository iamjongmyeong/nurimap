# Sprint Summary

- Sprint 20은 Nurimap의 mock/auth runtime을 backend-owned real-data runtime으로 전환하는 실행 brief다.
- 구현 기준의 상세 SSOT는 `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md`와 관련 PRD/test spec이다.
- 현재 local Supabase 기준으로 auth/session/place/review가 backend-owned runtime으로 동작하고, integrated `make dev` / `make agentation` 진입점도 정리됐다.
- browser automation evidence까지 수집했지만, remote rollout과 사용자 직접 QA는 아직 남아 있다.

# Completed

- `docs/05-sprints/sprint-20/planning.md`, `qa.md`, `review.md`를 생성하고 현재 실행 상태에 맞게 갱신했다.
- source-of-truth docs lock과 `.omx` plan/PRD/test spec consensus를 기준으로 Sprint 20 범위를 고정했다.
- backend-owned auth cookie/session bootstrap, name save, logout, place list/detail, place create, review overwrite local runtime을 구현했다.
- local Supabase migration을 적용하고 local DB에서 browse empty state -> place create -> detail -> overwrite 흐름을 확인했다.
- `make dev`를 integrated local runtime entrypoint로, `make agentation`을 같은 runtime + Agentation entrypoint로 정리했다.
- `make check`와 Playwright browser pass를 실행해 local verification evidence를 `artifacts/qa/sprint-20/`에 저장했다.

# Not Completed

- remote dev/test target 확정 및 rollout
- explicit email OTP request/verify UI의 별도 browser evidence
- 사용자 직접 QA handoff 종료
- current local commits push 여부 결정 및 실행

# Carry-over

- target project / env / migration checklist를 확인한 뒤 remote dev/test rollout 여부를 결정한다.
- 필요하면 local auto-login bypass를 끈 browser run으로 email OTP request/verify path를 추가 증빙한다.
- 사용자에게 auth UX, empty-state browse, overwrite 체감 확인을 handoff한다.
- local evidence 정리 후 push 여부를 결정한다.

# Risks

- local bypass auto-login이 일반 email OTP UI regression을 가릴 수 있다.
- remote env 값이나 migration target 확인 없이 rollout하면 `dev / test / production` 분리가 흔들릴 수 있다.
- recommendation은 현재 제거 상태지만, 이후 follow-up에서 실수로 재도입될 위험은 계속 감시해야 한다.

# Retrospective

- integrated `make dev` entrypoint로 바꾸니 UI 확인 루프와 backend-inclusive QA 루프가 분리되지 않아 다음 검증이 단순해졌다.
- clean DB + Playwright evidence를 먼저 확보하니 empty-state, persistence, overwrite contract를 사람 기억이 아니라 산출물로 남길 수 있었다.
- 이번 Sprint는 local runtime 완성도는 높아졌지만, remote rollout과 explicit OTP path 증빙을 별도 slice로 남겨두는 편이 안전하다.
