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

- explicit email OTP request/verify UI의 별도 browser evidence
- Preview deploy/UI smoke evidence 확보
- dedicated test target 승격 여부 재검토
- 사용자 직접 QA handoff 종료
- current local commits push 여부 결정 및 실행

# Carry-over

- Preview는 현재 slice에서 deploy/UI separation check로 유지하고, real backend-integrated Preview는 future trigger가 생길 때만 별도 slice로 연다.
- `test`는 당분간 reset 가능한 local DB reuse 모델로 유지하고, remote dev/test rollout이 안정화되면 dedicated `TEST_DATABASE_URL` / separate target 승격을 재검토한다.
- Preview smoke는 시도했지만 Vercel Hobby function limit blocker가 발생했다. 이 blocker를 해소할지, 현재 sprint에서는 blocker로 기록한 채 넘길지 결정한다.
- 필요하면 local auto-login bypass를 끈 browser run으로 email OTP request/verify path를 추가 증빙한다.
- 사용자에게 auth UX, empty-state browse, overwrite 체감 확인을 handoff한다.
- local evidence 정리 후 push 여부를 결정한다.

# Environment Readiness Snapshot

| Environment | Current Status | Evidence | Next Step |
|---|---|---|---|
| local dev | READY | local Supabase health, `make check`, Playwright local runtime QA 완료 | 현재 baseline 유지 |
| test | PARTIAL / CONTROLLED | 코드가 `TEST_DATABASE_URL` 계열 분기를 지원하지만 local env에는 dedicated test target이 없음 | 당분간 reset 가능한 local DB reuse 정책 유지, 추후 dedicated target 승격 재검토 |
| preview / development | BLOCKED FOR DEPLOY SMOKE | 2026-03-22 `vercel env ls preview/development` 기준 core backend env 없이 `PUBLIC_APP_URL`, bypass, Kakao, Resend만 존재. `pnpm exec vercel deploy --yes`는 Hobby function limit에서 차단됨 | blocker 해소 여부를 결정하기 전까지 Preview evidence는 추가 확보 불가 |
| production | CONFIGURED / PROTECTED | 2026-03-22 `vercel env ls production` 기준 core Supabase/Postgres env 존재 | explicit approval 전까지 rollout/migration 보류 |

## Env Matrix (presence only)

| Key Group | local dev (`.env.local`) | test | preview / development | production | Notes |
|---|---|---|---|---|---|
| server DB target (`DATABASE_URL` or equivalent) | present | dedicated target 없음 | missing | present | runtime code는 `DATABASE_URL`/`POSTGRES_URL` 계열을 허용 |
| dedicated test DB target (`TEST_DATABASE_URL` or equivalent) | missing | not configured | n/a | n/a | 현재는 reset 가능한 local DB reuse 모델 |
| Supabase server target (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) | present | local reuse | missing | present | current slice에서는 Preview backend를 쓰지 않으므로 future expansion 시에만 필요 |
| public Supabase runtime (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | present | local reuse | missing | present | current slice의 Preview smoke에는 필수 아님; future backend-integrated Preview에서 필요 |
| app public origin (`PUBLIC_APP_URL`) | present | local reuse | present | present | auth redirect / link wrapper 기준 |
| bypass (`AUTH_BYPASS_ENABLED`, `AUTH_BYPASS_EMAILS`) | present | local reuse | present | present | 기본 posture는 disabled여야 하지만 현재 env는 존재 |
| local auto-login (`VITE_LOCAL_AUTO_LOGIN*`) | present | local-only | n/a | n/a | local QA 편의용, browser OTP evidence를 가릴 수 있음 |

## Preview Role Decision

- 현재 slice에서 Vercel Preview의 역할은 **deploy/UI separation check**다.
- 따라서 Preview는 지금 당장 real backend-integrated target을 요구하지 않는다.
- real backend-integrated Preview가 필요해지는 경우는 future trigger로 미룬다:
  - Preview에서 실제 auth/backend write까지 release gate로 검증해야 할 때
  - local-only verification으로는 협업/릴리즈 신뢰도가 부족해질 때
  - shared non-production state가 꼭 필요해질 때
- 다만 현재 Vercel Hobby plan에서는 preview deployment 자체가 `12 Serverless Functions limit`에 걸려 smoke evidence 확보가 차단된 상태다.

# Remote Rollout Gate

- 아래가 모두 충족되기 전에는 Preview를 “release confidence에 의미 있는 smoke”로 간주하지 않는다.
  1. Preview deployment가 성공한다.
  2. `/`가 crash 없이 auth/app shell까지 부팅된다.
  3. `/places/:placeId` rewrite가 app shell로 정상 연결된다.
  4. 주요 static asset boot가 깨지지 않는다.
  5. 결과를 Sprint 20 `qa.md` / `review.md`에 기록한다.

# Current Decision

- **Push:** deferred
  - 이유: Preview backend readiness 여부와 무관하게, `main` push의 실제 deploy impact를 아직 안전하다고 확정하지 않았고 사용자 QA도 아직 닫히지 않았다.
  - 추가 이유: 현재 Preview deployment 시도 자체가 Vercel Hobby function limit에 막혀 pre-release smoke confidence를 확보하지 못했다.
- **Remote non-production backend rollout:** deferred
  - 이유: 현재 slice의 합의된 전략은 local-first canonical verification이며, remote backend-integrated Preview는 future trigger가 생길 때까지 요구하지 않는다.
- **Current safe posture:** local verified baseline을 유지하고, Preview는 UI/deploy separation smoke로만 사용하며, 필요 시 이후 slice에서 remote backend integration을 다시 연다.

# Risks

- local bypass auto-login이 일반 email OTP UI regression을 가릴 수 있다.
- Preview를 backend-integrated 환경처럼 오해하면, 현재 없는 backend env 때문에 잘못된 blocker 판단이나 과도한 인프라 작업으로 이어질 수 있다.
- Preview deploy 자체가 Vercel Hobby function limit에 막혀 있어, 현재는 deploy/UI separation smoke조차 충분히 증명하지 못한다.
- dedicated test target 없이 destructive verification을 늘리면 local validation과 test semantics가 섞일 수 있다. 현재는 reset 가능한 local DB reuse 범위로만 제한한다.
- recommendation은 현재 제거 상태지만, 이후 follow-up에서 실수로 재도입될 위험은 계속 감시해야 한다.

# Retrospective

- integrated `make dev` entrypoint로 바꾸니 UI 확인 루프와 backend-inclusive QA 루프가 분리되지 않아 다음 검증이 단순해졌다.
- clean DB + Playwright evidence를 먼저 확보하니 empty-state, persistence, overwrite contract를 사람 기억이 아니라 산출물로 남길 수 있었다.
- Vercel env를 실제로 조회해 보니 production은 구성돼 있지만 preview/development는 backend target이 비어 있었다. 이걸 “즉시 해결해야 할 blocker”가 아니라 “Preview 역할을 명확히 다시 정의해야 할 신호”로 재해석한 것이 유효했다.
- Preview deploy를 실제로 시도해 보니, 전략 문제와 별개로 Vercel Hobby function limit이 별도 blocker라는 점이 드러났다.
- 이번 Sprint는 local runtime 완성도는 높아졌지만, remote rollout과 explicit OTP path 증빙을 별도 slice로 남겨두는 편이 안전하다.
