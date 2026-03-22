# Plan: Sprint 20 Env Separation Completion and Safe Rollout Readiness

## Requirements Summary
- Sprint 20의 auth/place/review real-data migration은 `dev / test / production` 분리를 명시적으로 요구하고, 서로 다른 환경이 secret이나 mutable target을 공유하면 안 된다 (`.omx/plans/prd-supabase-place-auth-real-data-migration.md:15`, `.omx/plans/prd-supabase-place-auth-real-data-migration.md:24-27`, `.omx/plans/prd-supabase-place-auth-real-data-migration.md:65-74`).
- 현재 local runtime은 이미 검증되었다. local Supabase health, `make check`, integrated runtime browser QA, empty-state/create/refresh/detail revisit/overwrite evidence가 Sprint 20 QA에 기록돼 있다 (`docs/05-sprints/sprint-20/qa.md:8-13`, `docs/05-sprints/sprint-20/qa.md:31-55`).
- 현재 코드에는 환경 분리의 기반이 이미 있다. DB resolver는 `NODE_ENV === 'test'`에서 전용 test DB URL 계열을 우선할 수 있고, app session cookie는 production/non-production에 따라 이름과 `Secure` 여부를 분기한다 (`src/server/database.ts:12-33`, `src/server/appSessionService.ts:7-12`, `src/server/appSessionService.ts:42-86`).
- local Supabase 설정은 별도 포트와 auth redirect URL을 사용하므로 local 개발은 production과 분리되어 있다 (`supabase/config.toml:7-18`, `supabase/config.toml:27-36`, `supabase/config.toml:146-156`).
- 아직 남은 일은 remote dev/test target 확정, push 영향 확인, dedicated test strategy 명확화, OTP UI browser evidence 보강 여부 결정, 사용자 QA handoff다 (`docs/05-sprints/sprint-20/qa.md:57-81`, `.omx/plans/plan-next-session-supabase-rollout-and-qa.md:100-118`).
- `main` push는 최소한 GitHub bypass-email guard workflow를 트리거하고, repo는 Vercel project에 연결돼 있으므로 push 전 원격 영향 범위를 먼저 확인해야 한다 (`.github/workflows/bypass-email-guard.yml:3-33`, `.vercel/project.json:1`).

## Planning Recommendation
- **권장 경로:** production은 건드리지 않고, 먼저 **env matrix 정리 -> push 영향 확인 -> test/dev target 확정 -> remote dev/test rollout -> 사용자 QA -> production 판단** 순서로 간다.
- **비권장 경로:** `main` push 후에 배포/target을 뒤늦게 확인하거나, test DB strategy 없이 destructive verification을 반복하는 방식은 피한다.

## Acceptance Criteria
1. `dev / test / production`별로 사용하는 runtime target, env key set, owner, mutation 허용 범위가 한 문서/체크리스트로 정리된다.
2. `test` 전략이 명확해진다:  
   - 전용 `TEST_DATABASE_URL`/test project를 실제로 도입하거나,  
   - 당장은 local resettable DB reuse로 유지하되 그 이유와 reset 절차를 명시한다.
3. `main` push의 영향 범위(CI만인지, 배포까지 이어질 수 있는지)가 확인되고, push 전략이 문서화된다.
4. remote rollout은 **명시적 target project 확인** 없이는 시작하지 않는 gate가 유지된다.
5. remote dev/test rollout을 진행할 경우 auth -> browse -> create -> overwrite smoke test까지 완료 기준이 준비된다.
6. production에 대해 실행 가능한 작업은 “explicit approval 이후”로 제한된다.
7. `supabase/snippets/Untitled query 848.sql` 같은 scratch artifact는 끝까지 commit 대상에서 제외된다.

## Implementation Steps

### Step 1. Freeze the current baseline and exclude unsafe noise
**Files / Context**
- `.omx/plans/plan-next-session-supabase-rollout-and-qa.md:18-40`
- `docs/05-sprints/sprint-20/qa.md:67-81`

**Actions**
- `git status --short`로 현재 변경 상태를 다시 고정한다.
- `supabase/snippets/Untitled query 848.sql`는 purpose가 확인되기 전까지 계속 제외한다.
- local verified baseline commit set(`eafcb88`, `f87148a`, `b231ad5`)과 현재 ahead 상태를 handoff context에 명시한다.

**Deliverable**
- “지금부터는 env separation / rollout readiness만 다룬다”는 baseline note

### Step 2. Build an explicit env matrix from the current runtime contract
**Files / Context**
- `src/server/database.ts:12-33`
- `src/server/appSessionService.ts:7-12`
- `src/server/appSessionService.ts:42-86`
- `docs/02-architecture/security-and-ops.md:24-29`
- `docs/02-architecture/security-and-ops.md:38-39`
- `docs/02-architecture/security-and-ops.md:53-60`
- `docs/02-architecture/security-and-ops.md:80-87`
- `supabase/config.toml:7-18`
- `supabase/config.toml:27-36`
- `supabase/config.toml:146-156`

**Actions**
- 다음 key들을 환경 분류표로 정리한다:  
  `DATABASE_URL`, `TEST_DATABASE_URL` 계열, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `PUBLIC_APP_URL`, `AUTH_BYPASS_ENABLED`, `AUTH_BYPASS_EMAILS`, `VITE_LOCAL_AUTO_LOGIN`, `VITE_LOCAL_AUTO_LOGIN_EMAIL`, Kakao/Resend keys.
- 각 key에 대해 아래를 결정한다:
  - local dev에서 필요한가
  - test에서 필요한가
  - remote dev/test에서 필요한가
  - production에서 필요한가
  - browser 노출 가능 여부
  - mutation risk(OTP, DB write, deploy impact)
- durable contract 변경이 있으면 `docs/02-architecture/security-and-ops.md`에 반영하고, sprint-specific checklist면 Sprint 20 문서 또는 `.omx` plan follow-up에 둔다.

**Deliverable**
- env matrix 초안 1개

### Step 3. Decide the real `test` strategy instead of leaving it implicit
**Files / Context**
- `src/server/database.ts:17-27`
- `src/server/database.test.ts:14-27`
- `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md:52`
- `docs/05-sprints/sprint-20/qa.md:69-80`

**Actions**
- `test`를 아래 둘 중 하나로 고정한다:
  - **Option A (recommended when destructive integration expands):** dedicated `TEST_DATABASE_URL` / separate Supabase test target 도입
  - **Option B (acceptable short-term):** local DB reuse + explicit reset procedure + no concurrent destructive runs
- 선택 기준:
  - 앞으로 integration/remote smoke가 얼마나 자주 state를 mutate하는가
  - 사용자(maintainer)가 Docker/Supabase 운영 복잡도를 감당할 수 있는가
  - CI/automation에서 accidental cross-write risk를 얼마나 줄여야 하는가
- short-term으로 Option B를 유지하더라도, `TEST_DATABASE_URL`가 아직 비어 있는 현재 상태를 “미완료가 아니라 의도된 임시 운영 모델”로 명확히 기록한다.

**Recommended Decision**
- 지금은 **Option B**로 문서화하고, remote dev/test rollout이 안정화되면 **Option A**로 승격한다.

**Deliverable**
- test strategy decision + reset/run rules

### Step 4. Confirm push impact before any new `main` push
**Files / Context**
- `.github/workflows/bypass-email-guard.yml:3-33`
- `.vercel/project.json:1`
- `.omx/plans/plan-next-session-supabase-rollout-and-qa.md:100-118`

**Actions**
- `main` push 시 일어나는 자동화를 구분한다:
  - GitHub Actions: bypass-email guard
  - Vercel: preview/deploy linkage 여부 확인 필요
- Vercel dashboard 또는 authenticated CLI로 아래를 확인한다:
  - `main` push가 production deployment를 자동 유발하는지
  - preview-only인지
  - deployment protection/approval이 있는지
- 결과에 따라 push 전략을 선택한다:
  - **Safe path 1:** `main` push가 즉시 production에 영향 없음 → push 가능
  - **Safe path 2:** production 영향 가능 → branch/PR 또는 deploy freeze 먼저

**Deliverable**
- push yes/no 기준과 실제 push path

### Step 5. Prepare a remote dev/test rollout checklist before touching any remote environment
**Files / Context**
- `.omx/plans/prd-supabase-place-auth-real-data-migration.md:83-115`
- `.omx/plans/plan-next-session-supabase-rollout-and-qa.md:106-118`
- `docs/02-architecture/system-runtime.md:175-182`
- `docs/02-architecture/security-and-ops.md:53-67`

**Actions**
- remote rollout 전 필수 확인 체크리스트를 만든다:
  1. target project 이름/ID 명시
  2. remote DB URL / Supabase URL / secret key / `PUBLIC_APP_URL` / bypass env 존재 확인
  3. target이 production이 아님을 재확인
  4. migration 적용 대상과 순서 명시
  5. rollback / stop condition 정의
- remote smoke scope를 local QA와 같은 핵심 계약으로 제한한다:
  - auth bootstrap
  - browse list/detail
  - place create
  - overwrite review
  - logout / relogin

**Deliverable**
- remote dev/test rollout checklist 1개

### Step 6. Fill the remaining evidence gaps before any production decision
**Files / Context**
- `docs/05-sprints/sprint-20/qa.md:57-81`
- `docs/02-architecture/system-runtime.md:175-182`
- `docs/02-architecture/security-and-ops.md:31-60`

**Actions**
- local auto-login bypass가 아닌 일반 OTP request/verify UI browser evidence를 별도 수집할지 결정한다.
- 사용자 QA handoff를 준비한다:
  - auth UX 유지 여부
  - empty-state browse + 첫 등록 흐름
  - overwrite 체감
- remote dev/test rollout을 실제로 수행했다면 결과를 Sprint 20 `qa.md` / `review.md`에 반영한다.
- remote rollout을 보류했다면 “왜 보류했는지”를 Sprint 20 `review.md`에 남긴다.

**Deliverable**
- 사용자 QA handoff 또는 보류 사유가 반영된 Sprint 20 docs

## Risks and Mitigations
- **Risk:** `test`가 실제로는 `dev`와 같은 target을 써서 destructive verification이 데이터를 오염시킨다.  
  **Mitigation:** Step 3에서 dedicated test target 또는 explicit reset model 중 하나를 문서로 고정한다.
- **Risk:** `main` push가 예상보다 큰 원격 영향(자동 배포 등)을 만든다.  
  **Mitigation:** Step 4에서 GitHub/Vercel automation 범위를 먼저 확인하고 push strategy를 분기한다.
- **Risk:** remote env 값이 local과 달라 auth bootstrap 또는 migration이 실패한다.  
  **Mitigation:** Step 5에서 key-by-key checklist를 통과하기 전에는 rollout하지 않는다.
- **Risk:** local bypass auto-login 덕분에 OTP UI 문제가 가려진다.  
  **Mitigation:** Step 6에서 OTP UI evidence를 별도 수집할지 명시적으로 결정한다.
- **Risk:** 사용자가 Docker/Supabase 운영에 익숙하지 않아 실수로 production을 건드릴 수 있다.  
  **Mitigation:** production은 explicit approval 전까지 read-only로 취급하고, remote rollout도 dev/test target 확인이 선행된 뒤에만 수행한다.
- **Risk:** scratch SQL이나 local secrets가 commit된다.  
  **Mitigation:** `git status --short`와 env guard를 매 execution slice 시작/종료 시점에 재확인한다.

## Verification Steps
1. `git status --short`
2. `supabase status`
3. `make check`
4. env matrix audit 결과에 “local / test / remote dev/test / production” 각 칸이 채워졌는지 확인
5. `TEST_DATABASE_URL` 전략이 문서/체크리스트에 명시됐는지 확인
6. Vercel/GitHub push 영향 확인 결과가 기록됐는지 확인
7. remote rollout checklist에 target project, env keys, migration order, smoke scope가 모두 들어갔는지 확인
8. Sprint 20 `qa.md` / `review.md`에 remaining gaps와 보류 사유 또는 rollout 결과가 반영됐는지 확인

## Success Criteria
- 사용자는 “지금 push해도 되는지 / 아직 어떤 위험이 남았는지 / remote rollout 전에 뭘 확인해야 하는지”를 문서만 보고 판단할 수 있다.
- `dev / test / production` 분리가 코드 지원 수준을 넘어 운영 체크리스트 수준으로 구체화된다.
- production은 explicit approval 전까지 보호되고, remote dev/test rollout은 target-confirmed checklist를 통해서만 시작된다.
