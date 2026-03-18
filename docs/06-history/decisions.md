# Decisions

## Purpose
이 문서는 Nurimap 개발 중 AI Agent가 자율적으로 내린 판단뿐 아니라, 사용자와 함께 확정한 추가 판단이 필요한 의사결정도 기록하는 로그다.
요구사항 자체를 대체하는 문서는 아니며, `docs/00-governance/definition-of-done.md`, `docs/architecture/*.md`, `docs/03-specs/*.md`, `docs/99-archive/plans.md`를 해석·적용하는 과정에서 생긴 판단 근거와 결정 배경을 남기는 용도다.
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

## 2026-03-15 Governance - Make UI implementation screenshot-first and stop default creative design skill guidance
- Context: 최근 Sprint 15 UI 작업에서 사용자 의도는 “제공한 디자인을 그대로 반영”이었지만, 기존 AGENTS / workflow 가이드에는 `frontend-design`, `ui-ux-pro-max`처럼 창의적 확장이나 시각 해석을 유도하는 문구가 남아 있었다. 이 상태는 reference fidelity가 중요한 작업에서 agent가 과도한 디자인 판단을 섞을 위험이 있었다.
- Options considered:
  - Option A: 기존 가이드를 유지하고, 각 UI 요청마다 개별적으로 “임의 판단 금지”를 반복한다.
  - Option B: `docs/00-governance/agent-workflow.md`를 screenshot-first UI fidelity의 canonical 위치로 두고, AGENTS.md에서는 중복 규칙 대신 workflow 참조만 유지한다.
- Decision: Option B를 선택한다.
- Rationale: UI fidelity 기준은 작업마다 반복해서 상기시키는 임시 규칙보다, canonical workflow 문서에 고정하는 편이 일관성과 재현성이 높다. screenshot/Figma 기반 작업에서는 reference를 source of truth로 고정하고, reference가 없을 때는 먼저 screenshot을 요청하는 흐름이 사용자의 의도와 가장 잘 맞는다. 같은 규칙을 AGENTS와 workflow 양쪽에 중복으로 두면 언어/내용 drift가 생기기 쉬우므로 canonical 위치를 하나로 줄이는 편이 안전하다.
- Impact: 앞으로 UI 구현에서는 사용자 제공 screenshot / Figma / annotated capture를 우선 source of truth로 사용한다. UI fidelity가 중요한데 reference screenshot이 없으면 비자명한 시각 변경 전에 사용자에게 screenshot 제공을 먼저 요청한다. `/prompts:vision`과 `$visual-verdict`는 screenshot 기반 UI 구현/검증의 기본 prompt/skill로 안내하고, `frontend-design`, `ui-ux-pro-max` 사용 유도 문구는 기본 가이드에서 제거한다. 상세 규칙은 `docs/00-governance/agent-workflow.md`에만 유지하고, AGENTS.md는 workflow 참조를 통해 간접 적용한다.
- Revisit trigger: 팀이 향후 screenshot fidelity보다 창의적 redesign을 기본값으로 삼는 별도 UI workflow를 공식 도입하면, 현재 screenshot-first 원칙과 skill guidance를 다시 조정한다.
- Related docs:
  - AGENTS.md
  - docs/00-governance/agent-workflow.md
  - docs/design/browse-and-detail.md
  - docs/05-sprints/sprint-15/planning.md
- Related commit: TBD

## 2026-03-15 Sprint 15 - Consolidate UI assets under `public/assets/` with semantic kebab-case naming
- Context: Sprint 15 browse/detail UI refactor 동안 아이콘과 이미지가 `public/sprint15/` 아래에 ad-hoc하게 쌓이면서, build 결과도 `dist/sprint15/` 기준으로 분산됐다. 이후 같은 유형의 자산이 늘어나면 경로 예측성과 네이밍 일관성이 떨어질 수 있어, 지금 관리 루트와 naming rule을 고정할 필요가 생겼다.
- Options considered:
  - Option A: 기존 `public/sprint15/branding`, `public/sprint15/icons` 구조를 유지하고 파일명만 부분 수정한다.
  - Option B: browse/detail UI 자산의 tracked root를 `public/assets/`로 통일하고, `branding/`, `icons/` 하위 폴더 + lowercase kebab-case semantic naming 규칙으로 재정렬한다.
  - Option C: 정적 자산을 `src/` 아래로 옮겨 bundler import 기반으로만 관리한다.
- Decision: Option B를 선택한다.
- Rationale: `public/assets/`는 브라우저 runtime 경로와 build 결과(`dist/assets/...`)를 함께 예측 가능하게 만들고, branding/icon 구분도 명확하다. semantic kebab-case naming은 파일명만 보고도 역할과 variant를 이해할 수 있어 이후 Sprint의 자산 추가/교체 비용을 줄인다. Option A는 임시 정리에 가깝고, Option C는 현재 public 정적 자산 관리 패턴과 문서 범위를 불필요하게 넓힌다.
- Impact: browse/detail UI 자산은 `public/assets/branding/*`, `public/assets/icons/*` 기준으로 관리한다. 파일명은 `brand-*`, `icon-*` prefix와 semantic kebab-case를 사용한다. 기존 `/sprint15/...` runtime 참조는 `/assets/...`로 교체하고, build 결과도 `dist/assets/...` 기준으로 정렬된다.
- Revisit trigger: 앱 전역에서 image optimization pipeline, bundler import 정책, 또는 CDN fingerprint 전략을 새로 도입해 `public/` 기반 정적 자산 관리보다 더 적합한 표준이 생기면 현재 규칙을 재검토한다.
- Related docs:
  - docs/design/browse-and-detail.md
  - docs/05-sprints/sprint-15/planning.md
  - docs/05-sprints/sprint-15/qa.md
  - docs/05-sprints/sprint-15/review.md
- Related commit: TBD

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
  - docs/99-archive/design/foundations.md
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
  - docs/99-archive/design/foundations.md
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
  - docs/99-archive/architecture/integrations.md
  - docs/design/browse-and-detail.md
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
  - docs/99-archive/architecture/integrations.md
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
  - docs/03-specs/04-place-detail.md
  - docs/design/browse-and-detail.md
  - docs/01-product/user-flows/browse-and-detail.md
- Related commit: 89bb3dd


## 2026-03-08 Plan 04 - Place add URL step uses the existing `place_add_open` surface
- Context: Plan 04는 Naver URL 정규화만 다루지만, 이후 Plan 05~06에서는 같은 진입점에서 조회 성공 후 2단계 place 등록 UI로 확장되어야 한다. 현재 앱에는 이미 `place_add_open` navigation state와 `장소 추가` 버튼이 존재한다.
- Options considered:
  - Option A: Plan 04에서는 별도 임시 페이지나 전용 route를 만들고, 이후 Plan 06에서 다시 2단계 place add UI로 교체한다.
  - Option B: 현재 `place_add_open` state를 그대로 활용해 데스크톱은 floating panel, 모바일은 full-screen page에서 URL 입력 1단계를 먼저 구현하고 이후 같은 영역을 2단계로 확장한다.
- Decision: Option B를 선택한다.
- Rationale: design 문서와 user-flow 문서가 place add를 같은 화면 안의 progressive disclosure로 정의하고 있어, 지금부터 동일 surface를 쓰는 편이 later refactor를 줄인다.
- Impact: Plan 04의 URL 입력 UI는 이후 Plan 05/06에서 동일한 state와 surface 위에 place 요약/등록 입력 단계가 추가될 예정이다.
- Revisit trigger: Plan 06 구현 시 2단계 등록 UI가 현재 panel/page 구조로는 자연스럽게 확장되지 않는다고 판단되면 재조정한다.
- Related docs:
  - docs/03-specs/06-naver-url-normalization.md
  - docs/design/place-submission.md
  - docs/01-product/user-flows/place-submission.md
- Related commit: c8bd3ec


## 2026-03-08 Plan 05 - Server-side place lookup starts with fixture-backed adapter
- Context: 문서는 server-side Naver place lookup과 Kakao geocoding fallback을 요구하지만, 현재 저장소에는 공식 Naver place detail API 계약이 확정돼 있지 않다. `docs/99-archive/architecture/integrations.md`도 내부 API 후보는 있으나 안정성과 약관을 구현 단계에서 재검증해야 한다고 적고 있다.
- Options considered:
  - Option A: 실제 Naver 비공식 source를 바로 붙여서 Plan 05를 끝낸다.
  - Option B: server-side lookup boundary와 geocoding fallback 계약을 먼저 구현하고, place source는 fixture-backed adapter로 시작한다. 이후 실제 Naver source를 같은 interface 뒤에 교체한다.
- Decision: Option B를 선택한다.
- Rationale: 현재는 사용자 개입 없이 연속 개발을 진행해야 하고, 공식 API 부재 상태에서 비공식 source를 바로 고정하면 리스크가 크다. fixture-backed adapter로 시작하면 서버 경계, 상태 모델, retry/failure UX, geocoding fallback, 다음 단계 등록 UI를 먼저 안정화할 수 있다.
- Impact: Plan 05는 server route + lookup contract + fallback 로직 + UI 2단계 진행 구조를 구현한다. 실제 Naver source는 같은 adapter interface 뒤에서 교체 가능하게 유지한다.
- Revisit trigger: 실제 Naver source를 안전하게 재현할 수 있는 계약이 확보되면 fixture adapter를 실 source adapter로 교체한다.
- Related docs:
  - docs/03-specs/07-place-data-extraction.md
  - docs/99-archive/architecture/integrations.md
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
  - docs/99-archive/architecture/integrations.md
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
  - docs/architecture/security-and-ops.md
  - docs/99-archive/architecture/system-context.md
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
  - docs/architecture/domain-model.md
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
  - docs/architecture/domain-model.md
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
  - docs/architecture/domain-model.md
  - docs/99-archive/design/recommendation.md
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
  - docs/architecture/security-and-ops.md
  - docs/99-archive/architecture/integrations.md
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
  - docs/architecture/security-and-ops.md
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
  - docs/design/auth-and-name-entry.md
- Related commit:


## 2026-03-10 Docs structure - Split design docs out of architecture and align them with user flows
- Context: 기존에는 `docs/architecture/ui-design.md` 하나에 공통 레이아웃, 상태 모델, 인증 화면, 탐색 화면, 장소 등록, 리뷰/추천 디자인 규칙이 함께 들어 있었다. 사용자는 user-flow 문서와 UI design 문서의 역할을 더 명확히 분리하고, 공통 기준과 흐름별 디자인 문서를 따로 관리하길 원했다.
- Options considered:
  - Option A: 기존 `docs/architecture/ui-design.md`를 유지하고 필요한 문단만 정리한다.
  - Option B: `design/` 폴더를 새로 만들고, 공통 기준은 `foundations.md`, 흐름별 화면 규칙은 대응하는 flow slug 문서로 분리한다. 이후 `04-sprints`, `05-history`도 `05-sprints`, `06-history`로 민다.
- Decision: Option B를 선택한다.
- Rationale: 디자인 문서는 architecture의 도메인/보안/시스템 경계와 성격이 다르고, 사용자 흐름과 더 가까운 화면 구조 규칙을 따로 읽을 수 있어야 문서 책임이 분명해진다. 공통 기준과 흐름별 규칙을 분리하면 이후 auth, browse, submission, review, recommendation 변경도 영향 범위를 더 쉽게 좁힐 수 있다.
- Impact: `docs/99-archive/design/foundations.md`가 전역 breakpoint/state model source of truth가 된다. `docs/design/auth-and-name-entry.md`, `browse-and-detail.md`, `place-submission.md`, `review.md`, `recommendation.md`가 흐름별 UI 기준을 담당한다. Sprint와 history 문서 경로는 각각 `docs/05-sprints/`, `docs/06-history/`로 이동한다.
- Revisit trigger: 향후 design 문서가 다시 한 파일에 과도하게 집중되거나, flow별 문서보다 컴포넌트 시스템 문서가 더 적합해지면 design 정보 구조를 다시 조정한다.
- Related docs:
  - docs/00-governance/docs-structure.md
  - docs/00-governance/agent-workflow.md
  - docs/99-archive/design/foundations.md
  - docs/design/auth-and-name-entry.md
  - docs/design/browse-and-detail.md
  - docs/design/place-submission.md
  - docs/99-archive/design/review.md
  - docs/99-archive/design/recommendation.md
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
  - docs/architecture/security-and-ops.md
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
  - docs/99-archive/architecture/integrations.md
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
  - docs/design/auth-and-name-entry.md
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
  - docs/design/auth-and-name-entry.md
  - docs/05-sprints/sprint-13/planning.md
- Related commit:

## 2026-03-13 Sprint 13 - Consolidate governance guidance into agent-workflow
- Context: `docs/00-governance/`에 workflow 문서와 planning/design-development/QA-docs 보조 가이드가 함께 생기면서 파일 수와 라우팅 경로가 다시 늘어났다.
- Options considered:
  - Option A: `agent-workflow.md`와 3개의 보조 가이드를 계속 분리 유지한다.
  - Option B: workflow 문서를 `agent-workflow.md`로 정리하고, 중복 없는 repository-specific task guidance만 그 문서에 흡수한 뒤 보조 가이드를 제거한다. `AGENTS.md`는 orchestration/hard constraint 중심으로 축약한다.
- Decision: Option B를 선택한다.
- Rationale: planning/QA/docs 규칙은 workflow 문서와 많이 겹쳤고, design/development guidance도 별도 파일로 둘 만큼 크지 않았다. 하나의 workflow 문서로 수렴하는 편이 `AGENTS.md` 라우팅과 유지보수 모두 더 단순하다. 반대로 provider 제한, team/state orchestration 같은 runtime 규칙은 `AGENTS.md`에 남겨야 책임 경계가 선명해진다.
- Impact: `docs/00-governance/agent-workflow.md`가 유일한 repository-specific agent workflow 문서가 되고, planning/design-development/QA-docs 보조 가이드는 제거된다. 공식 문서 우선, Playwright 기본 사용, frontend stack 기본값, decision 기록 규칙은 `agent-workflow.md`를 source of truth로 둔다. `AGENTS.md`는 Codex-only constraint와 orchestration/runtime guidance 중심으로 축약한다.
- Revisit trigger: `agent-workflow.md`가 다시 과도하게 비대해지거나 독립 문서가 꼭 필요한 범위가 생기면 그때만 별도 문서 분리를 재검토한다.
- Related docs:
  - docs/00-governance/agent-workflow.md
  - docs/00-governance/docs-structure.md
  - AGENTS.md
- Related commit: TBD

## 2026-03-13 Sprint 13 - Add lightweight change-card tracking inside sprint docs
- Context: medium-sized change를 추적하기 위해 별도 packet 파일이나 `.omx` 의존 구조를 도입하는 대신, 기존 sprint canonical 문서 안에서 더 가볍게 change-level traceability를 시작하고 싶었다.
- Options considered:
  - Option A: 별도 change packet 파일/폴더를 도입한다.
  - Option B: `planning.md`, `qa.md`, `review.md` 템플릿 안에 선택적 change card 섹션만 추가한다.
- Decision: Option B를 선택한다.
- Rationale: 현재 sprint-first 구조를 유지하면서 change 단위 추적성을 보강하는 가장 작은 변경이다. 새 artifact 위치를 만들지 않아도 되고 `.omx`나 별도 폴더 업데이트 리스크도 피할 수 있다.
- Impact: 새 sprint부터 `planning.md`의 `# Active Changes`, `qa.md`의 `# Change Verification`, `review.md`의 `# Change Outcomes`를 선택적으로 사용할 수 있다. tiny/local fix는 제외하고, card는 요약/추적용으로만 유지한다. Sprint canonical 구조와 source-of-truth hierarchy는 유지된다.
- Revisit trigger: change card만으로도 medium/large change의 why / scope / verification 추적이 부족하면, 그때 별도 change packet artifact를 다시 검토한다.
- Related docs:
  - docs/00-governance/docs-structure.md
  - docs/00-governance/agent-workflow.md
  - docs/05-sprints/template/planning.md
  - docs/05-sprints/template/qa.md
  - docs/05-sprints/template/review.md
- Related commit: TBD

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
  - docs/00-governance/agent-workflow.md
  - scripts/guard-bypass-email.mjs
- Related commit:

## 2026-03-14 Tooling - Standardize local package management on pnpm
- Context: repo는 `package-lock.json`과 npm 기반 실행 예시를 사용하고 있었지만, 현재 로컬 설치 상태는 pnpm 기반으로 전환되었고 Vercel CLI도 다시 설치됐다. 이 상태에서 lockfile과 실행 엔트리가 혼재하면 협업자/CI가 서로 다른 package manager를 쓰게 될 위험이 있었다.
- Options considered:
  - Option A: npm lockfile과 실행 엔트리를 유지하고 pnpm 전환은 로컬 관행으로만 둔다.
  - Option B: repo의 canonical lockfile과 로컬 실행 엔트리를 pnpm 기준으로 정리하고, `packageManager` 필드로 사용 버전을 명시한다.
- Decision: Option B를 선택한다.
- Rationale: 단일 lockfile과 명시적 package manager 선언이 dependency drift를 줄이고, 현재 로컬/배포 준비 상태와 가장 잘 맞는다. Makefile까지 함께 맞추면 반복 실행 경로도 동일한 도구 체인으로 수렴한다.
- Impact: `package-lock.json`을 제거하고 `pnpm-lock.yaml` / `pnpm-workspace.yaml`을 추적한다. `package.json`에 `packageManager`를 명시하고, `Makefile`의 검증/개발 명령은 pnpm 기준으로 실행된다. Vercel CLI 설치 상태는 pnpm lockfile에 반영된다.
- Revisit trigger: CI, 배포 환경, 또는 팀 표준이 npm/yarn 등 다른 package manager로 바뀌면 lockfile/실행 엔트리 표준을 다시 검토한다.
- Related docs:
  - package.json
  - pnpm-lock.yaml
  - pnpm-workspace.yaml
  - Makefile
- Related commit:

## 2026-03-14 Local auth - Prefer DEV-only bypass auto-login over fake authenticated UI
- Context: 로컬에서 지도 화면으로 바로 들어가고 싶지만, 기존 `?auth_test_state=authenticated` override는 fake access token만 제공해서 보호된 API(`place-lookup` 등)까지는 실제처럼 검증할 수 없었다. 목표는 이메일 입력/클릭 없이도 로컬에서 실제 세션에 가까운 흐름으로 진입하는 것이다.
- Options considered:
  - Option A: `auth_test_state=authenticated` 같은 클라이언트 fake auth override를 기본 로컬 진입 경로로 쓴다.
  - Option B: DEV 전용 env flag로만 auto-login을 켜고, 내부적으로는 기존 `requestLink -> bypass verify -> session adopt` 흐름을 자동 트리거한다.
- Decision: Option B를 선택한다.
- Rationale: fake auth는 UI spot-check에는 빠르지만 보호 API 검증에서는 실제 auth 계약과 어긋난다. 반면 기존 bypass 흐름을 재사용하면 local-only 편의성과 real session 기반 검증을 동시에 얻을 수 있고, query override는 기존처럼 별도 QA 도구로 유지할 수 있다.
- Impact: `VITE_LOCAL_AUTO_LOGIN=true` 와 `VITE_LOCAL_AUTO_LOGIN_EMAIL`이 설정된 DEV 환경에서는 `AuthProvider`가 최초 `auth_required` 진입 시 한 번만 bypass-only 로그인 요청을 자동 시작한다. 서버 bypass 조건이 맞지 않으면 일반 로그인 링크를 보내지 않고 로그인 폼으로 복귀시켜 오류를 보여준다. `auth_test_state` override가 있을 때는 기존 dev/test override가 우선하며, 로그아웃 후에는 같은 페이지 세션에서 auto-login loop가 다시 돌지 않는다. 실제 bypass 이메일 값은 계속 `.env.local` 등 비추적 env에만 둔다.
- Revisit trigger: 로컬 dev에서도 bypass 없이 preview/prod와 동일한 auth만 강제하기로 팀 정책이 바뀌거나, 보호 API를 포함한 더 정식한 local auth harness가 도입되면 현재 auto-login 편의 계층을 재검토한다.
- Related docs:
  - src/auth/AuthProvider.tsx
  - src/auth/AuthFlow.test.tsx
  - docs/03-specs/05-auth-email-login-link.md
- Related commit:

## 2026-03-14 Sprint 14 - Prefer user-entered place name/address over URL-dependent place ingestion
- Context: place 등록의 기본 경로를 네이버 지도 URL 기반 외부 조회에 두면 anti-bot, rate-limit, fixture 의존성 때문에 현재 place id 변화에 취약해질 수 있다는 점이 확인됐다. 반면 사용자에게 장소명과 주소를 직접 입력받고 geocoding으로 위치를 확인하는 흐름은 외부 place 페이지 조회를 등록의 필수 전제로 삼지 않아도 된다.
- Options considered:
  - Option A: 네이버 지도 URL 기반 등록을 계속 기본 경로로 유지하고 외부 조회 경로를 더 hardening 한다.
  - Option B: 장소 등록의 기본 경로를 사용자 직접 입력(`name`, `road_address`) + geocoding 확인으로 전환한다.
  - Option C: 외부 crawler/browser automation을 핵심 사용자 요청 경로에 포함해 place 상세를 계속 자동 추출한다.
- Decision: Option B를 선택한다.
- Rationale: 직접 입력 + geocoding 경로는 anti-bot과 외부 페이지 구조 변화에 덜 취약하고, 등록 성공 여부를 내부 입력/검증 규칙으로 통제할 수 있다. 또한 제품의 기본 등록 경로를 사용자와 시스템이 함께 확인 가능한 데이터로 단순화해, 이후 UX/UI 개선과 구현 범위를 더 명확하게 고정할 수 있다.
- Impact: place 등록의 source of truth는 `네이버 지도 URL 입력`에서 `장소명 + 주소 직접 입력`으로 이동한다. geocoding이 좌표 확보의 1차 경로가 된다. 관련 user flow / design / spec / architecture 문서는 이 기본 전환만 반영하고, UXUI 상세 변경은 별도 history 항목으로 남기지 않는다.
- Revisit trigger: 안정적인 공식 place detail API나 같은 수준의 신뢰 가능한 외부 place 데이터 계약이 확보되어, 직접 입력보다 더 낮은 사용자 부담과 운영 리스크로 등록을 단순화할 수 있게 되면 기본 등록 경로를 다시 검토한다.
- Related docs:
  - docs/01-product/product-overview.md
  - docs/01-product/user-flows/place-submission.md
  - docs/99-archive/architecture/system-context.md
  - docs/99-archive/architecture/integrations.md
  - docs/architecture/domain-model.md
  - docs/03-specs/07-place-data-extraction.md
  - docs/03-specs/08-place-registration.md
  - docs/03-specs/09-place-merge.md
  - docs/05-sprints/sprint-14/planning.md
- Related commit:


## 2026-03-15 Sprint 17 - Adopt minimal hybrid routing while keeping place-add as internal app-shell state
- Context: browse/detail 흐름은 direct entry와 browser back, refresh 안정성을 위해 canonical URL이 필요해졌지만, 현재 design과 user-flow는 place add를 기존 목록/사이드바 surface 안의 상태 전환으로 정의한다. 기존 구현도 Zustand 기반 navigation state와 mobile detail history bridge를 사용하고 있어, 전면 라우터화와 무라우팅 유지 사이에서 bounded choice가 필요했다.
- Options considered:
  - Option A: 현재 Zustand-only navigation 구조를 유지하고 direct entry / browser back 요구를 history bridge와 query parsing으로 계속 보강한다.
  - Option B: `/places/:placeId`와 `/auth/verify`만 도입하는 최소 hybrid routing으로 가고, `place_add_open`과 `mobile_place_list_open`은 internal UI state로 유지한다.
  - Option C: `/login`, `/add-place`, `/places/:placeId`를 포함한 full route split으로 전환한다.
- Decision: Option B를 선택한다.
- Rationale: detail과 auth verify는 shareable/direct-entry 가능한 durable state라 URL이 필요하지만, place add는 현재 source-of-truth 문서가 같은 surface 안의 전환으로 고정하고 있다. 최소 hybrid routing은 direct entry, refresh, browser back 안정성을 얻으면서도 기존 app-shell 구조와 테스트 자산을 가장 덜 흔든다.
- Impact: canonical detail route는 `/places/:placeId`, canonical auth verify route는 `/auth/verify`를 사용한다. `place_add_open`과 `mobile_place_list_open`은 계속 internal state로 남고, route/store bridge는 UI layer에서 수행한다. migration 동안 legacy root verify query는 병행 지원한다.
- Revisit trigger: public/private shell 분리, route-level data loading, not-found page, 또는 add-place deep-link 요구가 커져 현재 minimal hybrid 구조가 부족해지면 full router split을 다시 검토한다.
- Related docs:
  - docs/05-sprints/sprint-17/planning.md
  - docs/03-specs/03-list-browse.md
  - docs/03-specs/04-place-detail.md
  - docs/03-specs/05-auth-email-login-link.md
  - docs/01-product/user-flows/browse-and-detail.md
  - docs/01-product/user-flows/auth-and-name-entry.md
  - docs/design/browse-and-detail.md
- Related commit: TBD

## 2026-03-15 Sprint 17 - Replace immediate cooldown + daily limit with resend burst then cooldown
- Context: 현재 auth policy는 로그인 링크 요청 직후 바로 5분 cooldown을 적용하고 일일 5회 제한을 둔다. 사용자는 같은 이메일에 대해 최대 5회까지는 대기 없이 재전송을 허용하고, 그 이후에만 cooldown을 적용하는 정책으로 바꾸길 원했다.
- Options considered:
  - Option A: 기존 즉시 cooldown + 일일 5회 제한 정책을 유지한다.
  - Option B: 동일 이메일 기준으로 burst 5회까지 즉시 재전송을 허용하고, 6번째 요청부터 5분 cooldown을 적용하며 cooldown 종료 후 burst count를 reset한다.
  - Option C: 일일 제한은 유지하되 숫자를 별도로 올리고 burst/cooldown을 추가하는 혼합 정책을 만든다.
- Decision: Option B를 선택한다.
- Rationale: 사용자의 요청은 “첫 전송 직후 곧바로 막히지 않게 해 달라”는 것이고, 현재 정책은 그 요청과 정면으로 충돌한다. burst 후 cooldown 방식은 재전송 UX를 단순하게 만들고, policy/copy/test를 한 번에 명확하게 정리할 수 있다.
- Impact: 기존 `즉시 5분 cooldown + 하루 5회 제한`은 Sprint 17 source of truth가 아니다. 동일 이메일은 burst 5회까지 즉시 재전송할 수 있고, 6번째 요청부터 5분 cooldown을 적용한다. cooldown 카피는 `MM분 SS초 후에 다시 시도해주세요.` 형식을 사용하고, 분이 0이면 초만 표시한다.
- Revisit trigger: abuse/운영 관찰 결과 burst 5회가 과도하거나 부족하다고 판단되면 burst 횟수, cooldown 길이, rolling window 기반 정책으로 재검토한다.
- Related docs:
  - docs/05-sprints/sprint-17/planning.md
  - docs/03-specs/05-auth-email-login-link.md
  - docs/01-product/user-flows/auth-and-name-entry.md
  - docs/design/auth-and-name-entry.md
- Related commit: TBD

## 2026-03-15 Sprint 17 - Separate runtime map loading/failure UX from deterministic test fallback renderer
- Context: Kakao map integration은 Plan 02에서 runtime adapter + fallback renderer 구조를 선택했지만, 현재 runtime browser에서 SDK가 준비되지 않으면 user-facing 화면에도 navy fake-map fallback이 그대로 보인다. 이 화면은 테스트/비런타임 fallback에는 유용하지만, 실제 사용자에게는 loading인지 failure인지 구분이 어렵다.
- Options considered:
  - Option A: 현재 fallback renderer를 runtime loading/unavailable UI로도 계속 사용한다.
  - Option B: runtime browser에서는 loading과 failure를 별도 UX로 분리하고, deterministic fallback renderer는 test/JSDOM 계약 용도로만 유지한다.
- Decision: Option B를 선택한다.
- Rationale: 사용자 관점에서 지도 loading과 지도 failure는 구분 가능해야 하고, fake-map처럼 보이는 fallback은 실제 지도가 로드된 것으로 오해를 줄 수 있다. test fallback renderer 자체를 버릴 필요는 없지만, runtime UX와 역할을 분리하는 편이 현재 symptom과 spec의 “현재 맥락 안에서 이해 가능한 실패 표시” 요구를 더 잘 만족한다.
- Impact: runtime loading 상태에서는 spinner/placeholder를, runtime failure/unavailable 상태에서는 retry 가능한 실패 UI를 지도 영역 안에 표시한다. deterministic fallback renderer는 테스트/JSDOM에서만 canonical 검증 surface로 유지한다.
- Revisit trigger: Kakao SDK wrapper abstraction을 별도로 도입하거나, runtime map adapter와 test fallback의 차이가 더 커져 별도 component 경계가 필요해지면 현재 구조를 다시 검토한다.
- Related docs:
  - docs/05-sprints/sprint-17/planning.md
  - docs/03-specs/02-map-rendering.md
  - docs/01-product/user-flows/browse-and-detail.md
  - docs/design/browse-and-detail.md
  - docs/06-history/decisions.md
- Related commit: TBD


## 2026-03-15 Sprint 17 - Defer login-link consumption until session adoption succeeds
- Context: deployed 환경에서 새로 발급한 로그인 링크가 시크릿 창이나 다른 세션에서 곧바로 `used`로 처리되는 사례가 발견됐다. 현재 구조는 `/api/auth/verify-link`가 nonce를 유효하다고 판단하는 즉시 `last_consumed_nonce`를 기록해, 실제 로그인 세션 채택 전에도 링크가 소모될 수 있었다.
- Options considered:
  - Option A: 현재처럼 `verify-link` 단계에서 즉시 nonce를 consumed 처리한다.
  - Option B: `verify-link`는 read-only 검증만 수행하고, 실제 `verifyOtp` 성공 뒤 별도 `consume-link` 단계에서만 nonce를 consumed 처리한다.
- Decision: Option B를 선택한다.
- Rationale: 링크가 사용자보다 먼저 접근되는 환경(메일 미리보기/링크 스캐너/다른 세션)에서는, 실제 세션 채택 전에 nonce를 소모하면 fresh link가 곧바로 `used`가 되는 UX 문제가 생긴다. `consume-link`를 분리하면 서버의 단일 사용 상태는 유지하면서도 premature consumption을 줄일 수 있다.
- Impact: `/api/auth/verify-link`는 tokenHash와 verificationType만 반환하고, `consume-link`가 실제 소모를 담당한다. 클라이언트는 `verifyOtp` 성공 후 best-effort로 `consume-link`를 호출한다. fresh nonce는 세션 채택 전까지는 계속 검증 가능하고, 사용 완료 표시는 finalize 이후에만 남는다.
- Revisit trigger: 메일 스캐너가 `verifyOtp`까지 실제로 수행하는 사례가 확인되거나, consume-link 실패 telemetry가 자주 보이면 code-based login 또는 더 강한 claimed/finalized 2단계 구조를 재검토한다.
- Related docs:
  - docs/05-sprints/sprint-17/planning.md
  - docs/03-specs/05-auth-email-login-link.md
  - docs/01-product/user-flows/auth-and-name-entry.md
  - docs/design/auth-and-name-entry.md
- Related commit: TBD

## 2026-03-15 Sprint 17 - Enforce explicit `.js` specifiers in Vercel API helper imports
- Context: deployed `/api/place-entry`가 JSON 대신 generic HTML server error를 반환하는 문제가 발생했고, `api/_lib/_placeEntryService.ts`는 다른 Vercel boundary helper와 달리 상대 import에 `.js` specifier를 쓰지 않고 있었다. 저장소에는 이미 Vercel 함수 경계에서 `.js` specifier를 강제해야 한다는 prior decision이 있었다.
- Options considered:
  - Option A: `place-entry` route에서 예외만 JSON으로 감싸고 helper import 규칙은 그대로 둔다.
  - Option B: helper import를 `.js` specifier로 고치고, route는 fallback JSON 500을 유지하며, api boundary regression test로 규칙을 고정한다.
- Decision: Option B를 선택한다.
- Rationale: 런타임 import 경계를 바로잡지 않으면 같은 계열의 장애가 다른 API에서도 다시 날 수 있다. JSON fallback만으로는 사용자는 보호되지만, 원인 자체를 막지 못한다. explicit `.js` specifier 규칙과 regression test를 함께 두는 편이 재발 방지에 유리하다.
- Impact: `api/_lib/_placeEntryService.ts`는 explicit `.js` import를 사용하고, `api/place-entry.ts`는 unexpected error를 JSON 500으로 감싼다. `src/server/apiImportBoundary.test.ts`는 `api/**`의 상대 import에 `.js` 확장자를 강제한다.
- Revisit trigger: Vercel 함수 번들링 계약이 바뀌거나 API helper import 규칙을 더 상위 shared abstraction으로 통합하게 되면 현재 regression guard를 조정할 수 있다.
- Related docs:
  - docs/05-sprints/sprint-17/planning.md
  - docs/05-sprints/sprint-17/qa.md
  - docs/06-history/decisions.md
- Related commit: TBD

## 2026-03-15 Sprint 17 - Reapply the redesigned auth failure screen as the live UI contract
- Context: auth failure 화면은 `d2b4ef0`에서 brand-first, 세로 CTA, compact body 중심의 리디자인이 한 번 적용됐다가 `741c534`에서 revert되었다. 이후 사용자 피드백과 reference screenshot 기준으로, 되돌려진 리디자인이 실제 원하는 auth failure 화면이라는 점이 다시 확인됐다.
- Options considered:
  - Option A: 현재 main의 구형 failure screen(`NURIMAP LOGIN` + 가로 CTA 2개)을 유지하고 copy만 조정한다.
  - Option B: `d2b4ef0`의 auth failure 리디자인을 기준으로 화면 구조와 CTA를 되살리되, 이후 확정된 40px controls / AuthSurface padding 제거 / cooldown countdown 변경은 유지한다.
- Decision: Option B를 선택한다.
- Rationale: 사용자가 제공한 reference screenshot은 revert 이전 리디자인과 거의 같은 구조를 요구한다. 동시에 이후 반영된 auth shell sizing/padding/cooldown 개선은 별도 가치가 있으므로, 과거 commit 전체를 복원하는 대신 failure screen slice만 선택 재적용하는 편이 현재 요구와 최신 코드 상태를 함께 만족한다.
- Impact: auth failure screen의 title/본문/CTA 구조는 brand-first stacked layout으로 바뀌고, source-of-truth 문서와 sprint-17 문서도 같은 계약으로 갱신한다. `invalidated`는 별도 stale 안내 대신 reference screenshot과 동일한 만료형 문구를 사용한다.
- Revisit trigger: verify failure reason을 `invalidated`와 `expired`로 다시 명확히 구분해야 한다는 사용자 피드백이나 운영 혼란이 생기면, copy는 별도 재검토한다.
- Related docs:
  - docs/03-specs/05-auth-email-login-link.md
  - docs/design/auth-and-name-entry.md
  - docs/01-product/user-flows/auth-and-name-entry.md
  - docs/05-sprints/sprint-17/planning.md
  - docs/05-sprints/sprint-17/review.md
  - docs/05-sprints/sprint-17/qa.md
  - docs/06-history/decisions.md
- Related commit: TBD

## 2026-03-18 Sprint 18 - Replace magic-link auth with email OTP as the canonical login contract
- Context: Nurimap의 current auth contract는 Supabase magic link + app-managed nonce + `/auth/verify` verify entry를 중심으로 잡혀 있었다. Sprint 12와 Sprint 17 hardening으로 broken URL, stale verify query, premature consume 같은 문제를 줄였지만, route/query parsing, legacy verify support, `verify-link`/`consume-link`, nonce lifecycle, 메일 클라이언트/링크 스캐너 영향 같은 link-specific complexity는 계속 남아 있었다. 이번 작업은 혼자 진행하는 사이드 프로젝트 기준으로, dual support를 길게 유지하는 것보다 canonical contract를 단순화하는 편이 더 안전하다는 판단이 필요했다.
- Options considered:
  - Option A: magic link를 유지하고 추가 hardening만 계속한다.
  - Option B: OTP를 feature flag 뒤에 추가하고 magic link와 dual support를 유지한다.
  - Option C: email OTP로 즉시 컷오버하고, 기존 `/auth/verify`는 로그인 성공 경로가 아닌 fallback entry로만 남긴다.
- Decision: Option C를 선택한다.
- Rationale: solo side project에서는 auth mode를 두 개 유지하는 운영 비용과 문서/테스트 복잡도가 크다. magic link는 메일 클라이언트, link scanner, stale verify query, nonce consumption timing 같은 외부 요인에 더 민감하고, current codebase도 이 문제를 완화하기 위해 별도 wrapper/consume 경계를 이미 추가한 상태다. 반면 email OTP는 canonical 성공 경로를 `이메일 입력 -> OTP 요청 -> OTP 입력 -> verify`로 단순화할 수 있고, `/auth/verify`, nonce, `verify-link`/`consume-link`, dual support 같은 legacy surface를 걷어내며 source-of-truth와 runtime contract를 더 직접적으로 맞출 수 있다. 이번 Sprint는 deployed live email 확인을 `User QA Required` handoff로 남겨도 되므로, 구현/문서/테스트 기준의 단일 canonical contract를 우선 고정하는 편이 더 적절하다.
- Impact: Sprint 18 source of truth는 `docs/03-specs/05-auth-email-login-link.md`의 OTP contract, `docs/01-product/user-flows/auth-and-name-entry.md`, `docs/04-design/auth-and-name-entry.md`, `docs/02-architecture/security-and-ops.md`, `docs/02-architecture/system-runtime.md`, `docs/05-sprints/sprint-18/*` 문서 세트가 담당한다. canonical request route는 `POST /api/auth/request-otp`로, 일반 verify는 client-side `verifyOtp({ email, token, type: 'email' })`로 정리한다. server-side resend/cooldown bookkeeping은 `app_metadata.nurimap_auth`에 남기되 nonce/token_hash lifecycle은 canonical state에서 제거한다. 기존 `/auth/verify`와 legacy root verify query는 더 이상 로그인 성공 경로가 아니며, 새 OTP 요청으로 복귀시키는 fallback entry로만 남길 수 있다.
- Revisit trigger: live deployed 환경에서 OTP 메일 전달성/사용성 문제가 반복되거나, Supabase OTP contract 변화로 canonical verify path를 다시 server-mediated flow로 바꿔야 할 근거가 생기면 auth mode와 fallback strategy를 재검토한다.
- Related docs:
  - docs/03-specs/05-auth-email-login-link.md
  - docs/01-product/user-flows/auth-and-name-entry.md
  - docs/04-design/auth-and-name-entry.md
  - docs/02-architecture/security-and-ops.md
  - docs/02-architecture/system-runtime.md
  - docs/05-sprints/sprint-18/planning.md
  - docs/05-sprints/sprint-18/qa.md
  - docs/05-sprints/sprint-18/review.md
  - docs/06-history/decisions.md
- Related commit: TBD
