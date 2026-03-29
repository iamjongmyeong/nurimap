# Verification Scope

- Sprint 23 Sentry minimal monitoring 검증

# Automated Checks Result

- 실행 결과:
  - `pnpm exec vitest run src/monitoring/browserSentry.test.ts src/server-core/runtime/sentry.test.ts src/server/apiPlaceEntryRoute.test.ts src/server/releaseHardening.test.ts` → PASS (`4 files`, `20 tests`)
  - `pnpm exec vitest run src/monitoring/browserSentry.test.ts src/server/apiPlaceEntryRoute.test.ts src/server/releaseHardening.test.ts` → PASS (`3 files`, `21 tests`)
  - `pnpm exec tsc --noEmit --project tsconfig.json` → PASS (`0 errors`)
  - `pnpm test:run` → PASS (`36 files`, `313 tests`)
  - `pnpm lint` → PASS
  - `pnpm build` → PASS
    - `@sentry/vite-plugin` artifact bundle upload 성공
    - Organization: `jongmyeong`
    - Project: `nurimap`
    - Release: `cbb61455d9256a3ec7deb75e08e705a31501774e`
  - `pnpm exec vercel deploy --prod -y --no-wait` → PASS
    - deployment URL: `https://nurimap-qphaqa4qv-jongmyeong-projects.vercel.app`
  - `pnpm exec vercel inspect https://nurimap-qphaqa4qv-jongmyeong-projects.vercel.app --wait --timeout 90s` → PASS
    - production deploy status: `Ready`
    - alias 확인: `https://nurimap.vercel.app`, `https://nurimap.jongmyeong.me`
  - `curl -I -s https://nurimap.vercel.app` → PASS
    - `HTTP/2 200`
    - `x-robots-tag: noindex, nofollow`
    - `content-security-policy` header 유지
- 확인 포인트:
  - browser init gating(production + DSN 존재 시에만 활성화)
  - browser user context(`email + name`, `email_only` fallback)
  - browser noise filter / actionable event 통과
  - server runtime release / enablement resolution
  - canonical place submission 500 path의 Sentry capture
  - Vite sourcemap / release upload wiring
  - full test / lint / typecheck / build green

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - Sprint 23 source-of-truth / `.omx` 계획 문서 / architecture-security contract 정합성 검토
  - browser helper / server runtime helper / API catch-path capture seam placement 검토
  - tracing / replay 미도입, `sendDefaultPii` 미사용, explicit `email + name` / `email_only` fallback만 사용 여부 확인
  - local `.env.local`의 Sentry API 접근성 점검 후 initial `SENTRY_ORG=nurimap` mismatch를 `jongmyeong`으로 교정
  - `.vercelignore`가 새 build/upload 경로를 막지 않는지 확인
- 결과:
  - PASS
  - browser는 `PUBLIC_SENTRY_DSN`, serverless는 `SENTRY_DSN`(server-side fallback 가능)으로 분리했지만 같은 project DSN을 사용하는 1차 운영 계약과 충돌하지 않는다.
  - release는 `SENTRY_RELEASE_SOURCE=VERCEL_GIT_COMMIT_SHA` 기준으로 browser/serverless/build 경로에 일관되게 반영된다.
  - `.vercelignore`는 `src/`, `api/`, `vite.config.ts`, `package.json` 같은 runtime/build 경로를 제외하지 않아 이번 Sentry wiring과 충돌하지 않는다.
  - local `.env.local` 값을 기준으로 Vercel production env(`PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE_SOURCE`)를 CLI로 반영했다.

## Browser Automation QA Evidence
- 실행 목적:
  - production-configured browser/serverless smoke에서 Sentry capture와 filtering contract를 확인한다.
- 실행 명령 또는 스크립트:
  - `pnpm exec vite preview --host 127.0.0.1 --port 4173`
  - Playwright inline smoke:
    - mobile viewport로 preview root 접속
    - `/api/auth/session`, `/api/places`를 route fulfill로 인증/empty-state bootstrap
    - controlled uncaught browser error 발생
    - `ingest.sentry.io` envelope request를 intercept해 payload field 확인
- 확인한 시나리오:
  - controlled browser exception이 production release/environment와 함께 Sentry envelope로 전송되는지
  - authenticated browser context에서 `email + username(name)`가 user field로 포함되는지
  - browser runtime tag가 event payload에 포함되는지
- 판정:
  - PASS
- 스크린샷 경로:
  - `artifacts/qa/sprint-23/playwright-sentry-browser-smoke.png`
  - `artifacts/qa/sprint-23/playwright-sentry-browser-smoke.json`
  - `artifacts/qa/sprint-23/vercel-production-inspect.json`
  - `artifacts/qa/sprint-23/vercel-production-url.txt`

## User QA Required
- 사용자 확인 항목:
  - Vercel production env에 `PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE_SOURCE`가 동일하게 반영됐는지
  - 실제 production browser event와 serverless event가 같은 project에서 release / environment / user context 기대값으로 보이는지
  - 초기 rollout 이후 400/401/403/409/422/429, validation, business-noise가 과도하게 이벤트로 유입되지 않는지
- 기대 결과:
  - 실제 장애성 이벤트만 Sentry에서 식별 가능하고, noise는 기본적으로 억제된다.
- 상태:
  - pending
  - local 구현/검증 완료
  - Vercel production env 반영 완료
  - remaining handoff: 실제 product-side smoke / noise observation

# Issues Found

- initial local `SENTRY_ORG`가 `nurimap`으로 들어가 있어 Sentry project lookup / sourcemap upload가 404로 실패했다.
- Sentry API `/api/0/projects/` 확인 결과 accessible organization slug가 `jongmyeong`, project slug가 `nurimap`임을 확인했고, local `.env.local`에서 `SENTRY_ORG=jongmyeong`으로 교정 후 build/upload가 통과했다.
- browser automation smoke에서는 Sentry envelope intercept가 성공했지만, real production ingest/issue creation 자체는 아직 user QA handoff 범위다.
- production deploy는 `Ready`까지 확인했고 `https://nurimap.vercel.app`가 `HTTP/2 200`으로 응답한다.

# QA Verdict

- PASS (local implementation / build / browser-envelope smoke 기준)

# Follow-ups

- Vercel production env에 local과 동일한 `SENTRY_*` 값을 반영한다.
- real production browser + serverless smoke를 수행해 실제 event/issue visibility를 확인한다.
- rollout 초기에 noise volume을 점검하고 필요 시 filter를 더 강화한다.
