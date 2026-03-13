# Decisions

## Purpose
이 문서는 Nurimap 개발 중 AI Agent가 자율적으로 내린 판단뿐 아니라, 사용자와 함께 확정한 추가 판단이 필요한 의사결정도 기록하는 로그다.
요구사항 자체를 대체하는 문서는 아니며, `docs/00-governance/definition-of-done.md`, `docs/02-architecture/*.md`, `docs/03-specs/*.md`, `docs/99-archive/plans.md`를 해석·적용하는 과정에서 생긴 판단 근거와 결정 배경을 남기는 용도다.
Sprint 12 이전의 legacy entry는 당시 명칭을 유지하기 위해 `Plan XX` 형식을 그대로 남긴다.

## When To Record
아래 중 하나에 해당하면 기록한다.
- 구현 방식에 유효한 선택지가 2개 이상 있었고 하나를 골랐을 때
- 문서 충돌은 아니지만 문서만으로 세부 구현이 완전히 고정되지 않아 합리적 판단이 필요했을 때
- 임시 우회책, fallback, staged rollout, mock 전략을 선택했을 때
- 라이브러리, 상태 구조, 컴포넌트 경계, API shape, 캐시 전략, 테스트 전략 등 이후 작업에 영향을 주는 선택을 했을 때
- 현재는 진행 가능하지만 나중에 재검토가 필요하다고 판단했을 때

기록하지 않아도 되는 경우:
- spec에 이미 명확히 고정된 사항을 그대로 구현한 경우
- 단순 리팩터링, 이름 변경, 기계적 수정처럼 판단 근거를 남길 가치가 낮은 경우

## Entry Format
아래 템플릿으로 append한다.

```md
## YYYY-MM-DD Sprint XX - Short Title
- Context:
- Options considered:
  - Option A:
  - Option B:
- Decision:
- Rationale:
- Impact:
- Revisit trigger:
- Related docs:
  - docs/...
- Related commit: 12b73ef
```

## Usage Rules
- 한 Sprint에서 여러 번 판단이 필요하면 entry를 여러 개 남겨도 된다.
- `Related commit`은 판단 당시 커밋이 없으면 `TBD`로 두고, Sprint 종료 전에 실제 commit hash로 갱신한다.
- 문서 충돌이라면 먼저 충돌을 보고하고, 임의로 해소한 뒤 기록만 남기는 방식으로 처리하지 않는다.
- 다음 Sprint로 넘어가기 전에, 해당 Sprint에서 생긴 중요한 판단이 모두 기록되었는지 확인한다.

## Entries


## 2026-03-08 Plan 01 - React scaffold baseline
- Context: 현재 저장소에는 실제 앱 코드가 없고 package.json은 최소 설정만 가진 상태다. Plan 01은 Vite + React + Tailwind CSS + daisyUI 기반의 앱 셸을 빠르게 세팅하면서 이후 Plan 02~08 확장을 위한 안정적인 프론트엔드 기반이 필요하다.
- Options considered:
  - Option A: 현재 저장소에서 Vite React TypeScript 구성을 수동으로 처음부터 작성한다.
  - Option B: 공식 Vite React TypeScript 템플릿을 기준으로 필요한 파일 구성을 가져오고, 그 위에 Tailwind/daisyUI와 Nurimap 레이아웃을 얹는다.
- Decision: Option B를 사용해 공식 Vite React TypeScript 템플릿을 기준선으로 삼는다.
- Rationale: 공식 템플릿은 최신 Vite/React 관례와 기본 설정을 빠르게 확보할 수 있고, 초기 스캐폴드 오류 가능성을 줄인다. Plan 01은 제품 레이아웃 검증이 핵심이므로 보일러플레이트 작성에 시간을 쓰기보다 검증 가능한 기반을 확보하는 편이 낫다.
- Impact: 이후 Plan에서 타입 안정성과 테스트 확장을 더 쉽게 가져갈 수 있다. package.json과 초기 설정 파일이 Vite React TypeScript 중심으로 바뀐다.
- Revisit trigger: 추후 빌드/테스트 툴체인이 현재 저장소 제약과 충돌하거나, TypeScript가 과도한 복잡성을 만든다고 판단될 때 재검토한다.
- Related docs:
  - docs/03-specs/01-app-shell-and-layout.md
  - docs/04-design/foundations.md
  - docs/00-governance/definition-of-done.md
- Related commit: 30b00cc


## 2026-03-08 Plan 01 - App shell state skeleton
- Context: Plan 01은 실제 데이터/인증 없이도 데스크톱/모바일 앱 셸과 향후 탐색 흐름의 상태 골격을 보여줘야 한다. 추후 Plan 02~03에서 목록/상세/모바일 페이지 전환이 자연스럽게 확장될 수 있어야 한다.
- Options considered:
  - Option A: Plan 01에서는 단순 정적 마크업만 만들고 상태 모델은 나중에 추가한다.
  - Option B: Plan 01부터 최소한의 navigation state 골격을 두고, 모바일 목록 페이지 전환 같은 기본 상호작용을 상태 기반으로 구현한다.
- Decision: Option B를 선택해 Zustand 기반의 최소 navigation state 골격을 도입한다.
- Rationale: design foundations 문서가 navigation state와 async substate 분리를 강조하고 있고, Plan 01 scope에도 선택 상태 공유 골격이 포함된다. 지금 최소 상태 골격을 잡아두면 이후 Plan에서 구조를 덜 흔들고 확장할 수 있다.
- Impact: `map_browse`, `mobile_place_list_open`, `place_add_open`, `place_detail_open` 상태 골격이 초기 구현에 포함된다. 모바일 `목록 보기` 버튼은 실제 상태 전환을 수행한다.
- Revisit trigger: Plan 02~03 구현 중 라우팅 또는 전역 상태 경계가 현재 store 구조와 크게 어긋난다고 판단될 때 재검토한다.
- Related docs:
  - docs/03-specs/01-app-shell-and-layout.md
  - docs/04-design/foundations.md
  - docs/01-product/user-flows/browse-and-detail.md
- Related commit: 30b00cc


## 2026-03-08 Plan 02 - Kakao map runtime with test fallback
- Context: Plan 02는 Kakao Map 기반의 지도 렌더링을 요구하지만, 테스트 환경(JSDOM)에서는 Kakao SDK 스크립트를 직접 로드하기 어렵다. 또한 자동 테스트에서는 지도 상태와 마커/라벨 조건을 결정적으로 검증할 수 있어야 한다.
- Options considered:
  - Option A: Plan 02에서도 브라우저/테스트 모두 mock map만 사용한다.
  - Option B: 실제 런타임 브라우저에서는 Kakao Map SDK를 로드하고, 테스트/JSDOM 또는 SDK 미사용 가능 환경에서는 동일한 상태 계약을 따르는 DOM fallback renderer를 사용한다.
- Decision: Option B를 선택한다.
- Rationale: spec의 Kakao Map 요구사항을 실제 런타임에서 만족하면서도, 테스트는 외부 스크립트 의존 없이 안정적으로 유지할 수 있다. 지도 중심, 마커 타입, 라벨 임계값, 선택 상태 같은 핵심 규칙은 fallback renderer에서도 동일하게 검증할 수 있다.
- Impact: 지도 구현은 runtime adapter + fallback renderer 구조를 가진다. Plan 02 테스트는 fallback renderer를 기준으로 동작하지만, local QA에서는 실제 Kakao runtime 동작도 확인한다.
- Revisit trigger: Kakao SDK와 fallback 간 동작 차이가 누적되어 유지비가 커지거나, 이후 Plan에서 wrapper abstraction이 더 적합하다고 판단될 때 재검토한다.
- Related docs:
  - docs/03-specs/02-map-rendering.md
  - docs/03-specs/03-list-browse.md
  - docs/02-architecture/integrations.md
  - docs/04-design/browse-and-detail.md
- Related commit: 3a0ef39


## 2026-03-08 Plan 02 - Preserve PUBLIC_ env naming in Vite
- Context: 저장소의 기존 `.env`는 Kakao 공개 키를 `PUBLIC_KAKAO_MAP_APP_KEY` 이름으로 제공한다. Vite는 기본적으로 `VITE_` prefix만 클라이언트에 노출하므로, 현재 env 이름을 바꾸거나 Vite 설정을 조정해야 한다.
- Options considered:
  - Option A: `.env`의 공개 키 이름을 `VITE_KAKAO_MAP_APP_KEY`로 강제 변경한다.
  - Option B: Vite의 `envPrefix`에 `PUBLIC_`를 추가해 기존 env 이름을 유지한다.
- Decision: Option B를 선택한다.
- Rationale: 현재 저장소에 이미 `PUBLIC_KAKAO_MAP_APP_KEY`가 존재하고, 공개/비공개 env naming 의도가 문서상 자연스럽다. 초기 Plan에서 기존 env 이름을 유지하는 편이 사용자의 로컬 환경을 덜 흔든다.
- Impact: `vite.config.ts`에서 `envPrefix: ['VITE_', 'PUBLIC_']`를 사용한다. 이후 release-hardening 단계에서 공개/비공개 env 분리를 다시 점검해야 한다.
- Revisit trigger: Plan 11에서 env naming 규칙을 정리할 때 `PUBLIC_` 대신 다른 공개 prefix 정책이 필요하다고 판단되면 재검토한다.
- Related docs:
  - docs/03-specs/02-map-rendering.md
  - docs/02-architecture/integrations.md
  - docs/02-architecture/security-and-ops.md
- Related commit: 3a0ef39


## 2026-03-08 Plan 03 - Mobile detail back uses history bridge
- Context: Plan 03은 모바일 상세 화면의 뒤로 가기 버튼과 브라우저 기본 뒤로 가기가 모두 지도 화면으로 돌아가도록 요구한다. 현재 앱은 React Router 없이 Zustand 기반 navigation state를 사용 중이라 브라우저 history와 상태를 직접 연결해야 한다.
- Options considered:
  - Option A: 모바일 뒤로 가기 버튼은 store state만 바꾸고, 브라우저 기본 뒤로 가기는 별도로 지원하지 않는다.
  - Option B: 모바일 상세 진입 시 history state를 push하고, popstate에서 지도 탐색 상태로 복귀시키는 얇은 history bridge를 둔다.
- Decision: Option B를 선택한다.
- Rationale: 라우터를 지금 도입하지 않고도 spec이 요구하는 브라우저 뒤로 가기 동작을 만족할 수 있다. 현재 Plan 범위에서는 전체 라우팅 도입보다 얇은 history bridge가 더 작은 변경이다.
- Impact: 모바일 상세 진입 시 `window.history.pushState`를 사용하고, `popstate` listener가 `map_browse` 복귀를 담당한다. 이후 라우터 도입 시 이 부분을 대체할 수 있다.
- Revisit trigger: Plan 08 이후 보호 라우트/링크 기반 탐색이 본격화되면 state-only navigation 대신 라우터 기반 구조로 재검토한다.
- Related docs:
  - docs/03-specs/04-place-detail.md
  - docs/04-design/browse-and-detail.md
  - docs/01-product/user-flows/browse-and-detail.md
- Related commit: 89bb3dd


## 2026-03-08 Plan 04 - Place add URL step uses the existing `place_add_open` surface
- Context: Plan 04는 Naver URL 정규화만 다루지만, 이후 Plan 05~06에서는 같은 진입점에서 조회 성공 후 2단계 place 등록 UI로 확장되어야 한다. 현재 앱에는 이미 `place_add_open` navigation state와 `장소 추가` 버튼이 존재한다.
- Options considered:
  - Option A: Plan 04에서는 별도 임시 페이지나 전용 route를 만들고, 이후 Plan 06에서 다시 2단계 place add UI로 교체한다.
  - Option B: 현재 `place_add_open` state를 그대로 활용해 데스크톱은 floating panel, 모바일은 full-screen page에서 URL 입력 1단계를 먼저 구현하고 이후 같은 surface를 2단계로 확장한다.
- Decision: Option B를 선택한다.
- Rationale: design 문서와 user-flow 문서가 place add를 같은 화면 안의 progressive disclosure로 정의하고 있어, 지금부터 동일 surface를 쓰는 편이 later refactor를 줄인다.
- Impact: Plan 04의 URL 입력 UI는 이후 Plan 05/06에서 동일한 state와 surface 위에 place 요약/등록 입력 단계가 추가될 예정이다.
- Revisit trigger: Plan 06 구현 시 2단계 등록 UI가 현재 panel/page 구조로는 자연스럽게 확장되지 않는다고 판단되면 재조정한다.
- Related docs:
  - docs/03-specs/06-naver-url-normalization.md
  - docs/04-design/place-submission.md
  - docs/01-product/user-flows/place-submission.md
- Related commit: c8bd3ec


## 2026-03-08 Plan 05 - Server-side place lookup starts with fixture-backed adapter
- Context: 문서는 server-side Naver place lookup과 Kakao geocoding fallback을 요구하지만, 현재 저장소에는 공식 Naver place detail API 계약이 확정돼 있지 않다. `docs/02-architecture/integrations.md`도 내부 API 후보는 있으나 안정성과 약관을 구현 단계에서 재검증해야 한다고 적고 있다.
- Options considered:
  - Option A: 실제 Naver 비공식 source를 바로 붙여서 Plan 05를 끝낸다.
  - Option B: server-side lookup boundary와 geocoding fallback 계약을 먼저 구현하고, place source는 fixture-backed adapter로 시작한다. 이후 실제 Naver source를 같은 interface 뒤에 교체한다.
- Decision: Option B를 선택한다.
- Rationale: 현재는 사용자 개입 없이 연속 개발을 진행해야 하고, 공식 API 부재 상태에서 비공식 source를 바로 고정하면 리스크가 크다. fixture-backed adapter로 시작하면 서버 경계, 상태 모델, retry/failure UX, geocoding fallback, 다음 단계 등록 UI를 먼저 안정화할 수 있다.
- Impact: Plan 05는 server route + lookup contract + fallback 로직 + UI 2단계 진행 구조를 구현한다. 실제 Naver source는 같은 adapter interface 뒤에서 교체 가능하게 유지한다.
- Revisit trigger: 실제 Naver source를 안전하게 재현할 수 있는 계약이 확보되면 fixture adapter를 실 source adapter로 교체한다.
- Related docs:
  - docs/03-specs/07-place-data-extraction.md
  - docs/02-architecture/integrations.md
  - docs/01-product/user-flows/place-submission.md
- Related commit: a7d759e


## 2026-03-08 Plan 05 - Share lookup service between Vercel API and Vite dev middleware
- Context: Plan 05는 server-side lookup을 요구하지만, 현재 개발 스크립트는 `vite`만 사용한다. Vercel production에서는 `api/` route를 쓸 수 있지만, 로컬 `vite` 개발에서도 같은 `/api/place-lookup` 계약을 유지하는 편이 이후 QA와 구현이 단순하다.
- Options considered:
  - Option A: production은 `api/` route를 쓰고, 로컬 개발에서는 프론트엔드가 직접 fixture를 호출한다.
  - Option B: lookup service를 공유 모듈로 만들고, production은 `api/` route, local dev는 Vite middleware에서 같은 service를 호출한다.
- Decision: Option B를 선택한다.
- Rationale: 같은 `/api/place-lookup` 계약을 로컬과 배포에서 공통으로 쓰면 테스트와 UI 구현이 단순해지고, 나중에 실제 source adapter로 교체할 때도 접점이 하나로 유지된다.
- Impact: `src/server/*`에 lookup service를 두고, `api/place-lookup.ts`와 `vite.config.ts` dev middleware가 이를 공유한다.
- Revisit trigger: 추후 별도 backend나 edge/server framework를 도입하면 Vite middleware는 제거하고 실제 API server 하나로 통합할 수 있다.
- Related docs:
  - docs/03-specs/07-place-data-extraction.md
  - docs/02-architecture/integrations.md
  - docs/00-governance/definition-of-done.md
- Related commit: a7d759e


## 2026-03-08 Plan 06 - Use client-side in-memory place repository before auth/storage
- Context: `docs/99-archive/plans.md`는 인증과 접근 제어를 Plan 08에 두고, 그 전까지 place 추가/탐색을 로컬에서 먼저 검증하도록 정의한다. Plan 06은 등록과 병합 규칙 자체를 먼저 검증해야 하므로, 아직 Supabase persistence를 강제하지 않는 것이 전체 순서와 맞다.
- Options considered:
  - Option A: Plan 06부터 실제 DB 저장을 먼저 붙인다.
  - Option B: client-side in-memory repository로 등록/병합 규칙을 구현하고, later Plan에서 persistence adapter를 붙인다.
- Decision: Option B를 선택한다.
- Rationale: 현재 릴리즈 순서상 인증/접근 제어와 DB persistence보다 UX/도메인 규칙 검증이 먼저다. in-memory repository로도 신규 등록, 중복 병합, 리뷰 uniqueness, 상태 갱신 규칙을 충분히 검증할 수 있다.
- Impact: Plan 06의 저장/병합은 Zustand store 기반 repository가 담당한다. 이후 auth/persistence 단계에서 같은 규칙을 server adapter로 옮길 수 있게 helper 함수로 분리한다.
- Revisit trigger: Plan 08 또는 release-hardening 단계에서 실제 persistence 경계가 필요해지면 repository 구현을 Supabase-backed adapter로 교체한다.
- Related docs:
  - docs/03-specs/08-place-registration.md
  - docs/03-specs/09-place-merge.md
  - docs/99-archive/plans.md
- Related commit: 2cfd248


## 2026-03-08 Plan 08 - Wrap Supabase magic link with app-managed nonce
- Context: spec는 5분 만료, 재발급 시 이전 링크 무효화, 1회 사용, 인증 실패 화면 이유 구분을 요구한다. Supabase magic link 자체만으로는 이 정책을 앱 화면/정책 수준에서 완전히 통제하기 어렵다.
- Options considered:
  - Option A: Supabase 기본 magic link를 그대로 이메일로 보낸다.
  - Option B: Supabase admin `generateLink`로 얻은 hashed token을 앱이 관리하는 nonce wrapper 링크 뒤에 숨기고, 앱 서버가 nonce 정책을 검증한 뒤 token_hash를 클라이언트에 전달한다.
- Decision: Option B를 선택한다.
- Rationale: 앱이 직접 5분 만료, 재발급 invalidation, 1회 사용, 실패 reason mapping을 통제할 수 있으면서도 실제 세션 발급은 Supabase Auth가 담당한다.
- Impact: 이메일의 direct login URL은 `PUBLIC_APP_URL?auth_mode=verify&email=...&nonce=...` 형식을 사용한다. verify-link API가 nonce 상태를 검증한 뒤 `token_hash`와 verification type을 반환한다.
- Revisit trigger: verified sending domain 확보 후 실제 이메일 검증에서 wrapper flow가 과도하게 복잡하다고 판단되면 단순화 여부를 재검토한다.
- Related docs:
  - docs/03-specs/05-auth-email-login-link.md
  - docs/02-architecture/security-and-ops.md
  - docs/02-architecture/system-context.md
- Related commit: 6ff97ad


## 2026-03-08 Plan 08 - Store user name in Supabase auth user_metadata
- Context: spec는 로그인 후 이름이 비어 있으면 이름 입력 화면으로 보내고, 이름 저장 후 앱 진입을 요구한다. 현재 저장소에는 별도 user profile table이 없다.
- Options considered:
  - Option A: public profile table을 새로 만들고 이름을 거기에 저장한다.
  - Option B: Supabase Auth user의 `user_metadata.name`에 이름을 저장한다.
- Decision: Option B를 선택한다.
- Rationale: 현재 단계에서는 별도 profile table 없이도 이름 수집 요구사항을 만족할 수 있고, 인증 직후 온보딩 흐름과 세션 복원을 단순하게 유지할 수 있다.
- Impact: name capture 화면 저장은 `supabase.auth.updateUser({ data: { name } })`를 사용한다. 이후 richer profile 요구가 생기면 profile table을 추가로 도입할 수 있다.
- Revisit trigger: 사용자 사진, 이름 수정, profile 확장 요구가 커지면 dedicated profile table로 분리한다.
- Related docs:
  - docs/03-specs/05-auth-email-login-link.md
  - docs/02-architecture/domain-model.md
  - docs/00-governance/definition-of-done.md
- Related commit: 6ff97ad


## 2026-03-08 Plan 08 - Keep Vercel function runtime dependencies under `api/_lib`
- Context: Vercel production에서 `api/auth/request-link`가 `/var/task/src/server/authService.ts`를 찾지 못해 `ERR_MODULE_NOT_FOUND`로 실패했다. `api/` route가 `src/server/*`를 직접 import하면 함수 번들에 필요한 파일이 안정적으로 포함되지 않을 수 있다.
- Options considered:
  - Option A: `api/` route가 계속 `src/server/*`와 `src/app-shell/*`를 직접 import한다.
  - Option B: Vercel 함수가 쓰는 server-side dependency를 `api/_lib/*` 아래로 복제하고 route는 그 경로만 참조한다.
  - Option C: 별도 shared package/build step을 도입해 `src/server/*`를 함수용 산출물로 재구성한다.
- Decision: Option B를 선택한다.
- Rationale: 현재 구조에서는 가장 작은 수정으로 Vercel 함수 번들 경계를 명확히 만들 수 있고, Plan 08 런타임 장애를 빠르게 해소할 수 있다.
- Impact: `api/auth/*`, `api/place-lookup.ts`는 `api/_lib/*`만 참조한다. 또한 `src/server/apiImportBoundary.test.ts`를 추가해 `api/` 코드가 다시 `src/*`를 직접 import하지 않도록 검증한다. Vercel이 함수 소스를 JS로 변환할 때 `.ts` 확장자 import가 런타임 해석을 깨뜨릴 수 있으므로, 함수 경계 코드의 상대 import는 `.js` specifier를 사용한다. `api/_lib` 아래 helper 파일은 `_` prefix를 붙여 Vercel route entrypoint로 취급되지 않도록 한다.
- Revisit trigger: `api/_lib`와 `src/server` 사이 중복이 커지거나 함수 수가 늘어나면 shared package 또는 build-safe server module 구조로 재설계한다.
- Related docs:
  - docs/03-specs/05-auth-email-login-link.md
  - docs/03-specs/07-place-data-extraction.md
  - docs/99-archive/local-integration-qa.md
- Related commit: f644b0a


## 2026-03-08 Plan 08 - Treat Outlook mobile no-op link open as client compatibility follow-up
- Context: production에서 `request-link`, `verify-link`, Supabase `verifyOtp`까지는 실제로 성공하는 것을 확인했지만, Outlook 모바일 앱에서 링크를 눌렀을 때 사용자는 “아무 반응이 없다”고 보고했다.
- Options considered:
  - Option A: authentication backend defect로 간주하고 Plan 08을 계속 차단한다.
  - Option B: 메일 발송/링크 검증 backend는 정상으로 보고, Outlook 모바일 인앱 브라우저 또는 handoff 특성 가능성을 별도 client compatibility 이슈로 보류한다.
- Decision: Option B를 선택한다.
- Rationale: production 기준으로 유효한 링크는 서버 검증과 세션 생성까지 성공했고, 브라우저 재현에서는 이름 입력 화면까지 진입했다. 따라서 현재 근거만으로 backend defect로 단정하기보다 Outlook 모바일 환경 특이사항으로 분리하는 편이 맞다.
- Impact: Plan 08은 메일 발송/링크 검증 backend가 동작하는 상태로 간주하고 다음 Plan으로 진행한다. Outlook 모바일 링크 오픈 UX는 이후 기본 브라우저 열기, deep-link handoff, 인앱 브라우저 정책 관점에서 추가 점검한다.
- Revisit trigger: 모바일 Outlook 사용자가 링크를 기본 브라우저로 열어도 동일 증상이 재현되면 auth redirect / session persistence / mobile browser compatibility를 다시 조사한다.
- Related docs:
  - docs/03-specs/05-auth-email-login-link.md
  - docs/99-archive/qa/plan-08-auth-email-login-link.md
  - docs/01-product/user-flows/auth-and-name-entry.md
- Related commit: c0f861d


## 2026-03-08 Plan 09 - Update rating aggregates from canonical summary fields, not visible review slice
- Context: place 상세와 목록은 `average_rating` / `review_count`를 canonical 집계값으로 보여주지만, mock review 목록은 전체 review 집합의 일부만 담고 있다. 새 review 저장 시 화면에 보이는 review 배열 길이만 기준으로 다시 계산하면 집계값이 실제 상세/목록 수치와 어긋난다.
- Options considered:
  - Option A: 현재 메모리에 있는 `reviews` 배열만 기준으로 평균/개수를 다시 계산한다.
  - Option B: `average_rating`과 `review_count`를 canonical aggregate로 보고, 새 별점 입력 시 그 요약값에 incremental update를 적용한다.
- Decision: Option B를 선택한다.
- Rationale: domain-model 문서가 `review_count`를 canonical 집계 필드로 정의하고 있으므로, 상세 화면에 노출하는 review list가 부분 목록이어도 aggregate 숫자는 항상 summary field와 일치해야 한다.
- Impact: Plan 09 review 저장과 Plan 06 기존 place 병합 review 추가는 모두 `average_rating` / `review_count`에 incremental update를 적용한다. 리뷰 목록은 최신 review를 prepend하지만, aggregate 숫자는 전체 canonical count를 유지한다.
- Revisit trigger: 추후 전체 review 목록을 서버에서 page 없이 완전 로드하게 되면 aggregate를 서버 계산값으로 일원화하고 클라이언트 incremental 계산은 제거할 수 있다.
- Related docs:
  - docs/03-specs/10-review.md
  - docs/03-specs/08-place-registration.md
  - docs/02-architecture/domain-model.md
- Related commit: aeed182


## 2026-03-09 Plan 10 - Use detail-local async state with store-backed recommendation toggles
- Context: Plan 10은 추천 추가/취소, 진행 상태, 실패 시 상태 복원을 요구한다. 현재 앱 구조는 Zustand store가 canonical place summary를 들고 있고, 상세 패널은 그 summary를 읽어 렌더링한다.
- Options considered:
  - Option A: 추천 버튼에서 optimistic count/state를 별도 local draft로 먼저 바꾸고 실패 시 롤백한다.
  - Option B: 상세 컴포넌트는 `recommendation_toggle` UI 상태만 로컬로 관리하고, 성공 시 canonical count/state 갱신은 store helper 결과에만 의존한다.
- Decision: Option B를 선택한다.
- Rationale: canonical `recommendation_count`와 `my_recommendation_active`는 store가 단일 source of truth로 유지하고, 상세 컴포넌트는 비동기 진행/오류 표시만 담당하는 편이 React 상태 분리가 단순하고 실패 복원도 안전하다.
- Impact: `DetailRecommendationControl`은 loading/error UI만 로컬로 관리한다. 추천 성공/취소 결과는 `togglePlaceRecommendation` store action이 반영한 최신 place summary로만 표현된다. 비로그인 차단은 앱의 auth gate가 1차 방어선이고, 컨트롤 단위에서 fallback guard를 추가로 둔다.
- Revisit trigger: 추후 recommendation API가 실제 서버 round-trip/optimistic UI를 요구하면 local optimistic update와 rollback 전략을 다시 도입할 수 있다.
- Related docs:
  - docs/03-specs/11-recommendation.md
  - docs/02-architecture/domain-model.md
  - docs/04-design/recommendation.md
- Related commit: 12b73ef


## 2026-03-09 Plan 11 - Use repo-level static config plus service-layer logging for release hardening
- Context: Plan 11은 검색 엔진 차단과 실패 운영 로그를 모두 요구한다. 현재 앱은 Vite 정적 엔트리와 Vercel API route가 분리되어 있어, HTML/meta/robots와 server failure logging을 서로 다른 층에서 적용해야 한다.
- Options considered:
  - Option A: 모든 hardening을 런타임 코드만으로 처리한다.
  - Option B: 검색 차단은 `index.html`, `public/robots.txt`, `vercel.json` 같은 정적/배포 설정에서 처리하고, 실패 로그와 캐시는 service layer에서 처리한다.
- Decision: Option B를 선택한다.
- Rationale: noindex/robots/X-Robots-Tag는 정적/배포 설정이 가장 명확하고, 실패 로그와 lookup cache는 service layer가 인증/조회 경계에 가장 가깝다.
- Impact: 검색 차단은 `index.html` meta, `public/robots.txt`, `vercel.json` header로 적용한다. 로그인 링크 요청 실패와 place lookup 실패는 server logger를 통해 구조화 로그를 남긴다. lookup cache는 canonical URL 단위 in-memory cache로 유지한다.
- Revisit trigger: 추후 CDN 또는 shared cache 계층이 도입되면 lookup cache를 process-local Map에서 공통 cache 계층으로 옮길 수 있다.
- Related docs:
  - docs/03-specs/12-release-hardening.md
  - docs/02-architecture/security-and-ops.md
  - docs/02-architecture/integrations.md
- Related commit: 31f1ac2


## 2026-03-09 Bypass auth - Keep actual allowlist values out of git while allowing env-managed bypass across environments
- Context: 특정 외부 이메일 1개에 대해 이메일 링크 클릭 없이 바로 로그인시키고 싶지만, 저장소는 public repository라 실제 bypass 이메일 목록을 git에 올리면 안 된다. 요구사항은 local-only bypass에서 env-managed global bypass로 바뀌었다.
- Options considered:
  - Option A: bypass 이메일을 client/server source code에 직접 하드코딩한다.
  - Option B: bypass 이메일을 committed 문서나 Makefile default 값에 직접 넣는다.
  - Option C: generic bypass mechanism만 커밋하고, 실제 이메일 값은 `.env.local` 또는 배포 env 같은 비추적 환경 변수에만 둔다.
- Decision: Option C를 선택한다.
- Rationale: public repo에서도 bypass 메커니즘 자체는 안전하게 version control할 수 있고, 실제 allowlist 값은 로컬 파일이나 호스팅 env에만 남겨 유출 위험을 줄일 수 있다. 동시에 필요하면 local/dev/prod 어디서든 같은 메커니즘을 사용할 수 있다.
- Impact: auth service는 `AUTH_BYPASS_ENABLED` / `AUTH_BYPASS_EMAILS`를 읽어 bypass 여부를 결정한다. `make dev` / `make dev-run`은 `.env`와 `.env.local`을 로드하므로 로컬 bypass가 적용되고, Vercel env에도 같은 키를 넣으면 배포 환경 bypass도 가능하다. 실제 이메일 목록은 tracked file에 남기지 않는다.
- Revisit trigger: bypass 대상이 늘어나거나 감사 요구가 커지면 별도 admin/test-login 정책과 audit trail 구조를 도입한다.
- Related docs:
  - .omx/plans/plan-global-bypass-email-and-make.md
  - docs/99-archive/local-development.md
  - docs/02-architecture/security-and-ops.md
  - docs/00-governance/definition-of-done.md
- Related commit: 65f9910


## 2026-03-10 Sprint 12 - Keep magic link and fix app URL assembly instead of switching auth mode
- Context: 로그인 메일이 `undefined...`로 시작하는 잘못된 링크를 보내고 있어, 사용자는 magic link를 유지할지 5분 유효 6자리 코드 인증으로 바꿀지 검토하고 싶어 했다. 현재 auth 구현은 Supabase Admin `generateLink`로 `hashed_token`을 발급받고, 앱이 `PUBLIC_APP_URL?auth_mode=verify&email=...&nonce=...` 형태의 wrapper 링크를 직접 조합해 Resend로 보내는 구조다.
- Options considered:
  - Option A: 현재 Sprint에서 6자리 코드 기반 로그인으로 인증 방식을 전환한다.
  - Option B: 기존 magic link + app-managed nonce wrapper 방식을 유지하고, 잘못된 링크 문제를 `PUBLIC_APP_URL` 및 링크 조합/검증 경계 문제로 수정한다.
- Decision: Option B를 선택한다.
- Rationale: 현재 증상은 인증 방식 자체보다 링크 조합 기준 URL이 잘못되었을 가능성이 더 높고, magic link 흐름은 이미 5분 만료, 재발급 invalidation, 1회 사용, 이름 입력 강제 이동 요구를 충족하도록 문서와 구현 경계가 잡혀 있다. 이번 Sprint에서는 broken entrypoint를 복구하고 메일/UI UX를 정리하는 편이 범위를 가장 작고 명확하게 유지한다.
- Impact: Sprint 12의 auth 범위는 `PUBLIC_APP_URL` 기준 로그인 링크 복구, 메일 템플릿 정리, 로그인 화면 단순화에 집중한다. 6자리 코드 입력 화면, 코드 재전송/오입력 정책, 추가 anti-bruteforce 요구는 이번 Sprint 범위에 포함하지 않는다.
- Revisit trigger: Vercel env와 Supabase redirect 설정을 바로잡은 뒤에도 메일 링크가 안정적으로 동작하지 않거나, 모바일 메일 앱 호환성 이슈가 지속되면 6자리 코드 인증 전환을 다음 후보로 다시 검토한다.
- Related docs:
  - docs/03-specs/05-auth-email-login-link.md
  - docs/05-sprints/sprint-12/planning.md
  - docs/01-product/user-flows/auth-and-name-entry.md
  - docs/04-design/auth-and-name-entry.md
- Related commit:


## 2026-03-10 Docs structure - Split design docs out of architecture and align them with user flows
- Context: 기존에는 `docs/02-architecture/ui-design.md` 하나에 공통 레이아웃, 상태 모델, 인증 화면, 탐색 화면, 장소 등록, 리뷰/추천 디자인 규칙이 함께 들어 있었다. 사용자는 user-flow 문서와 UI design 문서의 역할을 더 명확히 분리하고, 공통 기준과 흐름별 디자인 문서를 따로 관리하길 원했다.
- Options considered:
  - Option A: 기존 `docs/02-architecture/ui-design.md`를 유지하고 필요한 문단만 정리한다.
  - Option B: `04-design/` 폴더를 새로 만들고, 공통 기준은 `foundations.md`, 흐름별 화면 규칙은 대응하는 flow slug 문서로 분리한다. 이후 `04-sprints`, `05-history`도 `05-sprints`, `06-history`로 민다.
- Decision: Option B를 선택한다.
- Rationale: 디자인 문서는 architecture의 도메인/보안/시스템 경계와 성격이 다르고, 사용자 흐름과 더 가까운 화면 구조 규칙을 따로 읽을 수 있어야 문서 책임이 분명해진다. 공통 기준과 흐름별 규칙을 분리하면 이후 auth, browse, submission, review, recommendation 변경도 영향 범위를 더 쉽게 좁힐 수 있다.
- Impact: `docs/04-design/foundations.md`가 전역 breakpoint/state model source of truth가 된다. `docs/04-design/auth-and-name-entry.md`, `browse-and-detail.md`, `place-submission.md`, `review.md`, `recommendation.md`가 흐름별 UI 기준을 담당한다. Sprint와 history 문서 경로는 각각 `docs/05-sprints/`, `docs/06-history/`로 이동한다.
- Revisit trigger: 향후 design 문서가 다시 한 파일에 과도하게 집중되거나, flow별 문서보다 컴포넌트 시스템 문서가 더 적합해지면 design 정보 구조를 다시 조정한다.
- Related docs:
  - docs/00-governance/docs-structure.md
  - docs/00-governance/ai-agent-workflow.md
  - docs/04-design/foundations.md
  - docs/04-design/auth-and-name-entry.md
  - docs/04-design/browse-and-detail.md
  - docs/04-design/place-submission.md
  - docs/04-design/review.md
  - docs/04-design/recommendation.md
- Related commit:

## 2026-03-10 Sprint 12 - Refuse auth email delivery when PUBLIC_APP_URL is missing or invalid
- Context: Sprint 12 needed to stop auth emails from containing `undefined...` wrapper links. The backend auth flow builds the app-managed wrapper URL from `PUBLIC_APP_URL`, uses it as the Supabase `redirectTo` target, and embeds it in the Resend email body. If that env is empty or malformed, silently continuing would generate broken links and mislead users into a dead-end auth flow.
- Options considered:
  - Option A: fall back to a relative path or permissive default origin when `PUBLIC_APP_URL` is missing/invalid.
  - Option B: continue generating the Supabase link and let downstream email/body assembly fail implicitly.
  - Option C: validate `PUBLIC_APP_URL` up front, normalize only valid `http/https` origins/paths, and return the existing `delivery_failed` error instead of generating or sending a broken link.
- Decision: Option C를 선택한다.
- Rationale: Sprint 12’s main auth defect was a broken email entrypoint. A guessed fallback origin could send users to the wrong host, and implicit failure later in the flow would still risk emitting a malformed link. Explicit validation at the auth service boundary keeps behavior deterministic, prevents `undefined...` links, and preserves the existing user-facing failure contract (`로그인 링크를 보내지 못했어요. 다시 시도해 주세요.`) without inventing a new error mode.
- Impact: `src/server/authService.ts` and `api/_lib/_authService.ts` now validate `PUBLIC_APP_URL` before bypass or standard magic-link generation. Only valid `http/https` URLs are accepted; hash fragments are stripped; root trailing slash is normalized; missing/invalid values short-circuit to `delivery_failed`, skip Supabase `generateLink`, and skip Resend delivery. Tests now cover both the Sprint 12 email template and the missing-env failure path.
- Revisit trigger: If Nurimap later supports multiple deployment origins, tenant-specific domains, preview URLs, or a safer server-side canonical-origin source, revisit whether `PUBLIC_APP_URL` should stay a single required env or be replaced by a more structured origin-resolution policy.
- Related docs:
  - docs/05-sprints/sprint-12/planning.md
  - docs/03-specs/05-auth-email-login-link.md
  - docs/02-architecture/security-and-ops.md
  - docs/05-sprints/sprint-12/qa.md
- Related commit:

## 2026-03-12 Sprint 13 - Server-authoritative Naver short-link normalization
- Context: Sprint 13 needed place lookup to accept `naver.me` short links as well as direct `favorite/.../place/{id}` and `search/.../place/{id}` URLs. The existing client flow synchronously validated URLs in `PlaceAddPanels` before calling the server, which blocked short links and duplicated normalization logic across browser/server boundaries.
- Options considered:
  - Option A: keep client-side normalization authoritative and expand it to resolve `naver.me` inside the browser.
  - Option B: make the server authoritative for URL resolution/canonicalization, and let the client surface inline errors from the server response.
  - Option C: remove validation entirely and accept any URL string through to lookup.
- Decision: Option B를 선택한다.
- Rationale: `naver.me` resolution is network-dependent and better handled at the server boundary where redirect handling is deterministic and testable. This also removes the mismatch where browser-side prevalidation could reject URLs that the server is capable of canonicalizing correctly.
- Impact: place add flow now relies on `/api/place-lookup` for authoritative URL validation, inline invalid-URL errors come from the server response contract, and lookup services resolve `naver.me` redirects before extracting `naver_place_id`. Direct `favorite`, `search`, and `entry` URLs still normalize to the same canonical entry URL.
- Revisit trigger: If more Naver URL shapes appear, or if a shared cross-runtime normalization package becomes necessary, revisit whether the current split between sync direct-path parsing and server-side short-link resolution should be replaced by a single shared abstraction.
- Related docs:
  - docs/05-sprints/sprint-13/planning.md
  - docs/03-specs/06-naver-url-normalization.md
  - docs/03-specs/07-place-data-extraction.md
  - docs/02-architecture/integrations.md
- Related commit: 38d69a4

## 2026-03-12 Sprint 13 - Existing session wins over stale verify query on refresh
- Context: auth flow는 `PUBLIC_APP_URL?auth_mode=verify&email=...&nonce=...` wrapper 링크로 진입한다. 이 URL에서 refresh 하거나, 이미 세션이 살아 있는 상태로 stale verify query가 남아 있으면 bootstrap이 verify 분기를 다시 타면서 `verifying` 화면에 머물 가능성이 있었다.
- Options considered:
  - Option A: query에 `auth_mode=verify`가 있으면 항상 verify API를 다시 호출한다.
  - Option B: refresh 시에도 query를 즉시 버리고 무조건 로그인 화면으로 되돌린다.
  - Option C: 유효한 세션이 이미 있으면 stale verify query보다 세션 복원을 우선하고, verify 경로 예외는 `auth_failure` 같은 terminal state로 정리한다.
- Decision: Option C를 선택한다.
- Rationale: 이미 세션이 유효한 사용자는 stale query 때문에 verify를 반복할 필요가 없고, refresh/예외가 발생해도 `verifying` 무한 대기보다 terminal state가 더 안전하다. 이 접근은 기존 magic link / nonce wrapper 구조를 유지하면서 refresh 회귀만 가장 작은 범위로 막는다.
- Impact: `AuthProvider` bootstrap은 verify query가 있어도 기존 세션이 있으면 query를 정리하고 세션 복원으로 진입한다. verify-link fetch rejection, malformed payload, `verifyAndAdoptSession` 실패도 `verifying`에 머물지 않고 terminal auth state로 수렴한다. Sprint 13 auth 테스트는 refresh 회귀를 고정한다.
- Revisit trigger: auth 진입 URL 정책이 바뀌거나, email-link verify를 router 수준에서 별도 route로 분리하게 되면 bootstrap precedence를 다시 검토한다.
- Related docs:
  - docs/05-sprints/sprint-13/planning.md
  - docs/03-specs/05-auth-email-login-link.md
  - docs/01-product/user-flows/auth-and-name-entry.md
  - docs/04-design/auth-and-name-entry.md
- Related commit: 0960939

## 2026-03-13 Auth - Avoid refresh/bootstrap deadlock and bypass verify hangs
- Context: 실제 환경의 bypass allowlist 계정으로 확인한 결과, refresh 이후 세션이 있어도 auth bootstrap이 장시간 `loading`에 머물거나, bypass 재로그인 경로에서 `verifying`가 terminal state로 수렴하지 않는 경우가 있었다. `AuthProvider`는 `onAuthStateChange`에 async callback을 등록하고 내부에서 `getUser()`를 await하고 있었고, bypass 즉시 로그인 경로는 `verifyOtp` 지연/실패를 별도로 timeout 처리하지 않았다.
- Options considered:
  - Option A: 기존 async `SIGNED_IN` callback 구조를 유지한 채 bootstrap timeout만 늘리거나 UI fallback만 보강한다.
  - Option B: `SIGNED_IN`에서는 먼저 `session.user`로 동기 복원하고, 추가 `getUser()`는 callback 밖에서 비동기 보강 조회로 분리한다. 동시에 bypass 즉시 로그인 verify는 공용 timeout helper로 감싼다.
  - Option C: browser auth persistence/auto refresh 전략 자체를 바꾸거나 Supabase client 설정을 크게 재구성한다.
- Decision: Option B를 선택한다.
- Rationale: Supabase auth client는 async `onAuthStateChange` callback이 deadlock을 만들 수 있다고 명시하고 있고, 실제 refresh 재현에서도 bootstrap보다 먼저 들어온 `SIGNED_IN` 이벤트와 `getUser()` 재진입이 복원 경합을 만들었다. callback을 동기화하고 bypass verify를 timeout-safe helper로 분리하면 현재 auth 설계를 유지하면서 refresh와 bypass 재로그인 두 경로 모두 가장 작은 변경 범위로 안정화할 수 있다.
- Impact: `src/auth/AuthProvider.tsx`는 공통 `applyAuthenticatedState`로 세션 복원을 일관화하고, `SIGNED_IN` 이벤트에서는 즉시 `session.user`를 반영한 뒤 후속 `getUser()`를 queueMicrotask로 보강한다. `src/auth/authVerification.ts`는 bootstrap/bypass verify timeout helper를 담당하고, `src/auth/AuthFlow.test.tsx` / `src/auth/authVerification.test.ts`는 refresh 세션 복원 경쟁 상태와 bypass verify hang 회귀를 고정한다.
- Revisit trigger: auth 진입 경로를 router-level route로 분리하거나, Supabase auth 이벤트 처리 전략을 다시 설계하게 되면 현재 `session.user` 우선 복원 + 후속 보강 조회 구조를 재검토한다.
- Related docs:
  - docs/03-specs/05-auth-email-login-link.md
  - docs/04-design/auth-and-name-entry.md
  - docs/05-sprints/sprint-13/planning.md
- Related commit:

## 2026-03-13 Security - Treat live bypass emails as git-tracked and commit-metadata secrets
- Context: bypass 이메일 값은 code diff에는 남지 않았지만, 실제 값이 git commit author metadata로 공개되면 동일한 민감도 문제를 만든다는 점이 확인됐다. 기존 문서는 tracked file에는 적지 말라고만 했고, commit metadata나 local hook / CI guard까지는 명시하지 않았다.
- Options considered:
  - Option A: 문서 규칙만 보강하고 개발자 수동 점검에 의존한다.
  - Option B: placeholder 정책을 문서에 명시하고, repo-local hooks + CI denylist guard + git identity 고정까지 함께 도입한다.
  - Option C: bypass 기능 자체를 제거한다.
- Decision: Option B를 선택한다.
- Rationale: 민감 값이 tracked file이 아니라 commit metadata로 새어도 결과는 같으므로, 예방 통제는 content와 metadata를 함께 다뤄야 한다. 문서만으로는 재발 방지가 약하고, bypass 기능을 바로 제거하는 것은 운영 유연성을 잃게 만든다.
- Impact: repo는 `.githooks/`의 pre-commit / pre-push guard와 `scripts/guard-bypass-email.mjs`를 사용해 live bypass 이메일의 tracked-content/history-metadata 유입을 조기에 차단한다. 운영 문서와 AGENTS 지침은 live bypass 이메일을 env 전용 값으로 취급하고, tracked 예시는 placeholder만 허용한다. CI denylist workflow는 remote credential scope가 준비되는 시점에 같은 정책으로 추가할 수 있다.
- Revisit trigger: bypass 정책이 제거되거나, 더 일반적인 secret scanning platform으로 hook/CI 역할을 통합하게 되면 현재 guard 구성을 단순화할 수 있다.
- Related docs:
  - AGENTS.md
  - docs/00-governance/ai-agent-workflow.md
  - scripts/guard-bypass-email.mjs
- Related commit:
