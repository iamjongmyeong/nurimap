# Sprint Goal

- Nurimap production에 **Sentry minimal monitoring**을 도입해 browser + API/serverless의 실제 장애성 에러만 수집한다.
- release / environment / sourcemap 기반으로 production 장애를 빠르게 추적 가능하게 하되, free plan quota를 넘지 않도록 **noise를 기본적으로 강하게 필터링**한다.
- user context는 `email + name`을 기준으로 하되, `name`이 없을 때는 `email_only` fallback을 사용한다.

# In Scope

- browser runtime Sentry bootstrap 도입
- API/serverless runtime Sentry capture seam 도입
- production only capture gating
- release / environment / sourcemap upload wiring
- browser / server user context(`email + name`, `email_only` fallback) 연결
- known noise(auth / validation / expected network / business failure) 필터링
- 최소 범위 feature tagging 전략 정리
- Sprint 23 QA / rollout handoff 문서화

# Out Of Scope

- tracing / performance monitoring
- session replay
- staging / preview 이벤트 전송
- blanket handled-error capture
- request / response full payload 수집
- token / secret 수집
- alerting(Slack / email 등)
- paid upgrade

# Selected Specs

- `docs/03-specs/12-release-hardening.md`

# Related Product / Design / Architecture Docs

- `docs/02-architecture/security-and-ops.md`
- `docs/02-architecture/system-runtime.md`
- `docs/00-governance/agent-workflow.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `.omx/context/sentry-minimal-monitoring-20260329T040247Z.md`
- `.omx/specs/deep-interview-sentry-minimal-monitoring.md`
- `.omx/plans/plan-sentry-minimal-monitoring-consensus.md`
- `.omx/plans/prd-sentry-minimal-monitoring.md`
- `.omx/plans/test-spec-sentry-minimal-monitoring.md`

# Constraints

- capture는 production only다.
- browser + API/serverless를 같은 Sentry org / 같은 Sentry project로 1차 운영한다.
- release는 deployment 식별자(commit SHA 기준)를 사용한다.
- sourcemap 연동은 필수다.
- tracing / replay / paid-plan 의존은 도입하지 않는다.
- 실제 대응이 필요한 장애성 에러만 수집하고, expected auth / validation / rate-limit / business noise는 기본적으로 제외한다.
- user context는 `email + name`을 기준으로 하되, `name`이 없으면 `email_only` fallback을 사용한다.
- `sendDefaultPii` 같은 broad PII 수집은 켜지 않고, 명시적으로 허용된 필드만 붙인다.
- quota 압박 시 우선순위는 `필터 강화 -> serverless 수집 축소 -> browser 최대한 유지`다.
- 배포/build/upload 경로가 바뀌면 `.vercelignore`를 함께 점검한다.

# Agent Instructions

- 구현 전 공식 Sentry 문서를 기준으로 browser SDK / serverless SDK / sourcemap upload 경로를 다시 확인한다.
- 실제 secret 값은 tracked code/docs/tests에 쓰지 않는다.
- production observability + PII + env + build 변경이므로 Sprint 23 문서를 canonical 실행 기록으로 유지한다.
- browser와 serverless 모두에 공통 적용 가능한 filtering seam을 우선 설계한다.
- `docs/06-history/*` 수정이 필요하면 먼저 사용자에게 설명하고 확인을 받는다.

# Done Criteria

- production browser runtime 에러가 Sentry로 전송된다.
- production API/serverless runtime 에러가 Sentry로 전송된다.
- release / environment가 이벤트에 함께 표시된다.
- sourcemap을 통해 원본 파일/라인 추적이 가능하다.
- expected 400/401/403/429, validation, business-noise가 기본적으로 필터링된다.
- user context가 `email + name` 또는 `email_only` fallback 규칙대로 붙는다.
- tracing / replay / broad payload capture가 들어가지 않는다.
- Sprint 23 planning / qa / review 문서가 실제 구현/검증 상태와 일치한다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - browser init gating(production + DSN 존재 시에만 활성화)
  - browser / server filtering helper 동작
  - user-context mapper가 `email + name` / `email_only` fallback만 노출하는지
  - release / environment metadata resolution
  - sourcemap build / upload 경로
- 실행 주체:
  - AI Agent
- 종료 기준:
  - targeted Sentry tests + `pnpm test:run` + `pnpm lint` + `pnpm build`가 green이고, filter / release / environment / user-context contract가 검증된다.

## AI Agent Interactive QA
- 대상 시나리오:
  - browser bootstrap 위치와 serverless capture seam이 brownfield 구조에 맞는지
  - tracing / replay / broad PII capture가 들어가지 않았는지
  - `email_only` fallback 규칙이 docs / code / tests에 일관되게 반영됐는지
  - `.vercelignore`와 build/upload 경로가 충돌하지 않는지
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 구현 결과와 Sprint 23 문서, `.omx` plan/PRD/test spec, architecture/security docs 사이에 계약 충돌이 없다.

## Browser Automation QA
- 대상 시나리오:
  - production-configured browser build에서 controlled browser exception smoke
  - filtered noise flow가 실제 UI/runtime에서 actionability 없는 이벤트로 남지 않는지
  - release / environment / user context field가 기대값과 맞는지
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright 우선으로 주요 smoke를 수행하고, 결과를 Sprint 23 QA evidence에 기록한다. local-only 한계가 있으면 blocker/잔여 리스크를 명시한다.
- 예상 증빙 경로:
  - `artifacts/qa/sprint-23/`

## User QA Required
- 사용자 확인 항목:
  - `.env.local` / Vercel에 Sentry 관련 env가 올바르게 입력됐는지
  - 실제 Sentry event에서 release / environment / user context가 기대대로 보이는지
  - unwanted noise event가 초기 rollout 이후 과도하게 쌓이지 않는지
- 기대 결과:
  - production 장애를 빠르게 추적할 수 있으면서도 free plan quota를 보수적으로 유지한다.
- handoff 조건:
  - automated checks, AI Agent QA, browser evidence 또는 blocker가 기록돼 있다.
