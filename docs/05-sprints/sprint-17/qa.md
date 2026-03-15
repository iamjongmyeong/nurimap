# Verification Scope

- CHG-01 Minimal hybrid routing with canonical detail URL
- CHG-02 Auth bootstrap hardening and verify-route migration
- CHG-03 Auth resend policy and UX writing update
- CHG-04 Map runtime loading/failure fallback UX clarification
- 관련 source-of-truth 문서 반영 여부 점검
  - `docs/03-specs/02-map-rendering.md`
  - `docs/03-specs/03-list-browse.md`
  - `docs/03-specs/04-place-detail.md`
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/01-product/user-flows/auth-and-name-entry.md`
  - `docs/04-design/browse-and-detail.md`
  - `docs/04-design/auth-and-name-entry.md`
  - `docs/04-design/foundations.md`

# Automated Checks Result

- 실행 일시: 2026-03-15
- 실행 주체: AI Agent
- 실행 명령:
  - `pnpm exec vitest run src/App.test.tsx src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authPolicy.test.ts src/server/authService.test.ts`
  - `pnpm lint`
  - `pnpm build`
- 결과:
- PASS — initial Sprint 17 regression set: `8 files passed`, `110 tests passed`
- PASS — post-release auth/place-entry focused set: `8 files passed`, `59 tests passed`
  - PASS — lint 통과
  - PASS — production build 통과
- 핵심 확인 항목:
  - `/places/:placeId` direct entry / refresh / back 동작 관련 테스트 통과
  - place add는 internal state로 유지되고 등록 성공 후 canonical detail route로 이동하는 테스트 통과
  - `/auth/verify` canonical entry + legacy root verify query 병행 지원 테스트 통과
  - auth request/verify timeout convergence 테스트 통과
  - verify-link와 consume-link 분리 및 fresh nonce non-consumption 테스트 통과
  - `expired`, `used`, `invalidated` 한국어 failure copy 테스트 통과
  - burst 5회 후 cooldown 정책 및 countdown formatting 테스트 통과
  - `/api/place-entry` JSON 500 fallback + Vercel api import boundary 테스트 통과
  - request-link accepted/failure observability 로그 테스트 통과
  - consume-link 분리 이후 fresh nonce non-consumption 및 finalize flow 테스트 통과
  - 지도 loading / failure fallback UI 테스트 통과

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - 멀티 에이전트로 routing/app-shell, auth, map fallback slice를 병렬 구현한 뒤 통합 diff를 직접 검토했다.
  - route/store ownership, auth failure copy, timeout convergence, map loading/failure UX가 planning/source-of-truth와 일치하는지 코드 레벨로 대조했다.
  - 최종 통합 후 verifier 관점 재검토를 수행해 fresh evidence 기준 PASS 여부를 점검했다.
- 결과:
  - PASS — 구현된 behavior는 Sprint 17 planning과 갱신된 spec/user-flow/design 문서의 핵심 acceptance를 충족한다.
  - PASS — native history 기반 최소 routing은 `/places/:placeId`, `/auth/verify`, direct entry, refresh, browser back behavior를 만족해 현재 source-of-truth 행동 계약과 충돌하지 않는다.
- PASS — auth failure raw code 미노출, 리디자인된 failure layout/CTA/copy, generic failure copy, map loading/failure exact copy가 코드와 문서에 함께 반영되었다.

## Browser Automation QA Evidence
- 실행 목적:
  - desktop/mobile viewport에서 `/places/:placeId` deep-link, back 복귀, map runtime loading/failure UX, `/auth/verify` canonical path와 legacy root verify query failure UX를 실제 브라우저에서 확인
- 실행 명령 또는 스크립트:
  - local dev server: `VITE_LOCAL_AUTO_LOGIN=false VITE_LOCAL_AUTO_LOGIN_EMAIL='' pnpm dev --host 127.0.0.1 --port 4174`
  - preview server: `pnpm preview --host 127.0.0.1 --port 4175`
  - Playwright scripts:
    - `node artifacts/qa/sprint-17/run-playwright.mjs`
    - `node artifacts/qa/sprint-17/auth-preview-qa.mjs`
- 확인한 시나리오:
  - dev server 기준 `/places/place-restaurant-1?auth_test_state=authenticated` desktop direct entry
  - desktop detail back 후 browse 상태 복귀
  - mobile direct entry 및 back 후 map 상태 복귀
  - Kakao SDK request abort를 통한 runtime loading placeholder / failure retry UI 확인
  - preview build 기준 `/auth/verify?...` invalidated failure 문구 확인
  - preview build 기준 legacy `/?auth_mode=verify...` used failure 문구 확인
- 판정:
  - PASS — 브라우저 자동화로 canonical detail route, mobile/desktop back flow, map loading/failure UX, canonical/legacy auth verify failure UX를 확인했다.
- 스크린샷 경로:
  - `artifacts/qa/sprint-17/desktop-detail-direct.png`
  - `artifacts/qa/sprint-17/desktop-browse-after-back.png`
  - `artifacts/qa/sprint-17/mobile-detail-direct.png`
  - `artifacts/qa/sprint-17/mobile-map-after-back.png`
  - `artifacts/qa/sprint-17/map-loading-runtime.png`
  - `artifacts/qa/sprint-17/map-error-runtime.png`
  - `artifacts/qa/sprint-17/auth-verify-invalidated-preview.png`
  - `artifacts/qa/sprint-17/auth-legacy-verify-used-preview.png`

## User QA Required
- 사용자 확인 항목:
  - deployed 환경에서 실제 로그인 메일 수신 후 `/auth/verify` 링크 클릭 / 재전송 / 이전 링크 실패 확인
  - macOS 브라우저에서 `Command + Shift + R` hard refresh 후 auth/bootstrap이 무한 로딩 없이 수렴하는지 확인
  - deployed 환경에서 Kakao SDK 로딩 실패 또는 차단 상황이 있는 브라우저/네트워크 조합에서 fallback UX 체감 확인
- 기대 결과:
  - canonical auth entry, resend policy, failure copy, hard refresh convergence, map fallback UX가 실제 환경에서도 planning 기준과 동일하게 동작한다.
- 상태:
  - PENDING

# Change Verification

## CHG-01 Minimal hybrid routing with canonical detail URL
- Automated:
  - PASS — `src/App.test.tsx`, `src/app-shell/NurimapBrowse.test.tsx`, `src/app-shell/NurimapDetail.test.tsx`, `src/app-shell/PlaceRegistrationFlow.test.tsx`
- Manual / Browser:
  - AI Agent Interactive QA PASS
  - Browser Automation PASS
- Evidence:
  - `/places/:placeId` direct entry / back / refresh / registration success route 관련 테스트 통과
  - desktop/mobile deep-link screenshots 확보
- Verdict:
  - PASS

## CHG-02 Auth bootstrap hardening and verify-route migration
- Automated:
  - PASS — `src/auth/AuthFlow.test.tsx`, `src/auth/authVerification.test.ts`, `src/server/authService.test.ts`
- Manual / Browser:
  - AI Agent Interactive QA PASS
  - Browser Automation PASS
- Evidence:
- `/auth/verify` canonical parsing, legacy root query support, timeout convergence, 리디자인된 localized failure layout/copy, verify/consume 분리 관련 테스트 통과
  - preview build 기준 canonical/legacy auth verify failure screenshots 확보
- Verdict:
  - PASS

## CHG-03 Auth resend policy and UX writing update
- Automated:
  - PASS — `src/server/authPolicy.test.ts`, `src/server/authService.test.ts`, `src/auth/AuthFlow.test.tsx`
- Manual / Browser:
  - AI Agent Interactive QA PASS
  - User QA PENDING
- Evidence:
  - burst 5회 허용, 6번째 cooldown, `MM분 SS초` / `SS초` formatting, exact Korean failure copy, request-link delivery observability 관련 테스트 통과
- Verdict:
  - CONDITIONAL PASS

## CHG-04 Map runtime loading/failure fallback UX clarification
- Automated:
  - PASS — `src/app-shell/NurimapBrowse.test.tsx`
- Manual / Browser:
  - AI Agent Interactive QA PASS
  - Browser Automation PASS
- Evidence:
  - loading placeholder + spinner + exact copy, failure copy + retry button, fake map/marker 미노출 테스트 통과
  - runtime loading/failure screenshots 확보
- Verdict:
  - PASS

# Issues Found

- User QA 미실행
  - 영향: 실제 이메일 delivery, 실제 verify-link 클릭, macOS hard refresh, Kakao runtime failure 체감을 아직 확인하지 못했다.
  - 리스크: automated/browser scope는 통과했지만 production/deployed env 증빙은 아직 부족하다.

# QA Verdict

- **조건부 통과 (CONDITIONAL PASS)**
- 근거:
  - 구현 범위에 대응하는 automated checks, browser automation, lint, build는 모두 통과했다.
  - AI Agent Interactive QA 기준으로 source-of-truth behavior와 코드가 일치한다.
  - 다만 planning에 적어둔 User QA Required는 아직 수행되지 않았으므로, Sprint 17 QA는 완전 종료가 아니라 deployed/runtime confirmation이 남은 상태다.

# Follow-ups

- deployed 환경에서 실제 로그인 메일 수신 후 `/auth/verify` 링크 클릭 / 재전송 / 이전 링크 invalidation UX를 검증한다.
- macOS 브라우저에서 `Command + Shift + R` hard refresh 재현 결과를 기록한다.
- Kakao SDK 차단/실패 상황이 실제 브라우저에서 어떻게 보이는지 확인하고 필요 시 copy/visual density를 조정한다.
