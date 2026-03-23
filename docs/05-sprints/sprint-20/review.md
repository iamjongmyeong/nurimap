# Sprint Summary

- Sprint 20은 Nurimap의 mock/auth runtime을 backend-owned real-data runtime으로 전환하는 실행 brief다.
- 구현 기준의 상세 SSOT는 `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md`와 관련 PRD/test spec이며, Preview blocker 해소 실행은 `.omx/plans/plan-sprint-20-vercel-function-limit-consensus.md`를 따랐다.
- 현재 local Supabase 기준으로 auth/session/place/review가 backend-owned runtime으로 동작하고, integrated `make dev` / `make agentation` 진입점도 정리됐다.
- Preview deployment는 구조 수정 후 다시 성공했고, authenticated `vercel curl` smoke로 `/`, `/places/:placeId`, static asset boot까지 확인했다. 현재 남은 sprint-level 항목은 사용자 직접 QA와 push 판단이다.
- browse 지도 surface에서는 별도 level HUD / zoom button을 제거해 지도 chrome을 더 단순하게 정리했다.
- browse 지도 surface의 사용자 추가 장소 marker / label은 Figma handoff(node `61:18`) 기준으로 concentric marker + outlined name label 스타일로 새로 정리했다.
- auth first-login slice에서는 첫 로그인 OTP 요청을 implicit signup 대신 server pre-provision + normal OTP delivery로 고정했고, verify 단계의 허용 이메일 경계를 다시 검사하도록 보강했다.
- 2026-03-24 production auth recovery slice에서는 login failure 원인을 deploy alias, TLS/env, DB schema gate로 분리해 추적했고, root cert rollout + phase1 migration 적용 뒤 production login success를 확인했다.

# Completed

- `docs/05-sprints/sprint-20/planning.md`, `qa.md`, `review.md`를 생성하고 현재 실행 상태에 맞게 갱신했다.
- source-of-truth docs lock과 `.omx` plan/PRD/test spec consensus를 기준으로 Sprint 20 범위를 고정했다.
- backend-owned auth cookie/session bootstrap, name save, logout, place list/detail, place create, review overwrite local runtime을 구현했다.
- local Supabase migration을 적용하고 local DB에서 browse empty state -> place create -> detail -> overwrite 흐름을 확인했다.
- `make dev`를 integrated local runtime entrypoint로, `make agentation`을 같은 runtime + Agentation entrypoint로 정리했다.
- `make check`와 Playwright browser pass를 실행해 local verification evidence를 `artifacts/qa/sprint-20/`에 저장했다.
- local Mailpit 기반 OTP request -> verify -> name entry browser evidence를 추가 확보했다.
- Preview blocker resolution slice에서 `api/` 밖으로 API route tests 5개를 이동하고 `.vercelignore`를 추가해 deploy surface를 정리했다.
- structural fix 이후 `pnpm exec vercel deploy --yes`가 성공했고, before/after API inventory, Preview smoke evidence, deploy log를 `artifacts/qa/sprint-20/`에 저장했다.
- authenticated `pnpm exec vercel curl` smoke로 Preview root, `/places/smoke-place` rewrite, built JS asset 응답을 확인했다.
- 2026-03-23 auth hotfix slice에서 일반 OTP request/verify를 publishable auth client 경로로 복구하고, bypass와 분리된 `AUTH_ALLOWED_EMAILS` exact allowlist 정책을 추가했다.
- 2026-03-23 auth hardening slice에서 first-login OTP는 `auth.admin.createUser` pre-provision 뒤 `signInWithOtp({ shouldCreateUser: false })`로 보내도록 바꾸고, provisioning failure를 canonical `delivery_failed` 응답으로 수렴시켰다.
- 같은 slice에서 `verifyLoginOtp`는 verified email에 대해 허용 도메인 / explicit allowlist / local bypass 경계를 다시 확인한 뒤에만 app session을 발급하도록 보강했고, focused auth tests + build를 다시 green으로 맞췄다.
- confirmation-enabled disposable local Supabase 실험으로, hosted `Confirm sign up` 템플릿을 `{{ .Token }}` 기반 OTP UX로 바꾸는 option 1이 current `verifyOtp({ email, token, type: 'email' })` 계약과 양립 가능함을 검증했다.
- browse 지도 surface에서 level HUD / zoom button을 제거하고, 관련 map rendering/runtime 문서와 테스트를 함께 갱신했다.
- browse 지도 surface에서 사용자 추가 장소 marker / label visual refresh를 반영하고, focused browse/registration tests와 marker preview artifact를 추가했다.
- TLS root-cert handling 수정(commit `078b57c`)을 production deploy에 반영하고, linked `supabase db push`로 `20260322065245_phase1_place_auth_real_data_foundation.sql`을 exact production project에 적용했다.
- production incident 분석 결과, auth/login rollout은 코드 배포·runtime env·DB schema를 각각 별도 gate로 봐야 하며, 실제 blocker가 `SELF_SIGNED_CERT_IN_CHAIN` → `relation "public.user_profiles" does not exist` 순으로 이동했다.
- 2026-03-24 production에서 user-confirmed login success를 확인했다.

# Not Completed

- Preview public-access policy 결정 여부
- dedicated test target 승격 여부 재검토
- 사용자 직접 QA handoff 종료
- public schema hardening migration rollout

# Carry-over

- Preview는 현재 slice에서 deploy/UI separation check로 유지하고, real backend-integrated Preview는 future trigger가 생길 때만 별도 slice로 연다.
- `test`는 당분간 reset 가능한 local DB reuse 모델로 유지하고, remote dev/test rollout이 안정화되면 dedicated `TEST_DATABASE_URL` / separate target 승격을 재검토한다.
- Preview deploy 자체는 이제 성공하고 authenticated smoke도 가능하지만, direct anonymous 접근은 Vercel 로그인 페이지(HTTP 401)로 보호된다. 다음 slice에서는 public smoke를 따로 열지, 현재의 protected smoke 절차를 release gate로 유지할지 결정해야 한다.
- 사용자에게 auth UX, empty-state browse, overwrite 체감 확인을 handoff한다.
- auth/session server-only tables에 대한 RLS / revoke 또는 private schema hardening rollout을 별도 후속 작업으로 마무리한다.
- hosted Supabase confirmation template를 OTP UX로 맞추는 option 1은 follow-up rollout 후보로 남긴다. local confirmation-enabled matrix 결과는 `.omx/plans/result-option-1-confirmation-template-otp-ux-validation.md`를 따른다.

# Environment Readiness Snapshot

| Environment | Current Status | Evidence | Next Step |
|---|---|---|---|
| local dev | READY | local Supabase health, `make check`, Playwright local runtime QA 완료 | 현재 baseline 유지 |
| test | PARTIAL / CONTROLLED | 코드가 `TEST_DATABASE_URL` 계열 분기를 지원하지만 local env에는 dedicated test target이 없음 | 당분간 reset 가능한 local DB reuse 정책 유지, 추후 dedicated target 승격 재검토 |
| preview / development | DEPLOYABLE / SMOKE VERIFIED (AUTH-PROTECTED) | 2026-03-22 structural fix 후 `pnpm exec vercel deploy --yes` 성공, `vercel curl /`, `vercel curl /places/smoke-place`, built asset 200 확인. direct anonymous 접근은 Vercel login wall(401)로 보호됨 | Preview smoke access policy 결정 (public vs protected-auth smoke) |
| production | AUTH RECOVERY VERIFIED | 2026-03-24 TLS root-cert rollout, linked `supabase db push`, user-confirmed login success | auth hardening migration과 rollout gate 문서화 유지 |

## Env Matrix (presence only)

| Key Group | local dev (`.env.local`) | test | preview / development | production | Notes |
|---|---|---|---|---|---|
| server DB target (`DATABASE_URL` or equivalent) | present | dedicated target 없음 | missing | present | runtime code는 `DATABASE_URL`/`POSTGRES_URL` 계열을 허용 |
| dedicated test DB target (`TEST_DATABASE_URL` or equivalent) | missing | not configured | n/a | n/a | 현재는 reset 가능한 local DB reuse 모델 |
| Supabase server target (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) | present | local reuse | missing | present | current slice에서는 Preview backend를 쓰지 않으므로 future expansion 시에만 필요 |
| public Supabase runtime (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) | present | local reuse | missing | present | current slice의 Preview smoke에는 필수 아님; future backend-integrated Preview에서 필요 |
| app public origin (`PUBLIC_APP_URL`) | present | local reuse | present | present | auth redirect / link wrapper 기준 |
| bypass (`AUTH_BYPASS_ENABLED`, `AUTH_BYPASS_EMAILS`) | present | local reuse | present | present | env는 존재할 수 있지만 runtime bypass success path는 local loopback에서만 허용 |
| local auto-login (`VITE_LOCAL_AUTO_LOGIN*`) | present | local-only | n/a | n/a | local QA 편의용, browser OTP evidence를 가릴 수 있음 |

## Preview Role Decision

- 현재 slice에서 Vercel Preview의 역할은 **deploy/UI separation check**다.
- 따라서 Preview는 지금 당장 real backend-integrated target을 요구하지 않는다.
- real backend-integrated Preview가 필요해지는 경우는 future trigger로 미룬다:
  - Preview에서 실제 auth/backend write까지 release gate로 검증해야 할 때
  - local-only verification으로는 협업/릴리즈 신뢰도가 부족해질 때
  - shared non-production state가 꼭 필요해질 때
- 현재는 structural fix 이후 preview deployment 자체가 가능하고, Vercel CLI `vercel curl` 경로로는 protected smoke도 수행할 수 있다. 남은 정책 질문은 anonymous/public smoke를 별도로 열 필요가 있는지 여부다.

# Remote Rollout Gate

- 아래가 모두 충족되기 전에는 Preview를 “release confidence에 의미 있는 smoke”로 간주하지 않는다.
1. Preview deployment가 성공한다.
2. `/`가 crash 없이 auth/app shell까지 부팅된다.
3. `/places/:placeId` rewrite가 app shell로 정상 연결된다.
4. 주요 static asset boot가 깨지지 않는다.
5. 결과를 Sprint 20 `qa.md` / `review.md`에 기록한다.

- 현재 slice 기준으로는 1~5를 authenticated `vercel curl` smoke와 sprint docs sync로 충족했다.

# Current Decision

- **Push:** executed
  - TLS root-cert handling fix commit `078b57c`를 `main`에 push했고, production alias는 2026-03-24 00:22:55 KST deployment를 가리켰다.
- **Remote non-production backend rollout:** deferred
  - 이유: 현재 slice의 합의된 전략은 local-first canonical verification이며, remote backend-integrated Preview는 future trigger가 생길 때까지 요구하지 않는다.
- **Current safe posture:** local verified baseline + production auth recovery baseline을 유지하고, Preview는 UI/deploy separation smoke로만 사용하며, auth production rollout은 code/env/schema/smoke gate를 모두 확인한다.

# Risks

- local bypass auto-login이 일반 email OTP UI regression을 가릴 수 있다.
- Preview를 backend-integrated 환경처럼 오해하면, 현재 없는 backend env 때문에 잘못된 blocker 판단이나 과도한 인프라 작업으로 이어질 수 있다.
- Preview deploy는 가능해졌고 protected smoke도 가능하지만, plain browser/curl만 보면 Vercel protection wall이 먼저 보여 future reviewers가 blocker를 오해할 수 있다.
- bypass env가 남아 있어도 non-local runtime은 bypass를 거절하도록 hardened 되었으므로, env presence만으로 auth bypass risk를 판단하면 안 된다.
- dedicated test target 없이 destructive verification을 늘리면 local validation과 test semantics가 섞일 수 있다. 현재는 reset 가능한 local DB reuse 범위로만 제한한다.
- recommendation은 현재 제거 상태지만, 이후 follow-up에서 실수로 재도입될 위험은 계속 감시해야 한다.
- Vercel build log에 `api/_lib/_authService.ts`의 타입 export 관련 메시지가 찍히지만 local diagnostics/deploy success와 충돌하지 않는다. 지금은 non-blocking 관찰 항목이지만, 향후 deploy fail로 승격되면 별도 slice로 추적해야 한다.
- first-login workaround는 여전히 Supabase user를 `email_confirm: true`로 pre-provision하는 설계 제약을 갖고 있다. local validation 기준 option 1(template token화)이 viable하므로, actual hosted template rollout 이후에만 이 값을 `false`로 내리는 후속 변경을 검토한다.

# Retrospective

- integrated `make dev` entrypoint로 바꾸니 UI 확인 루프와 backend-inclusive QA 루프가 분리되지 않아 다음 검증이 단순해졌다.
- clean DB + Playwright evidence를 먼저 확보하니 empty-state, persistence, overwrite contract를 사람 기억이 아니라 산출물로 남길 수 있었다.
- Vercel env를 실제로 조회해 보니 production은 구성돼 있지만 preview/development는 backend target이 비어 있었다. 이걸 “즉시 해결해야 할 blocker”가 아니라 “Preview 역할을 명확히 다시 정의해야 할 신호”로 재해석한 것이 유효했다.
- Preview deploy를 실제로 시도해 보니, 전략 문제와 별개로 Vercel Hobby function limit이 별도 blocker라는 점이 드러났고, test files를 `api/` 밖으로 빼는 구조 수정으로 그 blocker를 해결할 수 있었다.
- function-count blocker를 푼 뒤에는 deployability 자체보다 Preview access policy(anonymous vs protected) 가시성이 다음 병목이라는 점이 드러났고, `vercel curl`이 auth-protected preview smoke를 확인하는 실용적인 절차라는 것도 확인했다.
- 이번 Sprint는 local runtime 완성도는 높아졌지만, remote rollout과 explicit Preview access policy 정리는 별도 slice로 남겨두는 편이 안전하다.
- 2026-03-24 production auth incident를 겪고 나서, “배포가 됐다”와 “env가 맞다”와 “schema가 올라갔다”는 서로 독립된 사실이라는 점이 더 분명해졌다. 앞으로 auth/login recovery에서는 latest production logs를 보며 blocker가 어느 gate에 있는지 단계적으로 좁혀야 한다.
