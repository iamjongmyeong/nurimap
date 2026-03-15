# Sprint Goal

- Sprint 17에서 최소 hybrid routing으로 `/places/:placeId`와 `/auth/verify` 진입점을 도입하고, 기존 Zustand 기반 app-shell과 `place_add_open` surface를 유지한다.
- auth refresh / hard refresh 무한 로딩, verify-link failure UX, 이메일 재전송 정책/카피, 지도 runtime fallback UX를 함께 정리해 production 진입 경계를 안정화한다.

# In Scope

- 최소 hybrid routing 도입
  - `/`, `/places/:placeId`, `/auth/verify` 경로를 기준으로 앱 진입 구조를 정리한다.
  - canonical path/history 기반의 최소 routing boundary를 도입하되, 기존 `AuthProvider -> NurimapAppShell` 구조는 가능한 한 유지한다.
- place detail canonical URL 도입
  - `/places/:placeId`를 detail의 durable URL source of truth로 사용한다.
  - 데스크톱에서는 기존 sidebar 내부 detail surface를 유지하고, 모바일에서는 full-screen detail page를 유지한다.
  - 목록 선택 / 지도 마커 선택 / detail back / browser back / refresh / direct URL paste 시 route와 선택 상태를 동기화한다.
  - invalid `placeId` 진입 시 graceful fallback 정책을 정의하고 구현한다.
- 기존 app-shell state 유지 범위 고정
  - `place_add_open`, `mobile_place_list_open`, `mapLevel`, `placeListLoad`, `placeDetailLoad`, draft form state는 계속 Zustand가 관리한다.
  - `selectedPlaceId`는 route param이 있을 때 route와 sync하고, route param이 없을 때는 마지막 focus/selection 의미로 유지한다.
- place add flow는 route로 분리하지 않고 현재 surface를 유지한다.
  - `장소 추가` 진입/닫기 시 URL은 바뀌지 않는다.
  - 등록 성공 후에는 결과 place의 canonical detail route(`/places/:placeId`)로 이동한다.
- auth bootstrap hardening
  - `request-link`, `verify-link` 네트워크 요청에 실제 timeout을 적용한다.
  - login link는 `verify-link` 단계에서 즉시 consumed 처리하지 않고, 실제 session adoption 성공 후 `consume-link` 단계에서 consumed 처리한다.
  - refresh, logout 후 재로그인, stale verify entry, hard refresh 유사 상황에서도 `loading`/`verifying`가 무한 지속되지 않고 terminal auth state로 수렴하게 한다.
  - auth failure screen은 브랜드 영역 + `인증에 실패했어요 🥲` 제목 + 2줄 centered body + 세로 CTA(`새 링크 받기`, `이메일 다시 입력`)를 사용한다.
  - `expired`는 `로그인 링크가 만료됐어요.\n새 로그인 링크를 받아주세요.`로, `used`는 `이미 사용한 링크예요.\n새 로그인 링크를 받아주세요.`로, `invalidated`는 `로그인 링크가 만료됐어요.\n새 로그인 링크를 받아주세요.`로 표시한다.
- auth verify route migration
  - 신규 canonical auth entry는 `/auth/verify?email=...&nonce=...`를 사용한다.
  - migration 동안 legacy `/?auth_mode=verify&email=...&nonce=...` query도 계속 지원한다.
  - mail link generation은 same-sprint에서 `/auth/verify` path로 cutover하되, client는 dual support 상태를 유지한다.
- 이메일 재전송 정책 변경
  - 동일 이메일은 한 cooldown cycle 안에서 최대 5회까지 즉시 재전송 가능하다.
  - 6번째 요청부터는 5분 cooldown을 적용한다.
  - cooldown이 끝나면 해당 이메일의 resend burst count는 reset된다.
  - 기존 `즉시 cooldown + 하루 5회 제한` 정책은 이번 Sprint의 source of truth가 아니다.
- auth UX writing 변경
  - cooldown 남은 시간은 `MM분 SS초 후에 다시 시도해주세요.` 형식을 사용한다.
  - 분이 0이면 `SS초 후에 다시 시도해주세요.`만 표시한다.
- deployed place-entry API hardening
  - Vercel `/api/place-entry` 경계에서 unexpected error가 HTML server error 대신 JSON 500 payload로 반환되도록 정리한다.
  - `api/**` 상대 import는 explicit `.js` specifier 규칙을 지키도록 regression guard를 추가한다.
- request-link delivery observability 보강
  - request-link 단계별 timing과 Resend accepted/delivery_failed metadata를 운영 로그에 남겨 mailbox arrival delay를 구분 가능하게 만든다.
- 지도 runtime fallback UX 정리
  - Kakao SDK loading 상태에서는 약한 placeholder 배경 위에 spinner와 `지도를 불러오는 중이에요.` 문구를 표시한다.
  - Kakao SDK load failure 또는 runtime unavailable 상태에서는 현재 맥락 안에서 `지도를 불러오지 못했어요.` 제목, `네트워크 상태를 확인한 뒤 다시 시도해주세요.` 설명, `다시 시도` 버튼을 표시한다.
  - 테스트/JSDOM용 deterministic fallback renderer는 유지하되, 실사용 runtime loading/failure UI와 역할을 분리한다.
- source-of-truth 문서 업데이트 계획 수립 및 반영
  - `docs/03-specs/02-map-rendering.md`
  - `docs/03-specs/03-list-browse.md`
  - `docs/03-specs/04-place-detail.md`
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/01-product/user-flows/auth-and-name-entry.md`
  - `docs/04-design/browse-and-detail.md`
  - `docs/04-design/auth-and-name-entry.md`
- Sprint 17 문서 세트 생성 및 QA handoff 기준 정리
  - `docs/05-sprints/sprint-17/planning.md`
  - `docs/05-sprints/sprint-17/qa.md`
  - `docs/05-sprints/sprint-17/review.md`

# Out Of Scope

- `/add-place` route 또는 `?panel=add` 같은 URL-backed place add surface 도입
- `/login` 전용 route 분리와 auth public/private shell 재구성
- place persistence / domain model / API contract의 대규모 재설계
- Kakao Maps SDK를 다른 지도 provider로 교체하는 작업
- browse/detail visual hierarchy 자체의 대규모 리디자인
- detail not-found 전용 페이지 추가
- 별도의 anti-abuse 정책 재설계나 외부 auth provider 교체

# Selected Specs

- `docs/03-specs/02-map-rendering.md`
- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/05-auth-email-login-link.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/01-product/user-flows/auth-and-name-entry.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/auth-and-name-entry.md`
- `docs/04-design/foundations.md`
- `docs/03-specs/01-app-shell-and-layout.md` (legacy floating-detail wording / route 분리 이전 app-shell 참고용)
- `docs/00-governance/agent-workflow.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `docs/06-history/decisions.md`

# Constraints

- `place_add_open`과 `mobile_place_list_open`은 이번 Sprint에서도 internal UI state로 유지한다. `/add-place`는 도입하지 않는다.
- durable/shareable state는 route가 관리하고, transient/view-local state는 Zustand가 관리한다.
  - route: `/`, `/places/:placeId`, `/auth/verify`
  - Zustand: `selectedPlaceId`, `mapLevel`, `placeListLoad`, `placeDetailLoad`, `place_add_open`, `mobile_place_list_open`, draft form state
- route/store bridge는 UI layer에서 수행한다. store action 안에서 `navigate()`를 직접 호출하지 않는다.
- `/places/:placeId`는 같은 canonical route이지만, 데스크톱은 sidebar detail, 모바일은 full-screen detail이라는 현재 responsive contract를 유지한다.
- mobile detail의 기존 `pushState/popstate` bridge는 route 기반 browser back 검증이 통과한 뒤 제거한다.
- auth flow는 refresh/hard refresh 유사 상황에서도 `auth_required`, `auth_failure`, `name_required`, `authenticated` 중 하나의 terminal state로 수렴해야 하며, `loading`/`verifying`에 장시간 머물면 안 된다.
- auth verify migration 동안 client는 legacy root query와 신규 `/auth/verify` path를 모두 받아들여야 한다.
- 사용자 요청 기준으로 기존 `즉시 5분 cooldown + 하루 5회 제한` 정책은 이번 Sprint source of truth가 아니다. 동일 이메일은 burst 5회까지 즉시 재전송 가능하고, 6번째부터 cooldown을 적용하며 cooldown 종료 후 burst count를 reset한다.
- cooldown 카피는 `MM분 SS초 후에 다시 시도해주세요.` 형식을 사용하고, 분이 0이면 초만 표시한다.
- runtime browser의 지도 loading/failure 상태에서는 현재 navy fake-map fallback을 사용자-facing UI로 사용하지 않는다.
- test/JSDOM에서 deterministic Kakao fallback renderer를 유지하는 경우에도 runtime loading/error UX와 역할을 섞지 않는다.
- routing, auth policy, map fallback처럼 이후 Sprint에도 영향을 주는 비자명한 선택은 `docs/06-history/decisions.md`에 기록한다.

# Agent Instructions

- 구현 순서는 auth hardening -> auth failure UX 정리 -> resend policy/source-of-truth 정리 -> `/places/:placeId` 도입 -> `/auth/verify` dual support -> mail link cutover 순서를 우선한다.
- `src/app-shell/NurimapAppShell.tsx`에는 route-aware shell logic를 두되, map/list/detail body 자체는 가능한 한 재사용한다.
- `selectedPlaceId`를 지도의 focus/selection anchor로 유지하되, detail open 여부는 route가 source of truth가 되도록 계획한다.
- `src/server/*`와 `api/_lib/*`는 auth policy / auth service 경계가 duplicated boundary이므로, policy/URL/message 변경 시 두 경로를 함께 수정하고 테스트도 짝으로 맞춘다.
- auth failure reason raw code(`expired`, `used`, `invalidated`)를 그대로 사용자 화면에 노출하지 않는다.
- reported production symptoms(새로고침 후 무한 로딩, logout 후 재로그인 무한 로딩, verify-link 400, map runtime fallback 시 이상한 화면)를 Sprint 17 QA에서 재현/검증 대상으로 명시한다.
- map fallback 작업은 실사용 runtime의 loading/error UX 정리가 목적이다. 테스트용 deterministic fallback renderer 유지 자체가 목적이 아니다.
- 문서 우선순위는 `planning.md` > selected spec > user flow > design으로 해석한다.
- `docs/03-specs/01-app-shell-and-layout.md`의 legacy floating detail wording은 이번 Sprint selected spec이 아니다. routing 도입 이후 필요 시 legacy note 또는 후속 cleanup 대상으로만 다룬다.

# Done Criteria

- `/places/:placeId` direct entry가 데스크톱/모바일 모두에서 현재 UX contract에 맞게 열린다.
- desktop에서는 `/places/:placeId`가 sidebar detail로, mobile에서는 full-screen detail로 표시된다.
- detail back / browser back / refresh / direct URL paste가 모두 current context를 보존하며 동작한다.
- `place_add_open`은 internal state로 유지되고, add flow 진입/닫기 시 URL이 바뀌지 않는다.
- place 등록 성공 후에는 결과 place의 `/places/:placeId` route로 이동한다.
- auth refresh / hard refresh / logout 후 재로그인 경로에서 `loading` 또는 `verifying` 무한 지속이 재현되지 않는다.
- `/auth/verify`와 legacy root verify query가 migration 동안 모두 동작한다.
- auth failure screen은 reference-aligned redesign layout(`인증에 실패했어요 🥲`, 2줄 body, 세로 CTA)을 사용한다.
- auth verify failure는 각각 `로그인 링크가 만료됐어요.\n새 로그인 링크를 받아주세요.`, `이미 사용한 링크예요.\n새 로그인 링크를 받아주세요.`, `로그인 링크가 만료됐어요.\n새 로그인 링크를 받아주세요.`로 표시되고 raw code가 화면에 드러나지 않는다.
- 동일 이메일 재전송은 burst 5회까지 즉시 허용되고, 6번째부터 cooldown이 적용되며, 남은 시간 카피가 요청한 형식으로 표시된다.
- 지도 loading 상태에서는 약한 placeholder 배경 위에 spinner와 `지도를 불러오는 중이에요.` 문구가 보이고, 가짜 마커/가짜 지도 화면은 보이지 않는다. 지도 failure/unavailable 상태에서는 `지도를 불러오지 못했어요.`, `네트워크 상태를 확인한 뒤 다시 시도해주세요.`, `다시 시도`가 보이며, 현재 navy fake-map 화면이 user-facing loading/failure UI로 남지 않는다.
- selected specs, user flows, design docs, Sprint 문서, 테스트가 실제 구현 기준과 일치한다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - `/` 및 `/places/:placeId` direct entry / refresh / invalid place fallback 검증
  - marker/list click -> canonical detail route 이동 검증
  - detail back / browser back / selected place / map focus 유지 검증
  - place add 진입/닫기 시 URL non-change 검증
  - 등록 성공 후 canonical detail route 이동 검증
  - verify-link / request-link pending hang timeout 수렴 검증
  - `expired` / `used` / `invalidated` failure reason 한국어 매핑 검증
  - resend burst 5회 허용, 6번째 cooldown, cooldown copy formatting 검증
  - map runtime loading / unavailable / error fallback state 검증
- 실행 주체:
  - AI Agent
- 종료 기준:
  - `pnpm exec vitest run src/App.test.tsx src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/auth/AuthFlow.test.tsx src/server/authPolicy.test.ts src/server/authService.test.ts`
  - 필요 시 관련 테스트를 추가한 뒤 `pnpm lint`

## AI Agent Interactive QA
- 대상 시나리오:
  - route/store sync 후 desktop sidebar detail / mobile full-screen detail contract 유지 여부 확인
  - auth failure screen에서 raw code 노출 없이 리디자인된 한국어 failure copy만 보이고, generic failure는 `인증에 실패했어요. 로그인 링크를 다시 받아주세요.`로 보이는지 확인
  - hard refresh / refresh / logout -> relogin 경로에서 auth terminal-state convergence 확인
  - map loading placeholder와 failure UI가 기존 browse/detail 맥락을 깨지 않는지 확인
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 구현 diff와 실제 렌더 결과를 비교해 route ownership, auth convergence, map fallback UX가 설명 가능하다.

## Browser Automation QA
- 대상 시나리오:
  - desktop/mobile viewport에서 `/places/:placeId` direct entry, marker/list click, back, browser back, reload 확인
  - `/auth/verify` 신규 경로와 legacy root query의 refresh-time verify 동작 확인
  - 실제 브라우저에서 logout 후 재로그인 및 stale/used link failure path 확인
  - Kakao SDK request 실패 또는 unavailable 상황에서 loading/failure fallback UI 확인
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright를 우선 사용해 주요 흐름을 캡처하고 판정을 남긴다. Playwright가 실패하면 `agent-browser`로 대체한다.
- 예상 증빙 경로:
  - `artifacts/qa/sprint-17/`

## User QA Required
- 사용자 확인 항목:
  - deployed 환경에서 실제 로그인 메일 수신 후 `/auth/verify` 링크 클릭/재전송/이전 링크 실패 확인
  - macOS 브라우저에서 `Command + Shift + R` hard refresh 후 auth/bootstrap이 무한 로딩 없이 수렴하는지 확인
  - deployed 환경에서 지도 로딩 실패가 발생하는 브라우저/네트워크 조합이 있다면 loading/failure fallback UX 체감 확인
- 기대 결과:
  - 실제 이메일 링크가 canonical auth entry로 동작하고, 재전송 정책/카피/이전 링크 invalidation UX가 의도대로 보인다.
  - hard refresh 후에도 auth screen 또는 app shell의 terminal state가 나타난다.
  - 지도 실패 상황에서 이상한 navy fake-map 대신 명시적 loading/failure UI를 인지할 수 있다.
- handoff 조건:
  - automated / browser QA가 통과했고, user QA는 deployed env의 실제 메일 delivery와 hard refresh behaviour 확인 단계만 남는다.

# Active Changes

## CHG-01 Minimal hybrid routing with canonical detail URL
- Why:
  - detail은 shareable/direct-entry 가능한 durable URL이 필요하지만, `place_add_open`과 app-shell surface는 내부 상태로 유지해야 한다.
- Outcome:
  - `/places/:placeId`를 canonical detail route로 도입하고, desktop/mobile detail contract를 유지한 채 route/store sync를 정리한다.
- Touched Docs:
  - `docs/05-sprints/sprint-17/planning.md`
  - `docs/03-specs/03-list-browse.md`
  - `docs/03-specs/04-place-detail.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/04-design/browse-and-detail.md`
- Verify:
  - `src/App.test.tsx`
  - `src/app-shell/NurimapBrowse.test.tsx`
  - `src/app-shell/NurimapDetail.test.tsx`
  - browser QA deep-link / back / refresh evidence
- Status: draft

## CHG-02 Auth bootstrap hardening and verify-route migration
- Why:
  - refresh / hard refresh / logout 후 재로그인에서 auth가 `loading`/`verifying`에 머무를 수 있고, verify-link failure raw reason UX도 정리되어야 한다.
- Outcome:
  - auth network timeout, terminal-state convergence, `/auth/verify` dual support, failure reason 한국어 매핑을 고정한다.
- Touched Docs:
  - `docs/05-sprints/sprint-17/planning.md`
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/01-product/user-flows/auth-and-name-entry.md`
  - `docs/04-design/auth-and-name-entry.md`
- Verify:
  - `src/auth/AuthFlow.test.tsx`
  - browser QA refresh / stale verify / used link / invalidated link evidence
- Status: draft

## CHG-03 Auth resend policy and UX writing update
- Why:
  - 사용자 요청으로 동일 이메일 재전송 정책을 `즉시 5회 허용 후 cooldown`으로 바꾸고, cooldown 카피도 새로운 형식으로 바꿔야 한다.
- Outcome:
  - 기존 `즉시 cooldown + 하루 5회 제한`을 대체하는 resend burst policy와 countdown copy를 source of truth로 고정한다.
- Touched Docs:
  - `docs/05-sprints/sprint-17/planning.md`
  - `docs/03-specs/05-auth-email-login-link.md`
  - `docs/01-product/user-flows/auth-and-name-entry.md`
  - `docs/04-design/auth-and-name-entry.md`
- Verify:
  - `src/server/authPolicy.test.ts`
  - `src/server/authService.test.ts`
  - `src/auth/AuthFlow.test.tsx`
- Status: draft

## CHG-04 Map runtime loading/failure fallback UX clarification
- Why:
  - 현재 runtime browser에서 Kakao map이 준비되지 않으면 사용자에게 navy fake-map fallback이 보여 체감상 실패/로딩 상태가 불명확하다.
- Outcome:
  - runtime loading은 spinner/placeholder, runtime failure/unavailable은 retry 가능한 에러 UI로 분리하고, test fallback renderer와 역할을 구분한다.
- Touched Docs:
  - `docs/05-sprints/sprint-17/planning.md`
  - `docs/03-specs/02-map-rendering.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/04-design/browse-and-detail.md`
- Verify:
  - `src/app-shell/NurimapBrowse.test.tsx`
  - browser QA Kakao SDK unavailable/error evidence
- Status: draft
