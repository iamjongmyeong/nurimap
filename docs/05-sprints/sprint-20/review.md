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
- `test` 전용 target 또는 reset 전략 명확화
- 사용자 직접 QA handoff 종료
- current local commits push 여부 결정 및 실행

# Carry-over

- preview/development 환경에 core Supabase/Postgres env를 채울지, 아니면 별도 remote dev/test target을 둘지 먼저 확정한다.
- `test`는 당분간 reset 가능한 local DB reuse로 갈지, dedicated `TEST_DATABASE_URL` / separate target으로 승격할지 결정한다.
- target project / env / migration checklist를 확인한 뒤 remote dev/test rollout 여부를 결정한다.
- 필요하면 local auto-login bypass를 끈 browser run으로 email OTP request/verify path를 추가 증빙한다.
- 사용자에게 auth UX, empty-state browse, overwrite 체감 확인을 handoff한다.
- local evidence 정리 후 push 여부를 결정한다.

# Environment Readiness Snapshot

| Environment | Current Status | Evidence | Next Step |
|---|---|---|---|
| local dev | READY | local Supabase health, `make check`, Playwright local runtime QA 완료 | 현재 baseline 유지 |
| test | PARTIAL | 코드가 `TEST_DATABASE_URL` 계열 분기를 지원하지만 local env에는 dedicated test target이 없음 | reset 가능한 local DB reuse 정책 또는 dedicated test target 중 하나로 고정 |
| preview / development | NOT READY | 2026-03-22 `vercel env ls preview/development` 기준 core backend env 없이 `PUBLIC_APP_URL`, bypass, Kakao, Resend만 존재 | Supabase/DB target과 env set을 먼저 구성 |
| production | CONFIGURED / PROTECTED | 2026-03-22 `vercel env ls production` 기준 core Supabase/Postgres env 존재 | explicit approval 전까지 rollout/migration 보류 |

# Remote Rollout Gate

- 아래가 모두 충족되기 전에는 remote dev/test rollout을 시작하지 않는다.
  1. target project 이름/ID를 명시했다.
  2. target이 production이 아님을 재확인했다.
  3. `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, DB target, `PUBLIC_APP_URL`, public Supabase key set이 준비됐다.
  4. migration 적용 순서와 stop condition을 적었다.
  5. auth -> browse -> create -> overwrite -> logout smoke scope를 적었다.
  6. 결과를 Sprint 20 `qa.md` / `review.md`에 남길 준비가 됐다.

# Risks

- local bypass auto-login이 일반 email OTP UI regression을 가릴 수 있다.
- preview/development에 core backend env가 없는 상태에서 rollout을 시도하면 실제로는 production만 유효 target이 되어 `dev / test / production` 분리가 흔들릴 수 있다.
- `test` target을 명시하지 않은 채 destructive verification을 늘리면 local validation과 test semantics가 섞일 수 있다.
- recommendation은 현재 제거 상태지만, 이후 follow-up에서 실수로 재도입될 위험은 계속 감시해야 한다.

# Retrospective

- integrated `make dev` entrypoint로 바꾸니 UI 확인 루프와 backend-inclusive QA 루프가 분리되지 않아 다음 검증이 단순해졌다.
- clean DB + Playwright evidence를 먼저 확보하니 empty-state, persistence, overwrite contract를 사람 기억이 아니라 산출물로 남길 수 있었다.
- Vercel env를 실제로 조회해 보니 production은 구성돼 있지만 preview/development는 backend target이 비어 있어, “remote rollout readiness”를 추상적으로 두지 않고 구체적 blocker로 남길 수 있었다.
- 이번 Sprint는 local runtime 완성도는 높아졌지만, remote rollout과 explicit OTP path 증빙을 별도 slice로 남겨두는 편이 안전하다.
