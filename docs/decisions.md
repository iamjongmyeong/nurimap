# Decisions

## Purpose
이 문서는 Nurimap 개발 중 AI Agent가 **사용자 개입 없이 스스로 판단한 비자명한 의사결정**을 기록하는 로그다.
요구사항 자체를 대체하는 문서는 아니며, `docs/specs/*.md`, `docs/architecture/*.md`, `docs/plans.md`, `docs/definition-of-done.md`를 해석·적용하는 과정에서 생긴 판단 근거를 남기는 용도다.

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
## YYYY-MM-DD Plan XX - Short Title
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
- Related commit: TBD
```

## Usage Rules
- 한 Plan에서 여러 번 판단이 필요하면 entry를 여러 개 남겨도 된다.
- `Related commit`은 판단 당시 커밋이 없으면 `TBD`로 두고, Plan 종료 전에 실제 commit hash로 갱신한다.
- 문서 충돌이라면 먼저 충돌을 보고하고, 임의로 해소한 뒤 기록만 남기는 방식으로 처리하지 않는다.
- 다음 Plan으로 넘어가기 전에, 해당 Plan에서 생긴 중요한 판단이 모두 기록되었는지 확인한다.

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
  - docs/specs/00-app-shell-and-layout.md
  - docs/architecture/ui-design.md
  - docs/definition-of-done.md
- Related commit: 30b00cc


## 2026-03-08 Plan 01 - App shell state skeleton
- Context: Plan 01은 실제 데이터/인증 없이도 데스크톱/모바일 앱 셸과 향후 탐색 흐름의 상태 골격을 보여줘야 한다. 추후 Plan 02~03에서 목록/상세/모바일 페이지 전환이 자연스럽게 확장될 수 있어야 한다.
- Options considered:
  - Option A: Plan 01에서는 단순 정적 마크업만 만들고 상태 모델은 나중에 추가한다.
  - Option B: Plan 01부터 최소한의 navigation state 골격을 두고, 모바일 목록 페이지 전환 같은 기본 상호작용을 상태 기반으로 구현한다.
- Decision: Option B를 선택해 Zustand 기반의 최소 navigation state 골격을 도입한다.
- Rationale: ui-design 문서가 navigation state와 async substate 분리를 강조하고 있고, Plan 01 scope에도 선택 상태 공유 골격이 포함된다. 지금 최소 상태 골격을 잡아두면 이후 Plan에서 구조를 덜 흔들고 확장할 수 있다.
- Impact: `map_browse`, `mobile_place_list_open`, `place_add_open`, `place_detail_open` 상태 골격이 초기 구현에 포함된다. 모바일 `목록 보기` 버튼은 실제 상태 전환을 수행한다.
- Revisit trigger: Plan 02~03 구현 중 라우팅 또는 전역 상태 경계가 현재 store 구조와 크게 어긋난다고 판단될 때 재검토한다.
- Related docs:
  - docs/specs/00-app-shell-and-layout.md
  - docs/architecture/ui-design.md
  - docs/architecture/user-flow.md
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
  - docs/specs/06-map-rendering.md
  - docs/specs/07-list-browse.md
  - docs/architecture/integrations.md
  - docs/architecture/ui-design.md
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
  - docs/specs/06-map-rendering.md
  - docs/architecture/integrations.md
  - docs/architecture/security-and-ops.md
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
  - docs/specs/08-place-detail.md
  - docs/architecture/ui-design.md
  - docs/architecture/user-flow.md
- Related commit: 89bb3dd


## 2026-03-08 Plan 04 - Place add URL step uses the existing `place_add_open` surface
- Context: Plan 04는 Naver URL 정규화만 다루지만, 이후 Plan 05~06에서는 같은 진입점에서 조회 성공 후 2단계 place 등록 UI로 확장되어야 한다. 현재 앱에는 이미 `place_add_open` navigation state와 `장소 추가` 버튼이 존재한다.
- Options considered:
  - Option A: Plan 04에서는 별도 임시 페이지나 전용 route를 만들고, 이후 Plan 06에서 다시 2단계 place add UI로 교체한다.
  - Option B: 현재 `place_add_open` state를 그대로 활용해 데스크톱은 floating panel, 모바일은 full-screen page에서 URL 입력 1단계를 먼저 구현하고 이후 같은 surface를 2단계로 확장한다.
- Decision: Option B를 선택한다.
- Rationale: ui-design과 user-flow 문서가 place add를 같은 화면 안의 progressive disclosure로 정의하고 있어, 지금부터 동일 surface를 쓰는 편이 later refactor를 줄인다.
- Impact: Plan 04의 URL 입력 UI는 이후 Plan 05/06에서 동일한 state와 surface 위에 place 요약/등록 입력 단계가 추가될 예정이다.
- Revisit trigger: Plan 06 구현 시 2단계 등록 UI가 현재 panel/page 구조로는 자연스럽게 확장되지 않는다고 판단되면 재조정한다.
- Related docs:
  - docs/specs/02-naver-url-normalization.md
  - docs/architecture/ui-design.md
  - docs/architecture/user-flow.md
- Related commit: c8bd3ec


## 2026-03-08 Plan 05 - Server-side place lookup starts with fixture-backed adapter
- Context: 문서는 server-side Naver place lookup과 Kakao geocoding fallback을 요구하지만, 현재 저장소에는 공식 Naver place detail API 계약이 확정돼 있지 않다. `docs/architecture/integrations.md`도 내부 API 후보는 있으나 안정성과 약관을 구현 단계에서 재검증해야 한다고 적고 있다.
- Options considered:
  - Option A: 실제 Naver 비공식 source를 바로 붙여서 Plan 05를 끝낸다.
  - Option B: server-side lookup boundary와 geocoding fallback 계약을 먼저 구현하고, place source는 fixture-backed adapter로 시작한다. 이후 실제 Naver source를 같은 interface 뒤에 교체한다.
- Decision: Option B를 선택한다.
- Rationale: 현재는 사용자 개입 없이 연속 개발을 진행해야 하고, 공식 API 부재 상태에서 비공식 source를 바로 고정하면 리스크가 크다. fixture-backed adapter로 시작하면 서버 경계, 상태 모델, retry/failure UX, geocoding fallback, 다음 단계 등록 UI를 먼저 안정화할 수 있다.
- Impact: Plan 05는 server route + lookup contract + fallback 로직 + UI 2단계 진행 구조를 구현한다. 실제 Naver source는 같은 adapter interface 뒤에서 교체 가능하게 유지한다.
- Revisit trigger: 실제 Naver source를 안전하게 재현할 수 있는 계약이 확보되면 fixture adapter를 실 source adapter로 교체한다.
- Related docs:
  - docs/specs/03-place-data-extraction.md
  - docs/architecture/integrations.md
  - docs/architecture/user-flow.md
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
  - docs/specs/03-place-data-extraction.md
  - docs/architecture/integrations.md
  - docs/definition-of-done.md
- Related commit: a7d759e


## 2026-03-08 Plan 06 - Use client-side in-memory place repository before auth/storage
- Context: docs/plans.md는 인증과 접근 제어를 Plan 08에 두고, 그 전까지 place 추가/탐색을 로컬에서 먼저 검증하도록 정의한다. Plan 06은 등록과 병합 규칙 자체를 먼저 검증해야 하므로, 아직 Supabase persistence를 강제하지 않는 것이 전체 순서와 맞다.
- Options considered:
  - Option A: Plan 06부터 실제 DB 저장을 먼저 붙인다.
  - Option B: client-side in-memory repository로 등록/병합 규칙을 구현하고, later Plan에서 persistence adapter를 붙인다.
- Decision: Option B를 선택한다.
- Rationale: 현재 릴리즈 순서상 인증/접근 제어와 DB persistence보다 UX/도메인 규칙 검증이 먼저다. in-memory repository로도 신규 등록, 중복 병합, 리뷰 uniqueness, 상태 갱신 규칙을 충분히 검증할 수 있다.
- Impact: Plan 06의 저장/병합은 Zustand store 기반 repository가 담당한다. 이후 auth/persistence 단계에서 같은 규칙을 server adapter로 옮길 수 있게 helper 함수로 분리한다.
- Revisit trigger: Plan 08 또는 release-hardening 단계에서 실제 persistence 경계가 필요해지면 repository 구현을 Supabase-backed adapter로 교체한다.
- Related docs:
  - docs/specs/04-place-registration.md
  - docs/specs/05-place-merge.md
  - docs/plans.md
- Related commit: 2cfd248

