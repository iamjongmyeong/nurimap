# Sprint Summary

- Sprint 23은 Nurimap production에 Sentry minimal monitoring을 도입하는 slice다.
- browser + API/serverless에 production-only Sentry wiring을 추가했고, release / environment / sourcemap upload / user context(`email + name`, `email_only` fallback)까지 local 기준으로 검증했다.
- build 시 Sentry artifact bundle upload도 성공했고, browser Playwright smoke에서 controlled uncaught error envelope에 release / environment / runtime tag / user context가 포함되는 것을 확인했다.
- 이후 local `.env.local` 기준 Sentry env를 Vercel production에 반영하고, `vercel deploy --prod`로 production redeploy를 수행해 `Ready` 상태와 `https://nurimap.vercel.app` `HTTP/2 200` 응답을 확인했다.
- user context fallback은 `email_only`로 고정했다.

# Completed

- `docs/05-sprints/sprint-23/planning.md`, `qa.md`, `review.md`를 Sprint 23 source-of-truth / verification 상태에 맞게 갱신했다.
- `.env.local`에 Sentry 관련 placeholder/env 주석 블록을 추가했고, local 값으로 implementation verification을 수행했다.
- Sprint 23의 source-of-truth 연결을 `.omx/specs/deep-interview-sentry-minimal-monitoring.md`, `.omx/plans/plan-sentry-minimal-monitoring-consensus.md`, `.omx/plans/prd-sentry-minimal-monitoring.md`, `.omx/plans/test-spec-sentry-minimal-monitoring.md`로 고정했다.
- `name` missing fallback을 `email_only`로 확정했다.
- browser Sentry helper(`src/monitoring/browserSentry.ts`)와 shared filter/user mapping helper(`src/monitoring/sentryShared.ts`)를 도입했다.
- `src/main.tsx`에서 browser Sentry를 bootstrap하고, `src/auth/AuthProvider.tsx`에서 authenticated / name_required phase의 user context를 sync하도록 연결했다.
- server runtime helper(`src/server-core/runtime/sentry.ts`)를 도입하고, API route modules에서 production-only Sentry init 및 actionable 500-path capture seam을 연결했다.
- `vite.config.ts`에 `@sentry/vite-plugin` / build sourcemap / release injection wiring을 추가했다.
- focused tests, full test suite, lint, typecheck, build가 모두 green이다.
- local `SENTRY_ORG` mismatch(`nurimap`)를 Sentry API verification으로 발견하고 `jongmyeong`으로 교정한 뒤 sourcemap upload 성공까지 확인했다.
- local `.env.local`의 Sentry 값을 Vercel production env에 반영했고, production deployment `dpl_H28GDnyRasvPEq72capnN1RvFR9U`를 `Ready`까지 확인했다.

# Not Completed

- real production browser/serverless event smoke
- user-driven post-rollout noise review

# Carry-over

- Vercel production env에 local과 동일한 `SENTRY_*` 값 반영
- real production browser / serverless event 확인
- initial noise filter tuning 및 quota 관찰

# Risks

- filter가 약하면 expected serverless 실패가 free plan quota를 빠르게 소모할 수 있다.
- sourcemap upload / release wiring이 환경별 env mismatch로 어긋나면 stack trace가 minified 상태로 남을 수 있다.
- browser auth state에서 `name` 공급이 불안정하면 `email_only` fallback 비중이 예상보다 커질 수 있다.
- cross-cutting production observability 변경이라 문서/QA evidence sync가 늦으면 후속 추적이 어려워진다.

# Retrospective

- local `.env.local`에 project slug와 org slug를 모두 `nurimap`으로 넣어 두면 build 단계에서만 404가 드러나므로, Sentry API로 org/project 접근성을 먼저 확인한 것이 유효했다.
- browser smoke는 real Sentry issue 생성까지 가지 않아도 envelope intercept만으로 release / environment / runtime tag / user context를 빠르게 검증할 수 있었다.
- same-project dual-DSN(browser/serverless) 1차 운영은 wiring이 단순하지만, rollout 후 noise 관찰/필터 강화 루프가 꼭 필요하다.
