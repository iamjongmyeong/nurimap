# Verification Scope

- Sprint 20의 real-data migration에서 docs/runtime lock, auth cookie cutover, place/review persistence, recommendation regression guard를 검증한다.
- 구현의 상세 acceptance criteria와 test matrix는 `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`를 SSOT로 사용한다.

# Automated Checks Result

- 실행 명령:
  - `supabase status`
  - `make check`
- 결과:
  - PASS — local Supabase가 실행 중이며 local API / DB endpoint가 정상 노출됐다.
  - PASS — `make check` → `vitest` 25 files / 178 tests 통과, `pnpm lint` 통과, `pnpm build` 통과

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - `.omx` plan/PRD/test spec과 현재 코드 경로를 다시 대조해 auth/session/place/review runtime contract를 점검했다.
  - auth bootstrap이 frontend Supabase listener가 아니라 `GET /api/auth/session` + app session cookie 기반인지 확인했다.
  - empty-state browse가 test mode mock seed가 아니라 실제 빈 `/api/place-list` 응답에서 오는지 확인했다.
  - duplicate place / review overwrite 규칙이 backend persistence 경계 안에서 유지되는지 확인했다.
  - recommendation runtime이 재도입되지 않았는지 현재 verified surface 기준으로 점검했다.
- 결과:
  - PASS — auth bootstrap은 backend-owned session cookie + CSRF contract로 동작한다.
  - PASS — production/dev runtime path에서 frontend direct Supabase session listener는 제거된 상태다.
  - PASS — clean DB에서는 browse가 valid empty state로 내려오고, place/review write 후에는 persisted data를 다시 읽는다.
  - PASS — duplicate place / overwrite review semantics는 backend API 응답(`confirm_required`, `updated`)으로 유지된다.
  - PASS — 이번에 검증한 local runtime surface에서는 recommendation UI/action 재도입이 보이지 않았다.

## Browser Automation QA Evidence
- 실행 목적:
  - integrated local runtime에서 auth/session/bootstrap, empty browse, place create, refresh persistence, detail revisit, overwrite flow를 실제 브라우저로 검증한다.
  - Preview deploy/UI separation smoke(`vercel deploy`) 가능 여부를 확인한다.
- 실행 명령 또는 스크립트:
  - local DB 준비: `node --input-type=module` + `pg`로 `public.place_reviews`, `public.places`를 비워 clean DB 상태를 만들었다.
  - runtime: `make dev`
  - browser automation: Playwright inline runner (`node --input-type=module`) 실행 후 결과를 `artifacts/qa/sprint-20/playwright-results.json`에 저장했다.
  - preview smoke 시도: `pnpm exec vercel deploy --yes`
- 확인한 시나리오:
  - `390x844` mobile에서 local auto-login bypass로 authenticated shell 진입
  - clean DB 기준 empty-state browse 확인
  - 직접 장소 등록 후 detail 진입 + 초기 리뷰 표시 확인
  - 새로고침 후 created place detail이 DB 기준으로 유지되는지 확인
  - `/places/:placeId` 직접 재진입 확인
  - 같은 장소 재등록 시 overwrite confirm 표시 및 review text 보존 확인
  - `1280x900` desktop에서 existing session cookie revisit 확인
  - desktop logout -> auth screen 복귀 -> reload 후 local auto-login relogin 확인
  - Preview deploy 시도는 Vercel Hobby plan의 serverless function limit에서 차단됨
- 판정:
  - PASS — local Supabase + integrated runtime 기준 핵심 browse/detail/create/overwrite/session persistence 흐름이 통과했다.
  - BLOCKED — Preview deploy/UI smoke는 `No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan` 에러로 수행하지 못했다.
- 스크린샷 경로:
  - `artifacts/qa/sprint-20/mobile-empty-state.png`
  - `artifacts/qa/sprint-20/mobile-detail-after-create.png`
  - `artifacts/qa/sprint-20/mobile-detail-after-overwrite.png`
  - `artifacts/qa/sprint-20/desktop-revisit-with-session.png`
  - `artifacts/qa/sprint-20/desktop-after-relogin.png`
  - 상세 결과: `artifacts/qa/sprint-20/playwright-results.json`
  - Preview blocker log: `artifacts/qa/sprint-20/preview-deploy-blocker.txt`

## User QA Required
- 사용자 확인 항목:
  - auth UX 유지 여부
  - empty-state browse + 첫 등록 흐름
  - review overwrite 체감
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
- 이번 Playwright pass는 `.env.local`의 local auto-login bypass를 사용했기 때문에, 일반 email OTP 입력/검증 UI 자체의 브라우저 증빙은 별도 실행이 필요하다.
- 2026-03-22 `vercel env ls` 확인 결과, core Supabase/Postgres env(`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)는 현재 Production에만 있고 Preview / Development에는 없다.
- 현재 합의된 전략에서는 Preview를 backend-integrated runtime으로 쓰지 않으므로, 위 env 부재는 즉시 blocker가 아니라 **Preview role을 UI/deploy separation으로 제한해야 한다는 근거**로 해석한다.
- 현재 코드 레벨에서는 `test` 전용 DB URL 분기를 지원하지만(`TEST_DATABASE_URL` 계열), local `.env.local`에는 아직 dedicated test target이 없다. 현재 단기 운영 모델은 reset 가능한 local DB를 isolated run에서 재사용하는 방식이다.
- Preview smoke를 실제로 시도했지만, Vercel Hobby plan의 serverless function limit(12 functions) 때문에 preview deployment 자체가 차단됐다.
- 따라서 Preview deploy/UI smoke는 “증빙 미수집”이 아니라 **구체적 플랫폼 blocker가 확인된 상태**다.
- 현재 판단 기준으로 push는 여전히 보수적으로 본다. 다만 그 이유는 “Preview에 backend env가 없어서”가 아니라, deploy impact 확인과 사용자 QA가 아직 닫히지 않았기 때문이다.

# QA Verdict

- IN PROGRESS — local integrated runtime 검증은 통과했고 단기 `test` 운영 모델도 정리됐지만, explicit email OTP UX evidence / Preview deploy smoke / 사용자 QA가 아직 남아 있다.

# Follow-ups

- 현재 local execution evidence를 기준으로 사용자 QA handoff와 push / rollout 판단을 이어간다.
- `test`는 당분간 reset 가능한 local DB 재사용 모델로 유지하고, remote dev/test rollout이 안정화되면 dedicated `TEST_DATABASE_URL` / separate target 승격을 재검토한다.
- 필요하면 local auto-login bypass를 끈 별도 browser pass로 email OTP request/verify UI를 추가 검증한다.
- Preview deploy/UI smoke blocker를 기준으로, Vercel Hobby function limit을 우회할지(플랜/구성 변경) 아니면 현재 slice에서는 Preview evidence를 blocker로 기록한 채 종료할지 결정한다.
- Preview에서 real backend verification이 꼭 필요해지는 시점이 오면, 그때 별도 non-production backend target 도입을 새로운 slice로 계획한다.
