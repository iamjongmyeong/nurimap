# Sprint Goal

- Sprint 15에서 **장소 목록 화면 UI**와 **장소 상세 정보 화면 UI**를 사용자 제공 Figma 시안 기준으로 재정렬한다.
- 이번 Sprint의 첫 실행 단위는 **장소 목록 화면 UI 개선**이며, 같은 Sprint 안에서 장소 상세 화면까지 확장 가능한 공통 아이콘/스타일 기반을 마련한다.
- 기존 browse/detail 흐름과 상태 모델은 최대한 유지하되, **시안과 기존 spec이 충돌하면 Sprint 15에서는 Figma 시안을 우선 source of truth로 해석**한다.

# In Scope

- `src/app-shell/NurimapAppShell.tsx`의 목록/상세 렌더링 구조와 모바일/데스크톱 UI 리프레시
- 장소 목록 헤더, 추가 버튼, 목록 item 메타데이터, 장소 타입 아이콘 적용
- 장소 목록 row card를 flat white 구조로 정리하고, 이름/타입 아이콘 상단 row + 별점/리뷰/제로페이 하단 메타 row로 보정
- 데스크톱 목록 상단 top bar를 사용자 피드백 기준으로 minimal brand/add row로 보정하고, browse title은 제거하며 `로그아웃`은 목록 최하단 text action으로 이동
- browse header/footer를 각각 header/footer처럼 동작하는 full-width region으로 보정하고, rating star icon을 사용자 제공 asset으로 교체
- desktop browse header/footer는 sidebar 내부 top/bottom edge에 바로 붙도록 보정
- add button height `36px`, footer vertical-center 정렬, list hover/divider spacing까지 추가 보정
- footer `로그아웃` action hover color, pointer cursor, browser confirm interaction 추가
- browse/detail UI asset을 `public/assets/` 아래로 모으고, `branding/`, `icons/` 하위 폴더 + lowercase kebab-case semantic naming 규칙으로 정리
- 직접 장소 등록 submit button의 loading state는 spinner-only 표현으로 보정
- 장소 상세 상단 메타 정보, 리뷰 리스트 시각 구조, 뒤로 가기 헤더 UI 리프레시
- 사용자 제공 SVG 자산을 repo 안으로 편입하고 재사용 가능한 icon 사용 기준 정리
- 첨부된 로고 이미지를 app asset으로 정리하고 상단 브랜드 영역에 반영
- 주아체 폰트 적용 방식 확정 및 font asset 편입
- `src/app-shell/NurimapBrowse.test.tsx`, `src/app-shell/NurimapDetail.test.tsx`의 UI/행동 검증 갱신
- 시안 기준 재설계에 맞춰 필요한 source-of-truth 문서 갱신
- Sprint 15 문서(`planning.md`, `qa.md`, `review.md`) 초기화 및 sync

# Out Of Scope

- 장소 등록 flow의 기능 변경
- 리뷰 작성/추천/네이버 이동의 도메인 로직 변경
- 지도 marker 디자인 전면 교체
- place data model / API contract / backend persistence 변경
- 별도 신규 화면 추가 또는 navigation state 추가
- 추천 / 내 리뷰 / 리뷰 작성 UI 재도입
- 네이버 지도 이동 CTA 유지
- registration notice 유지

# Selected Specs

- `docs/03-specs/01-app-shell-and-layout.md`
- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/foundations.md`
- `docs/04-design/review.md`
- `docs/02-architecture/system-context.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`

# Constraints

- 사용자 제공 시안은 `390px x 800px` 모바일 기준 레퍼런스다. 데스크톱도 이번 Sprint 범위에 포함하되, 별도 데스크톱 시안이 없으면 모바일 시안의 시각 언어를 데스크톱 sidebar에 재해석 적용한다.
- Sprint 15에서 목록/상세 UI는 기존 spec보다 **사용자 제공 Figma 시안 우선**으로 재설계한다.
- 데스크톱 장소 상세는 별도 floating panel이 아니라, **장소 등록 화면처럼 기존 목록 영역 내부 콘텐츠를 상세 화면으로 교체하는 방식**으로 전환한다.
- 현재 상태 모델(`map_browse`, `mobile_place_list_open`, `place_add_open`, `place_detail_open`)과 목록/상세 전환 동작은 유지한다.
- browse/detail UI asset tracked root는 `public/assets/`로 통일하고, 이미지/아이콘은 각각 `branding/`, `icons/` 아래에서 lowercase kebab-case semantic naming으로 관리한다.
- 새 SVG 입력 자산은 아래 파일을 기준으로 repo 안에 편입한다.
  - `/Users/jongmyeong/Downloads/nurimap/cafe-blue.svg`
  - `/Users/jongmyeong/Downloads/nurimap/icon-cafe-gray.svg`
  - `/Users/jongmyeong/Downloads/nurimap/icon-plus.svg`
  - `/Users/jongmyeong/Downloads/nurimap/icon-qr-gray.svg`
  - `/Users/jongmyeong/Downloads/nurimap/icon-restaurant-gray.svg`
  - `/Users/jongmyeong/Downloads/nurimap/icon-16px-star-red.svg`
  - `/Users/jongmyeong/Downloads/nurimap/restaurant-blue.svg`
- 현재 spec에 존재하지만 시안에 직접 보이지 않는 정보/모듈(예: 네이버 이동, 추천, 내 리뷰 상태, 리뷰 작성 UI, 로딩/에러 상태)은 사용자 확인 전까지 **보존 우선**으로 해석한다.
- 목록의 place type icon 매핑은 `icon-place-type-restaurant-accent.svg`, `icon-place-type-cafe-accent.svg` 중심으로 적용하고, 상세 메타 영역에는 muted icon 세트를 사용한다.
- `icon-payment-zeropay-muted.svg`는 **상세 화면의 제로페이 표시**를 대체하는 아이콘으로 사용한다.
- 네이버 지도 이동 / 추천 / 내 리뷰 / 리뷰 작성 UI는 이번 1차 개발 범위에서 제외하고, 후속 시안이 오면 다음 변경으로 반영한다.
- registration notice는 제거하고, 등록/병합 결과 안내는 필요한 경우 browser alert로 통일한다.
- loading / error 상태는 이번 Sprint에서 새 시안 없이 기본형으로 유지한다.
- 목록 화면은 Figma 기준으로 `제로페이` 텍스트를 유지하고, 상세 화면은 SVG 아이콘으로 제로페이를 표시한다.
- 목록 UI를 먼저 구현하고, 상세 UI는 목록에서 정리한 icon/token 기준을 재사용한다.

# Agent Instructions

- 구현 전에 시안 우선 기준으로 어떤 문서를 갱신해야 하는지 먼저 확정한다.
- 프론트엔드 구현 단계에서는 `frontend-design`, `vercel-react-best-practices` 기준을 적용한다.
- UI refactor여도 기존 테스트 식별자와 핵심 상호작용은 가능한 한 유지하고, 불가피하게 바꾸면 테스트와 문서를 함께 갱신한다.
- 새 아이콘은 흩어진 inline SVG로 복제하지 말고, 공통 경로 또는 공통 icon wrapper로 정리한다.
- 목록/상세의 loading, empty, error 상태는 spec 요구사항을 유지하되, 시각 가이드는 사용자 확인 후 보정한다.
- 사용자 확인이 필요한 항목은 `.omx/plans/open-questions.md`와 본 문서의 User QA Required에 남긴다.

# Done Criteria

- 장소 목록 화면이 사용자 제공 시안의 정보 위계(브랜드 헤더, 추가 버튼, row 분리, 별점/리뷰/제로페이 표기, 장소 타입 아이콘)를 반영한다.
- 데스크톱 sidebar도 같은 시각 언어로 리프레시되고, 상세 진입 시 목록 영역 내부가 상세 콘텐츠로 전환된다.
- 장소 목록 item 선택, 모바일 목록→상세 이동, 제로페이 표시 규칙, 로딩/에러/empty 상태가 기존 spec과 충돌 없이 동작한다.
- 장소 상세 화면이 모바일 전체 화면 기준 시안의 상단 구조(뒤로 가기, 제목, 메타 정보, 리뷰 섹션)를 반영한다.
- 모바일 상세 뒤로 가기와 브라우저 기본 뒤로 가기 시 지도 맥락 유지 동작이 깨지지 않는다.
- 이번 1차 범위에서 제외된 네이버 지도 이동 / 추천 / 내 리뷰 / 리뷰 작성 UI는 상세에서 제거되고, 그 결정이 문서와 구현에 일치한다.
- registration notice 제거와 browser alert 안내 기준이 구현과 문서에 반영된다.
- 업로드된 SVG 자산과 resized star SVG가 실제 UI에 적용된다.
- 관련 테스트와 Sprint 문서가 최종 구현 기준과 일치한다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - 목록 item UI 구조 및 제로페이/아이콘 표시 규칙
  - 모바일 목록→상세 전환과 상세 뒤로 가기 동작
  - 상세 화면의 기존 review/recommendation gating 유지 여부
  - registration success notice 제거 및 alert 흐름 회귀 검증
  - 등록 버튼 submitting state에서 visible `등록 중` 문구 제거 및 spinner-only 유지
  - lint, vitest 대상 테스트 실행
- 실행 주체:
  - AI Agent
- 종료 기준:
  - `pnpm test:run -- src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx`
  - 필요 시 관련 테스트 추가 후 `pnpm lint` 통과

## AI Agent Interactive QA
- 대상 시나리오:
  - 390px 모바일 기준으로 목록/상세의 시각 구조가 Figma 의도와 일치하는지 확인
  - 시안에 없는 기존 필수 모듈이 보존/재배치 기준대로 반영됐는지 확인
  - icon state(blue/gray/qr/plus/star) 사용 위치가 일관적인지 확인
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 구현 diff와 실제 렌더 결과를 비교해 주요 위계/아이콘 사용/상태 흐름 설명 가능

## Browser Automation QA
- 대상 시나리오:
  - 모바일 viewport에서 목록 화면 진입, 장소 선택, 상세 뒤로 가기, 지도 복귀
  - 데스크톱 sidebar에서 목록→상세 내부 전환 시각 검증
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright 또는 `agent-browser`로 주요 흐름 캡처
- 예상 증빙 경로:
  - `artifacts/qa/sprint-15/`

## User QA Required
- 사용자 확인 항목:
  - 없음 (현재 기준 결정 사항 확정 완료)
- 기대 결과:
  - 구현 중 추가 scope discovery 없이 Sprint 15 범위대로 진행 가능하다.
- handoff 조건:
  - open question 답변 반영 후 구현 착수 가능 상태로 planning 문서 재확정

# Active Changes

## CHG-01 장소 목록 화면 UI refresh
- Why:
  - Sprint 15의 첫 우선순위이며, 사용자 제공 시안이 가장 먼저 반영될 대상이다.
- Outcome:
  - 목록 헤더/추가 버튼/목록 row/타입 아이콘/별점·리뷰·제로페이 메타 UI를 새 시안 기준으로 정렬한다.
  - desktop browse 상단은 wrapper 없는 minimal top bar(누리맵 브랜드 좌측, `추가` CTA 우측)로 맞추고, browse title은 제거하며 `로그아웃`은 목록 최하단 text action으로 유지한다.
  - desktop browse 상단과 하단은 각각 header/footer처럼 full-width region으로 동작하고, `추가` button shadow는 제거한다.
  - desktop browse header는 top edge에, footer text action은 bottom edge에 바로 붙도록 정렬한다.
  - `추가` button height는 `36px`로 유지하고, footer `로그아웃`은 36px height container 안에서 vertical center 정렬을 유지한다.
  - footer `로그아웃`은 hover 시 `#E52E30` + pointer cursor를 보여주고, 클릭 시 browser confirm으로 로그아웃 여부를 먼저 확인한다.
  - browse card는 주소/텍스트 pill 대신 이름 + blue type icon 상단 row, 별점/리뷰/optional `제로페이` 하단 row 중심의 flat white 레이아웃으로 정리하고, 카드 사이는 divider line으로 구분한다.
  - browse card는 hover background를 제거하고 cursor만 유지하며, divider line은 위아래 4px spacing을 가진다.
  - browse card 별점 아이콘은 `public/assets/icons/icon-rating-star-red-16.svg` asset으로 교체한다.
- Touched Docs:
  - `docs/05-sprints/sprint-15/planning.md`
  - `docs/04-design/browse-and-detail.md`
- Verify:
  - `src/app-shell/NurimapBrowse.test.tsx`
  - `src/App.test.tsx`
  - `src/auth/AuthFlow.test.tsx`
  - 모바일/데스크톱 viewport 시각 검증
- Status: active

## CHG-02 장소 상세 정보 화면 UI refresh
- Why:
  - 장소 목록 UI 변경과 같은 시각 언어로 상세 화면까지 연결해야 한다.
- Outcome:
  - 모바일 전체 화면 상세와 데스크톱 sidebar 내부 상세 전환을 같은 시각 언어로 리프레시한다.
- Touched Docs:
  - `docs/05-sprints/sprint-15/planning.md`
  - `docs/03-specs/04-place-detail.md` (필요 시)
  - `docs/04-design/browse-and-detail.md`
  - `docs/04-design/review.md` (필요 시)
- Verify:
  - `src/app-shell/NurimapDetail.test.tsx`
  - 모바일 뒤로 가기 / 기존 상세 행동 회귀 검증
- Status: draft
