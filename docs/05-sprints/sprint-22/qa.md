# Verification Scope

- Sprint 22 add-place Naver URL entry flow 검증

# Automated Checks Result

- 실행 결과:
  - `pnpm test:run src/app-shell/PlaceLookupFlow.test.tsx` → PASS (`1 passed`, `10 passed`)
  - `pnpm exec eslint src/app-shell/PlaceAddPanels.tsx src/app-shell/placeRepository.ts src/app-shell/PlaceLookupFlow.test.tsx` → PASS
  - `npx tsc --noEmit --project tsconfig.json` → PASS (`0 errors`)
  - `pnpm test:run` → PASS (`34 passed`, `287 passed`)
  - `pnpm test:run src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/app-shell/NaverUrlNormalization.test.tsx src/server-core/place/placeLookupService.test.ts src/server/apiPlaceLookupRoute.test.ts` → PASS (`5 passed`, `47 passed`)
  - `pnpm lint` → PASS
  - `pnpm build` → PASS
- 확인 포인트:
  - `/add-place`가 URL-entry step으로 시작한다.
  - `직접 입력하기`가 기존 manual form으로 연결된다.
  - `invalid_url`은 URL-entry step에 머무르며 inline error를 보여준다.
  - `invalid_url`이 아닌 lookup failure는 alert 후 기존 manual form으로 연결된다.
  - manual form 뒤로가기가 URL-entry step으로 복귀한다.
  - Naver URL normalize / short-link / lookup route contract가 새 흐름과 맞게 통과한다.

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - Figma node `85:24` 기준 URL-entry screen 반영 여부 점검
  - 기존 manual add-place form의 필드/등록 버튼/리뷰 입력/등록 성공 후 상세 이동 contract 유지 여부 검토
  - server lookup이 `naver.me` redirect, URL normalize, numeric placeId extraction, internal API/XHR lookup을 사용하는지 확인
  - architect verification으로 prefill lookup이 좌표 필수 성공 계약에 묶이지 않았는지 재검토
- 결과:
  - `/add-place`는 route를 유지한 채 URL-entry first flow로 전환되었다.
  - 기존 manual form contract는 유지되고, direct bypass와 non-`invalid_url` failure는 manual form으로 이어진다.
  - `invalid_url`은 URL-entry step에 머무르며 기존 brownfield inline field error 패턴으로 안내된다.
  - prefill lookup은 coordinate unavailable이어도 success 가능하도록 조정되었다.
  - desktop은 기존 sidebar shell 재사용 범위를 넘지 않도록 유지했다.

## Browser Automation QA Evidence
- 목적:
  - `/add-place` URL-entry fallback contract의 실제 브라우저 체감 확인
  - desktop `invalid_url` inline error 유지 / mobile non-`invalid_url` failure alert + manual fallback 확인
- 사용 도구 / 실행 명령:
  - Playwright + local Vite dev server (`http://localhost:5173`)
  - `node .omx/tmp/playwright-add-place-fallback-smoke.mjs`
- 실행 방식:
  - `auth_test_state=authenticated` dev override로 auth surface를 우회했다.
  - `/api/places`, `/api/place-lookups`, `/api/auth/session`은 Playwright route fulfill로 고정 응답을 주입해 fallback UI contract만 집중 확인했다.
- 확인 시나리오:
  - desktop `invalid_url` → URL-entry screen 유지, alert 없음, inline error 표시, 입력 수정 시 에러 해제
  - mobile `place_id_extraction_failed` → alert 표시 후 manual form 이동
- 판정:
  - PASS
- 결과 파일:
  - `artifacts/qa/sprint-22/playwright-add-place-fallback-smoke-result.json`
- 스크린샷:
  - `artifacts/qa/sprint-22/playwright-add-place-invalid-url-inline-error-desktop.png`
  - `artifacts/qa/sprint-22/playwright-add-place-lookup-failure-manual-fallback-mobile.png`

## User QA Required
- 사용자 확인 항목:
  - mobile/desktop `/add-place`에서 URL-entry screen이 의도한 Figma handoff와 맞는지
  - URL 입력 후 `장소 정보 가져오기` loading spinner 상태가 의도대로 보이는지
  - `invalid_url` inline error와 non-`invalid_url` failure alert + manual fallback 흐름이 실제 사용감상 자연스러운지
- 기대 결과:
  - 사용자는 먼저 URL-entry screen을 보고, 원하면 바로 직접 입력으로도 넘어갈 수 있다.
  - 잘못된 URL은 현재 화면에서 바로 수정할 수 있고, 다른 추출 실패는 직접 입력으로 자연스럽게 이어진다.
- 상태:
  - automated checks 완료
  - AI Agent interactive QA 완료
  - Browser automation QA 완료
  - 사용자 직접 visual / interaction QA 완료
  - 사용자 확인 결과: 의도한 변경 사항과 실제 동작이 맞음을 확인

# Issues Found
- 없음

# QA Verdict
- PASS

# Follow-ups
- real backend / real auth session 조합의 end-to-end smoke는 필요 시 `artifacts/qa/sprint-22/`에 추가 기록한다.
- 실제 운영 환경에서 Naver internal API/XHR 응답 정책 변화 여부는 follow-up으로 모니터링한다.
