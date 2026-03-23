# Verification Scope

- Sprint 20의 real-data migration에서 docs/runtime lock, auth cookie cutover, place/review persistence, recommendation regression guard를 검증한다.
- 구현의 상세 acceptance criteria와 test matrix는 `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`, `.omx/plans/test-spec-sprint-20-vercel-function-limit-resolution.md`를 SSOT로 사용한다.
- 2026-03-23 auth hotfix slice에서는 local-only bypass 정책을 유지하면서 OTP 발송 회귀와 exact allowlist OTP 예외를 함께 검증한다.
- browse 지도 surface에서는 level HUD / zoom button 비노출 contract가 현재 UI/docs와 일치하는지 함께 검증한다.
- 2026-03-23 marker visual refresh slice에서는 사용자 추가 장소 marker / label이 Figma handoff node `61:18`의 핵심 시각 언어와 맞는지 함께 검증한다.
- 2026-03-24 production auth recovery slice에서는 production login failure를 deploy alias, TLS/env, DB schema gate로 분리해 확인하고, recovery 뒤 실제 production login success까지 검증한다.

# Automated Checks Result

- 실행 명령:
  - `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx`
  - `pnpm exec vitest run src/server/authPolicy.test.ts src/server/authService.test.ts`
  - `pnpm exec vitest run src/server/apiAuthSessionRoutes.test.ts src/server/apiAuthVerifyOtp.test.ts src/server/releaseHardening.test.ts`
  - `pnpm build`
  - `supabase status`
  - `git diff --check`
  - `pnpm exec vitest run src/server/apiAuthSessionRoutes.test.ts src/server/apiAuthVerifyOtp.test.ts src/server/apiPlaceEntryRoute.test.ts src/server/apiPlaceListRoute.test.ts src/server/apiPlaceReviewRoute.test.ts`
  - `make check`
  - `pnpm exec vercel deploy --yes`
  - `pnpm exec vercel curl / --deployment https://nurimap-5jf77rli7-jongmyeong-projects.vercel.app --yes`
  - `pnpm exec vercel curl /places/smoke-place --deployment https://nurimap-5jf77rli7-jongmyeong-projects.vercel.app --yes`
  - `pnpm exec vercel curl /assets/index-BDwYyS21.js --deployment https://nurimap-5jf77rli7-jongmyeong-projects.vercel.app --yes -- --head`
  - `pnpm exec vitest run src/server/authService.test.ts src/server/apiAuthVerifyOtp.test.ts src/server/releaseHardening.test.ts`
  - `pnpm build`
  - `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx`
  - `pnpm build`
  - `pnpm exec vercel inspect nurimap.jongmyeong.me`
  - `pnpm exec vercel logs --environment production --query '/api/auth/verify-otp' --since 30m --no-follow --expand`
  - `supabase link --project-ref yjshqlxvrrytjzwmzxdi --yes`
  - `supabase db push --linked --dry-run --yes`
  - `supabase db push --linked --yes`
- 결과:
  - PASS — `src/app-shell/NurimapBrowse.test.tsx`, `src/app-shell/NurimapDetail.test.tsx` 2 files / 26 tests 통과
  - PASS — `src/server/authPolicy.test.ts`, `src/server/authService.test.ts` 2 files / 27 tests 통과
  - PASS — `src/server/apiAuthSessionRoutes.test.ts`, `src/server/apiAuthVerifyOtp.test.ts`, `src/server/releaseHardening.test.ts` 3 files / 10 tests 통과
  - PASS — `pnpm build` 통과
  - PASS — local Supabase가 실행 중이며 local API / DB endpoint가 정상 노출됐다.
  - PASS — `git diff --check` 통과
  - PASS — moved API route tests 5 files / 8 tests 통과
  - PASS — `make check` → `vitest` 25 files / 178 tests 통과, `pnpm lint` 통과, `pnpm build` 통과
  - PASS — `pnpm exec vercel deploy --yes` 성공, Preview URL 발급 완료
  - PASS — authenticated `vercel curl` smoke에서 `/`, `/places/smoke-place`, `/assets/index-BDwYyS21.js`가 정상 응답했다.
  - PASS — first-login OTP hardening slice에서 `src/server/authService.test.ts`, `src/server/apiAuthVerifyOtp.test.ts`, `src/server/releaseHardening.test.ts` 3 files / 31 tests 통과
  - PASS — first-login OTP hardening 반영 후 `pnpm build` 재통과
  - PASS — marker visual refresh slice에서 `src/app-shell/NurimapBrowse.test.tsx`, `src/app-shell/PlaceRegistrationFlow.test.tsx` 2 files / 33 tests 통과
  - PASS — marker visual refresh 반영 후 `pnpm build` 재통과
  - PASS — 2026-03-24 production alias는 `nurimap-h5vb84834-jongmyeong-projects.vercel.app`(00:22:55 KST 생성)를 가리켰고, latest runtime blocker는 TLS chain failure에서 `relation "public.user_profiles" does not exist`로 좁혀졌다.
  - PASS — `supabase db push --linked --dry-run --yes`가 pending migration으로 `20260322065245_phase1_place_auth_real_data_foundation.sql` 1개만 제시했다.
  - PASS — `supabase db push --linked --yes`로 phase1 foundation migration을 exact linked project에 적용했다.
  - PASS — migration 적용 뒤 사용자 재시도 기준 production login success를 확인했다.

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - `.omx` plan/PRD/test spec과 현재 코드 경로를 다시 대조해 auth/session/place/review runtime contract를 점검했다.
  - auth bootstrap이 frontend Supabase listener가 아니라 `GET /api/auth/session` + app session cookie 기반인지 확인했다.
  - empty-state browse가 test mode mock seed가 아니라 실제 빈 `/api/place-list` 응답에서 오는지 확인했다.
  - duplicate place / review overwrite 규칙이 backend persistence 경계 안에서 유지되는지 확인했다.
  - recommendation runtime이 재도입되지 않았는지 현재 verified surface 기준으로 점검했다.
  - browse 지도 surface에서 level HUD / zoom button 비노출 구현과 live docs가 일치하는지 확인했다.
  - Figma node `61:18` thumbnail과 marker preview artifact를 비교해 사용자 추가 장소 marker / label visual language를 점검했다.
- 결과:
  - PASS — auth bootstrap은 backend-owned session cookie + CSRF contract로 동작한다.
  - PASS — production/dev runtime path에서 frontend direct Supabase session listener는 제거된 상태다.
  - PASS — clean DB에서는 browse가 valid empty state로 내려오고, place/review write 후에는 persisted data를 다시 읽는다.
  - PASS — duplicate place / overwrite review semantics는 backend API 응답(`confirm_required`, `updated`)으로 유지된다.
  - PASS — 이번에 검증한 local runtime surface에서는 recommendation UI/action 재도입이 보이지 않았다.
  - PASS — browse 지도 surface는 별도 level HUD / zoom button 없이 유지되고, map level state는 기존 browse/detail 동작과 함께 유지된다.
  - PASS — marker visual refresh는 24px concentric marker + 10px place-name label + 0.5px white stroke라는 Figma handoff 핵심 언어를 유지한다. 남는 차이는 type 색상 분기와 preview magnification 방식 수준이다.

## Browser Automation QA Evidence
- 실행 목적:
  - integrated local runtime에서 auth/session/bootstrap, empty browse, place create, refresh persistence, detail revisit, overwrite flow를 실제 브라우저로 검증한다.
  - Preview deploy/UI separation smoke(`vercel deploy`) 가능 여부를 확인하고, deploy 성공 시 `/`, `/places/:placeId`, static asset boot를 확인한다.
  - marker visual refresh slice에서는 reference thumbnail과 rendered marker preview를 비교해 visual fidelity를 빠르게 점검한다.
- 실행 명령 또는 스크립트:
  - local DB 준비: `node --input-type=module` + `pg`로 `public.place_reviews`, `public.places`를 비워 clean DB 상태를 만들었다.
  - runtime: `make dev`
  - browser automation: Playwright inline runner (`node --input-type=module`) 실행 후 결과를 `artifacts/qa/sprint-20/playwright-results.json`에 저장했다.
  - Preview 구조 수정 후 inventory 기록: `find api -maxdepth 3 -type f | sort` 결과를 before/after artifact로 저장했다.
  - preview deploy 재시도: `pnpm exec vercel deploy --yes`
  - Preview smoke 1차 확인: direct `curl` / Playwright로 anonymous 접근 시 Vercel deployment protection login wall(401)을 확인했다.
  - Preview smoke 2차 확인: `pnpm exec vercel curl / --deployment https://nurimap-5jf77rli7-jongmyeong-projects.vercel.app --yes`
  - Preview smoke 3차 확인: `pnpm exec vercel curl /places/smoke-place --deployment https://nurimap-5jf77rli7-jongmyeong-projects.vercel.app --yes`
  - Preview smoke 4차 확인: `pnpm exec vercel curl /assets/index-BDwYyS21.js --deployment https://nurimap-5jf77rli7-jongmyeong-projects.vercel.app --yes -- --head`
  - local map chrome 확인: `pnpm exec vercel dev --local --listen 127.0.0.1:4174 --yes` 실행 후, Playwright inline runner로 `?auth_test_state=authenticated` + mocked `/api/place-list` + mocked Kakao runtime 조합에서 browse map shell을 캡처했다.
  - marker visual preview: local HTML preview + Playwright screenshot으로 `artifacts/qa/sprint-20/map-user-added-marker-preview.png`를 생성하고, Figma thumbnail(`/tmp/nurimap-figma/node-61-18-thumb-1200.png`)과 비교했다.
- 확인한 시나리오:
  - local OTP request -> Mailpit 수신 -> OTP verify -> name entry -> authenticated shell 진입
  - `390x844` mobile에서 local auto-login bypass로 authenticated shell 진입
  - clean DB 기준 empty-state browse 확인
  - 직접 장소 등록 후 detail 진입 + 초기 리뷰 표시 확인
  - 새로고침 후 created place detail이 DB 기준으로 유지되는지 확인
  - `/places/:placeId` 직접 재진입 확인
  - 같은 장소 재등록 시 overwrite confirm 표시 및 review text 보존 확인
  - `1280x900` desktop에서 existing session cookie revisit 확인
  - desktop logout -> auth screen 복귀 -> reload 후 local auto-login relogin 확인
  - Preview deploy 재시도 후 실제 Preview URL 발급 확인
  - direct anonymous 접근 시 Preview URL의 `/` 및 `/places/preview-smoke`가 Vercel 로그인 페이지(401)로 보호되는지 확인
  - authenticated `vercel curl` 경로로 Preview URL의 `/`가 SPA HTML(`누리맵`, built asset reference 포함)을 반환하는지 확인
  - authenticated `vercel curl` 경로로 `/places/smoke-place`가 rewrite 후 동일한 SPA HTML을 반환하는지 확인
  - authenticated `vercel curl` 경로로 built JS asset(`/assets/index-BDwYyS21.js`)이 HTTP 200으로 내려오는지 확인
  - local browser automation에서 desktop/mobile browse map shell에 `map-level`, `map-zoom-controls`, `지도 확대`, `지도 축소` UI가 노출되지 않는지 확인
  - marker visual preview에서 동심원 marker와 outlined place-name label이 reference와 같은 방향인지 확인
- 판정:
  - PASS — local Supabase + integrated runtime 기준 핵심 browse/detail/create/overwrite/session persistence 흐름이 통과했다.
  - PASS — API test files를 `api/` 밖으로 이동하고 `.vercelignore`를 추가한 뒤 Preview deployment가 성공했다.
  - PASS — authenticated `vercel curl` smoke 기준으로 `/`, `/places/smoke-place`, static asset boot가 모두 확인됐다.
  - PASS — local mocked-runtime browser check에서 browse map shell에 level HUD / zoom button이 보이지 않았다.
  - PASS — marker visual preview는 Figma reference 대비 core motif(24px marker, white outer ring, orange inner ring, white center dot, 10px label with 0.5px white stroke)가 일치했다.
  - NOTE — direct anonymous 접근은 여전히 Vercel deployment protection login wall(HTTP 401)로 보호된다. 이는 현재 protection posture이며, 이번 slice의 deploy/UI separation smoke 자체를 막지는 않았다.
- 스크린샷 경로:
  - `artifacts/qa/sprint-20/local-otp-name-entry-success.png`
  - `artifacts/qa/sprint-20/mobile-empty-state.png`
  - `artifacts/qa/sprint-20/mobile-detail-after-create.png`
  - `artifacts/qa/sprint-20/mobile-detail-after-overwrite.png`
  - `artifacts/qa/sprint-20/desktop-revisit-with-session.png`
  - `artifacts/qa/sprint-20/desktop-after-relogin.png`
  - 상세 결과: `artifacts/qa/sprint-20/playwright-results.json`
  - OTP result summary: `artifacts/qa/sprint-20/local-otp-result.json`
  - API inventory before fix: `artifacts/qa/sprint-20/api-inventory-before.txt`
  - API inventory after fix: `artifacts/qa/sprint-20/api-inventory-after.txt`
  - `.vercelignore` snapshot: `artifacts/qa/sprint-20/vercelignore-after.txt`
  - Preview deploy log: `artifacts/qa/sprint-20/preview-deploy-latest.txt`
  - Preview smoke result: `artifacts/qa/sprint-20/preview-smoke-results.json`
  - Preview smoke summary (authenticated): `artifacts/qa/sprint-20/preview-smoke-summary-main.txt`
  - Preview screenshots: `artifacts/qa/sprint-20/preview-root.png`, `artifacts/qa/sprint-20/preview-place-rewrite.png`
  - Map chrome check: `artifacts/qa/sprint-20/map-no-zoom-controls-desktop-mocked-runtime.png`, `artifacts/qa/sprint-20/map-no-zoom-controls-mobile-mocked-runtime.png`
  - Map chrome check result: `artifacts/qa/sprint-20/map-no-zoom-controls-mocked-runtime-check.json`
  - Marker visual preview: `artifacts/qa/sprint-20/map-user-added-marker-preview.html`, `artifacts/qa/sprint-20/map-user-added-marker-preview.png`
  - Historical blocker log: `artifacts/qa/sprint-20/preview-deploy-blocker.txt`

## User QA Required
- 사용자 확인 항목:
  - auth UX 유지 여부
  - empty-state browse + 첫 등록 흐름
  - review overwrite 체감
  - browse 지도 surface가 이전보다 덜 복잡하고 자연스럽게 보이는지
- 사용자 수행 절차:
  1. `make dev`로 integrated local runtime을 실행한다.
  2. 앱이 자동 로그인되면 browse/list 진입 흐름이 이전과 비교해 어색하지 않은지 확인한다.
  3. 빈 목록 상태에서 장소를 하나 등록하고, detail / 새로고침 / 직접 재진입 흐름이 자연스러운지 확인한다.
  4. 같은 장소에 다시 평가를 남겨 overwrite confirm과 최종 detail 결과가 기대와 맞는지 확인한다.
- 기대 결과:
  - backend cutover 이후에도 핵심 흐름이 끊기지 않는다.
- 상태:
  - ready for handoff — local automated/browser evidence는 확보됐고, 이제 실제 사용자 체감 확인만 남았다.

# Issues Found

- local integrated runtime 기준 blocker는 발견하지 못했다.
- 일반 email OTP 입력/검증 UI는 local Mailpit 기반으로 별도 브라우저 증빙을 확보했다.
- 2026-03-23 기준 auth 회귀 복구 slice에서 일반 OTP request/verify는 publishable auth client로 분리되고, bypass와 별개인 `AUTH_ALLOWED_EMAILS` exact allowlist 정책이 추가됐다. non-local bypass 차단 정책은 유지한다.
- 2026-03-23 추가 auth hardening slice에서 첫 로그인은 implicit signup에 기대지 않도록 server pre-provision + `shouldCreateUser: false` 경로로 고정했고, provisioning 실패는 canonical `delivery_failed` 응답으로 수렴하도록 맞췄다.
- 같은 slice에서 `verifyLoginOtp`는 verified email이 허용 도메인 / explicit allowlist / local bypass 경계 안에 있는지 다시 확인한 뒤에만 app session을 만들도록 보강했다.
- confirmation-enabled disposable local Supabase 검증 기준으로, hosted `Confirm sign up` 템플릿을 `{{ .Token }}` 기반 OTP 메일로 바꾸면 missing user / existing unconfirmed user도 현재 `verifyOtp({ email, token, type: 'email' })` 계약으로 성공할 수 있음을 확인했다. 결과는 `.omx/plans/result-option-1-confirmation-template-otp-ux-validation.md`에 정리했다.
- 2026-03-22 `vercel env ls` 확인 결과, core Supabase/Postgres env(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)는 현재 Production에만 있고 Preview / Development에는 없다.
- 현재 합의된 전략에서는 Preview를 backend-integrated runtime으로 쓰지 않으므로, 위 env 부재는 즉시 blocker가 아니라 **Preview role을 UI/deploy separation으로 제한해야 한다는 근거**로 해석한다.
- 현재 코드 레벨에서는 `test` 전용 DB URL 분기를 지원하지만(`TEST_DATABASE_URL` 계열), local `.env.local`에는 아직 dedicated test target이 없다. 현재 단기 운영 모델은 reset 가능한 local DB를 isolated run에서 재사용하는 방식이다.
- Preview smoke를 다시 시도한 결과, Vercel Hobby plan의 12-function blocker는 구조 수정으로 해소됐다.
- direct anonymous 접근은 Vercel deployment protection login wall(HTTP 401)로 보호되지만, authenticated `vercel curl` smoke로는 `/`, `/places/smoke-place`, static asset boot를 확인할 수 있었다.
- Vercel deployment build log에는 `api/_lib/_authService.ts`의 `@supabase/supabase-js` 타입 export 관련 메시지가 출력되지만, local `tsc --noEmit` / project diagnostics는 0 errors이고 deployment도 성공했다. 현재는 non-blocking follow-up 관찰 항목으로 둔다.
- security hardening 이후 remote DB connection은 인증서 검증을 끄지 않으며, bypass는 local loopback runtime에서만 허용되고, place-entry / place-lookup에는 best-effort in-memory abuse guard가 추가됐다.
- 현재 판단 기준으로 push는 여전히 보수적으로 본다. 다만 그 이유는 “Preview에 backend env가 없어서”가 아니라, deploy impact 확인과 사용자 QA가 아직 닫히지 않았기 때문이다.
- 2026-03-24 production login failure는 두 단계로 드러났다.
  - 1차 blocker: `SELF_SIGNED_CERT_IN_CHAIN`
  - 2차 blocker: `relation "public.user_profiles" does not exist`
- 같은 incident에서 `GET /api/auth/verify-otp`의 `method_not_allowed`는 primary blocker가 아니라, POST failure 뒤에 관찰된 부수 symptom이었다.
- 이번 incident는 production auth rollout에서 **코드 배포**, **runtime env**, **DB schema/migration**을 별도 gate로 확인해야 한다는 점을 드러냈다. 한 gate가 해결돼도 다음 gate blocker가 즉시 나타날 수 있다.
- 최종 recovery path는 다음 순서였다.
  1. `DATABASE_SSL_ROOT_CERT` runtime path 확인
  2. TLS root-cert handling 코드 deploy
  3. exact production project에 `20260322065245_phase1_place_auth_real_data_foundation.sql` 적용
  4. production login 재시도 및 success 확인

# QA Verdict

- READY FOR HANDOFF — local integrated runtime 검증, structural Preview fix, Preview deployment 성공, authenticated Preview smoke evidence까지 확보됐다. 남은 sprint-level 항목은 사용자 QA와 push 판단이다.

# Follow-ups

- 현재 local execution evidence를 기준으로 사용자 QA handoff와 push / rollout 판단을 이어간다.
- hosted Supabase `Confirm sign up` 템플릿을 `{{ .Token }}` 기반 OTP UX로 바꾸는 option 1은 local confirmation-enabled reproduction에서 PASS였으므로, 실제 dashboard 적용 전에는 production/non-local mailbox에서 한 번 더 확인한다.
- `test`는 당분간 reset 가능한 local DB 재사용 모델로 유지하고, remote dev/test rollout이 안정화되면 dedicated `TEST_DATABASE_URL` / separate target 승격을 재검토한다.
- Preview deploy blocker는 해소됐고 authenticated smoke 절차도 확보됐으므로, 다음 판단은 Preview를 계속 auth-protected smoke로 유지할지, 별도 public smoke path까지 열 필요가 있는지 결정하는 것이다.
- Vercel build log에 보이는 `api/_lib/_authService.ts` 타입 export 메시지가 실제 deploy blocker로 승격되는지 모니터링한다.
- Preview에서 real backend verification이 꼭 필요해지는 시점이 오면, 그때 별도 non-production backend target 도입을 새로운 slice로 계획한다.
- auth/login production rollout check에는 앞으로도 최소한 active alias 확인, latest `/api/auth/verify-otp` log 확인, auth-critical migration 상태 확인, post-login `/api/auth/session` smoke를 함께 묶어 실행한다.
- server-only table이 `public` schema에 남는 동안에는 RLS / revoke 또는 private schema hardening을 follow-up rollout 대상으로 유지한다.
