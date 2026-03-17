# Sprint Goal

- 로그인 이후 실제 Kakao 지도 런타임에서 목록 item 선택 시 장소 상세 패널이 즉시 보이고, 마우스 휠 스크롤 여부와 무관하게 계속 유지되도록 복구한다.
- 지도 위에 보이는 `내부 장소 지도를 위한 앱 셸` hero copy를 제거하고, 공식 Kakao Maps JavaScript API 방식의 확대/축소 control을 노출한다.
- 장소 추가 흐름에서 사용자가 제공한 3개 URL(`naver.me`, `favorite`, `search`)이 모두 동일한 `naver_place_id = 1648359924`로 정규화되고 조회 성공까지 이어지도록 만든다.
- 인증 링크 진입 URL 또는 인증 직후 URL에서 새로고침해도 `로그인 링크를 확인하는 중입니다.` 상태에 무한히 머물지 않도록 auth bootstrap을 terminal-state-safe 하게 만든다.

# In Scope

- 목록 클릭 후 상세 패널이 보이지 않거나 스크롤 중에만 보이는 런타임 회귀를 재현하고, `src/app-shell/NurimapAppShell.tsx`, `src/app-shell/MapPane.tsx` 중심으로 레이어/페인팅/상세 패널 표시 계약을 복구한다.
- `src/app-shell/MapPane.tsx`의 상단 hero HUD에서 `내부 장소 지도를 위한 앱 셸`/`Plan 02` copy를 제거하고, 테스트에 필요한 상태 노출 방식은 최소 UI 또는 비시각적 hook으로 재정리한다.
- Kakao Maps JavaScript API 공식 문서 기준으로 지도 확대/축소 control을 노출하고, `mapLevel` store와 동기화되도록 정리한다.
- `src/app-shell/naverUrl.ts`, `api/_lib/_naverUrl.ts`, `src/server/placeLookupService.ts`, `api/_lib/_placeLookupService.ts` 및 fixture 파일에서 URL 정규화/조회 계약을 확장해 `naver.me` short link와 `favorite/.../place/{id}` 형식을 지원한다.
- `src/app-shell/NaverUrlNormalization.test.tsx`, `src/app-shell/PlaceLookupFlow.test.tsx`, `src/server/placeLookupService.test.ts`, `src/app-shell/NurimapBrowse.test.tsx`, `src/app-shell/NurimapDetail.test.tsx`를 Sprint 13 회귀 테스트 기준으로 보강한다.
- `src/auth/AuthProvider.tsx`, `src/auth/AuthFlow.test.tsx`를 중심으로 auth verify bootstrap 예외/refresh 회귀를 방지한다.
- Sprint 13 범위에서 필요한 spec / architecture / sprint 문서를 동기화한다.

# Out Of Scope

- 인증 방식, 로그인 메일 UX, 이름 입력 흐름 자체를 재설계하는 작업
- 전체 지도/사이드바 레이아웃의 전면 redesign 또는 marker clustering 도입
- Naver place lookup을 fixture-backed adapter 범위를 넘어 전면 실 API 연동으로 교체하는 작업
- Naver deep link native scheme 최적화, 추천/리뷰 정책 변경, 모바일 정보 구조 재설계
- Sprint 13 범위를 넘어서는 성능 최적화나 지도 기능 확장(예: 군집화, 필터 패널, 다중 선택)

# Selected Specs

- `docs/03-specs/01-app-shell-and-layout.md`
- `docs/03-specs/02-map-rendering.md`
- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/05-auth-email-login-link.md`
- `docs/03-specs/06-naver-url-normalization.md`
- `docs/03-specs/07-place-data-extraction.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/product-overview.md`
- `docs/01-product/product-principles.md`
- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/01-product/user-flows/auth-and-name-entry.md`
- `docs/01-product/user-flows/place-submission.md`
- `docs/04-design/auth-and-name-entry.md`
- `docs/99-archive/04-design/foundations.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/place-submission.md`
- `docs/99-archive/02-architecture/integrations.md`
- `docs/99-archive/02-architecture/system-context.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `docs/06-history/decisions.md`

# Constraints

- Sprint 13 구현은 TDD로 진행한다. 먼저 실패하는 테스트를 추가/수정한 뒤 구현하고 검증한다.
- 데스크톱 상세는 계속 `390px` floating panel이어야 하며, 지도 배경이 패널 뒤에서 유지돼야 한다. 상세를 별도 페이지/드로어로 바꾸지 않는다.
- `내부 장소 지도를 위한 앱 셸` 시각적 copy는 제거하되, 기존 자동 테스트가 의존하는 지도 상태 관측 포인트(`map-center`, `map-level`)는 대체 전략을 함께 정리한다.
- 확대/축소 control은 Kakao Maps JavaScript API 공식 문서의 `Map.addControl` + `ZoomControl` 계약을 우선 사용한다. 테스트/비런타임 fallback에서만 동등한 DOM 제어를 별도로 둘 수 있다.
- 사용자가 제공한 3개 URL은 모두 canonical URL `https://map.naver.com/p/entry/place/1648359924`로 수렴해야 한다. 2026-03-12 기준 `https://naver.me/I55a1Ogw`는 위 canonical entry URL로 redirect된다.
- short link 해석처럼 네트워크 해석이 필요한 URL은 클라이언트에서 추정 처리하지 말고 서버 경계에서 authoritative 하게 처리한다.
- URL 파서가 클라이언트와 서버에 중복돼 있는 현 구조는 Sprint 13에서 동일 계약으로 정리한다. 필요하면 shared helper 또는 server-authoritative validation으로 축소한다.
- auth verify bootstrap은 refresh / 예외 / stale verify query가 있어도 반드시 terminal auth state로 수렴해야 한다.
- 구조/상태/API 경계 변경이 비자명하면 `docs/06-history/decisions.md`에 기록한다.

# Agent Instructions

- 구현 시작 전 `docs/03-specs/02-map-rendering.md`, `docs/03-specs/06-naver-url-normalization.md`, `docs/03-specs/07-place-data-extraction.md`, `docs/99-archive/02-architecture/integrations.md`에서 Sprint 13 delta를 먼저 흡수한다.
- 프런트엔드 구현 단계에 들어가면 `vercel-react-best-practices`와 `frontend-design` skill을 먼저 적용한다.
- 목록 클릭 후 상세 패널 비가시화는 JSDOM fallback에서만 판단하지 말고, 로그인 후 실제 Kakao SDK 런타임에서 재현/검증한다.
- `src/app-shell/MapPane.tsx`의 지도 surface와 `src/app-shell/NurimapAppShell.tsx`의 상세 패널/추가 패널 사이 stacking context, `z-index`, `backdrop-blur`, repaint/compositing 영향을 먼저 확인한다.
- user 제공 URL 3개를 고정 회귀 fixture로 취급한다. Sprint 종료 기준은 세 URL 모두 동일 canonical place로 lookup success까지 통과하는 것이다.
- `src/server/fixtures/placeLookupFixtures.ts`와 `api/_lib/_placeLookupFixtures.ts`의 중복 fixture도 함께 점검해 `1648359924`에 대한 lookup 성공 데이터를 동일하게 맞춘다.
- 확대/축소 control은 마우스 휠 대체 수단이 아니라 별도 affordance여야 하므로, 실제 UI 노출 여부와 state sync를 모두 검증한다.
- auth refresh 회귀는 `AuthProvider` bootstrap 분기에서 해결하고, auth UX 자체를 재설계하지 않는다.

# Execution Sequence

1. **문서/계약 동기화 선행**
   - Sprint 13에서 지원해야 하는 지도 control, hero copy 제거, URL 형식 확장 범위를 planning/spec/architecture 문서에 반영한다.
   - 관련 파일: `docs/05-sprints/sprint-13/planning.md`, `docs/03-specs/02-map-rendering.md`, `docs/03-specs/06-naver-url-normalization.md`, `docs/03-specs/07-place-data-extraction.md`, `docs/99-archive/02-architecture/integrations.md`
   - 완료 기준: Sprint 범위와 acceptance 기준이 문서 충돌 없이 읽히고, 새 URL 형식 및 zoom control 요구가 source of truth에 반영된다.

2. **회귀 테스트 먼저 추가**
   - 목록 클릭 후 상세 패널 표시 안정성, hero copy 제거, zoom control 표시/state sync, URL 3종 canonicalization/lookup success를 먼저 실패하는 테스트로 고정한다.
   - 관련 파일: `src/app-shell/NurimapBrowse.test.tsx`, `src/app-shell/NurimapDetail.test.tsx`, `src/app-shell/NaverUrlNormalization.test.tsx`, `src/app-shell/PlaceLookupFlow.test.tsx`, `src/server/placeLookupService.test.ts`
   - 완료 기준: Sprint 13 신규 테스트가 현재 코드에서 실패하거나 미구현 상태를 명확히 드러낸다.

3. **지도 런타임/상세 패널 표시 복구**
   - 실제 Kakao runtime 기준으로 상세 패널이 사라지는 원인을 좁히고, 지도 layer와 floating panel layer를 명시적으로 정리한다.
   - 동시에 `MapPane` 상단 hero UI를 제거하고 zoom control을 붙이며, fallback renderer의 UI/테스트 계약도 맞춘다.
   - 관련 파일: `src/app-shell/MapPane.tsx`, `src/app-shell/NurimapAppShell.tsx`, 필요 시 `src/app-shell/appShellStore.ts`
   - 완료 기준: 로그인 후 목록 item 클릭 시 상세 패널이 즉시 보이고, 휠 스크롤 중/후에도 유지되며, 지도에 확대/축소 control이 보인다.

4. **Naver URL 정규화 + 조회 경로 강건화**
   - `naver.me` redirect 해석, `favorite/.../place/{id}` path 추출, 기존 `search/.../place/{id}` 형식 유지, placeId `1648359924` fixture 성공 경로를 함께 정리한다.
   - 관련 파일: `src/app-shell/naverUrl.ts`, `api/_lib/_naverUrl.ts`, `src/server/placeLookupService.ts`, `api/_lib/_placeLookupService.ts`, `src/server/fixtures/placeLookupFixtures.ts`, `api/_lib/_placeLookupFixtures.ts`, `api/place-lookup.ts`
   - 완료 기준: 세 URL 모두 `https://map.naver.com/p/entry/place/1648359924`로 canonicalize 되고, place lookup summary가 정상 표시된다.

5. **Auth refresh / verify bootstrap 무한 로딩 방지**
   - stale verify query, verify-link 예외, verifyOtp 실패, 기존 세션 복원 우선순위를 정리해 refresh 후에도 `verifying`에 무한 정지하지 않게 만든다.
   - 관련 파일: `src/auth/AuthProvider.tsx`, `src/auth/AuthFlow.test.tsx`, 필요 시 `docs/03-specs/05-auth-email-login-link.md`
   - 완료 기준: refresh 후 `로그인 링크를 확인하는 중입니다.`가 영구히 남지 않고 `authenticated` / `name_required` / `auth_failure` / `auth_required` 중 하나로 수렴한다.

6. **검증 및 Sprint 문서 동기화**
   - 자동화 테스트, lint/build, 실제 로그인 후 수동 QA 결과를 정리하고 Sprint 문서를 업데이트한다.
   - 관련 파일: `docs/05-sprints/sprint-13/qa.md`, `docs/05-sprints/sprint-13/review.md`, 필요 시 `docs/06-history/decisions.md`
   - 완료 기준: 자동화/수동 QA 근거가 남고, Sprint 13 문서가 실제 결과와 일치한다.

# Done Criteria

- 로그인된 상태의 데스크톱 앱에서 목록 item을 클릭하면 상세 패널이 즉시 보이고, 마우스 휠 스크롤을 멈춰도 사라지지 않는다.
- 지도 surface 어디에서도 `내부 장소 지도를 위한 앱 셸` 또는 `Plan 02에서는 ...` copy가 보이지 않는다.
- 지도에 확대/축소 control이 시각적으로 노출되고, control 조작 결과가 `mapLevel` 상태 및 라벨 표시 규칙(`level 1-5` 노출, `level 6+` 숨김)과 일치한다.
- 인증 링크 진입 URL 또는 stale verify query 상태에서 새로고침해도 `로그인 링크를 확인하는 중입니다.`가 무한히 남지 않고 terminal auth state로 전환된다.
- 아래 3개 URL 입력이 모두 성공하며, lookup 결과의 canonical URL이 `https://map.naver.com/p/entry/place/1648359924`이고 place summary가 같은 장소 정보로 표시된다.
  - `https://naver.me/I55a1Ogw`
  - `https://map.naver.com/p/favorite/myPlace/folder/52f873516c87492794d35b0f62ebe0f1/place/1648359924?c=16.00,0,0,0,dh&at=a&placePath=/home?from=map&fromPanelNum=2&timestamp=202603122222&locale=ko&svcName=map_pcv5`
  - `https://map.naver.com/p/search/%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5/place/1648359924?c=15.95,0,0,0,dh&placePath=/home?bk_query=%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5&entry=bmp&from=map&fromPanelNum=2&timestamp=202603122222&locale=ko&svcName=map_pcv5&searchText=%EC%A3%BC%EB%A7%89%EB%B3%B4%EB%A6%AC%EB%B0%A5`
- Sprint 13 관련 테스트가 통과하고, spec / architecture / sprint 문서가 구현과 동기화된다.

# QA Plan

- 자동화:
  - `src/app-shell/NaverUrlNormalization.test.tsx`에 `naver.me`, `favorite`, `search` 3종 URL canonicalization 회귀 테스트를 추가한다.
  - `src/server/placeLookupService.test.ts`와 `src/app-shell/PlaceLookupFlow.test.tsx`에 placeId `1648359924` lookup success 테스트를 추가한다.
  - `src/app-shell/NurimapBrowse.test.tsx`, `src/app-shell/NurimapDetail.test.tsx`에 hero copy 제거, zoom control state sync, 상세 패널 표시 회귀를 반영한다.
  - `src/auth/AuthFlow.test.tsx`에 refresh / verify bootstrap terminal-state 회귀 테스트를 추가한다.
  - 최종 검증에서 `npm run test:run`, `npm run lint`, `npm run build`를 실행한다.
- 수동 QA:
  - 실제 로그인 후 데스크톱에서 목록 item 클릭 → 상세 패널 표시 → 마우스 휠 확대/축소 → 스크롤 정지 후에도 패널 유지 여부를 확인한다.
  - 지도 우측(또는 결정된 위치)의 확대/축소 control이 보이고 클릭으로 줌 단계가 바뀌는지 확인한다.
  - 지도 위 hero copy가 제거되었는지 데스크톱/모바일 모두 확인한다.
  - 장소 추가 흐름에서 사용자 제공 3개 URL을 각각 입력해 동일한 장소 요약이 뜨는지 확인한다.
  - 인증 링크 진입 URL에서 새로고침해도 verify 화면에 무한 정지하지 않는지 확인한다.
  - lookup failure / coordinates failure 기존 회귀가 깨지지 않았는지 함께 확인한다.
