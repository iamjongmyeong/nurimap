# Sprint Goal

- Sprint 16에서 **장소 상세 정보 화면 UX/UI**와 **장소 목록 UI 일부**를 사용자 제공 reference 기준으로 재정렬한다.
- 모바일 detail은 reference fidelity를 우선하고, 데스크톱 detail도 **우선 같은 detail UI를 사용**하되 현재 지도 노출 + 왼쪽 sidebar에서 장소 목록/장소 추가를 진행하는 app-shell surface는 그대로 유지하는 방향으로 범위를 고정한다.

# In Scope

- `src/app-shell/NurimapAppShell.tsx`의 모바일 장소 상세 화면 UI 리프레시 계획 수립
  - header / 정보 블록 / 리뷰 섹션의 기본 구조 정의
  - flat info/review hierarchy 반영
  - 세부 spacing / size / icon / color token은 reference와 `.omx/plans/` 문서를 따른다.
- 상세 정보 row를 아래 순서로 정의
  - 장소명
  - 주소
  - `added_by_name` 기반 `{{user-name}}님이 추가한 장소`
  - 장소 유형
  - 제로페이 가능 여부
  - 평점 / 리뷰 수
- 리뷰 item variant를 아래 2종으로 정의
  - 본문이 있는 리뷰
  - 평점만 있는 리뷰
- 리뷰/평가 리스트는 가장 최근 항목이 위로 오도록 최신순 정렬을 기본 정책으로 정의
- rating-only variant는 새 review schema를 도입하지 않고, 기존 review data shape 안에서 `content`가 비어 있는 경우 본문 row를 숨기는 방식으로 계획한다.
- 메타 icon은 회색 단색, 별점만 빨간 accent를 사용하는 detail visual language 정의
- 상세 메타 icon asset은 `public/assets/icons/icon-place-address-muted.svg`, `public/assets/icons/icon-place-added-by-muted.svg`, `public/assets/icons/icon-payment-zeropay-muted.svg`를 사용한다.
- 목록 icon asset은 `public/assets/icons/icon-payment-zeropay-accent.svg`, `public/assets/icons/icon-place-type-restaurant-muted.svg`, `public/assets/icons/icon-place-type-cafe-muted.svg`를 사용한다.
- 목록 제로페이 QR icon은 desktop hover `1초` 이후 `제로페이 가능` tooltip을 표시한다.
- 상세 back icon asset은 `public/assets/icons/icon-navigation-back-24.svg`를 사용한다.
- 상세 back affordance는 `24px x 24px` 기준과 pointer cursor를 사용한다.
- 데스크톱 상세는 기존 **sidebar 내부 전환**과 back affordance, 지도 + 왼쪽 sidebar browse/add surface를 유지하면서 모바일과 **같은 detail UI를 우선 적용**하는 범위 정의
- 장소 목록 row는 이름 row + 하단 메타 라인의 2단 구조로 정렬하고, 제로페이 가능 여부는 이름 row 우측 QR icon으로 표현한다.
- 목록 row 하단 메타 라인에는 평균 별점, 리뷰 수, 회색 place type icon + label을 사용한다.
- 장소 추가 화면의 header는 상세 header와 같은 visual language로 정렬한다.
- 관련 source-of-truth 문서 업데이트 계획 수립
  - `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`
  - `docs/03-specs/01-app-shell-and-layout.md`의 legacy floating detail wording 후속 정리 여부 확인
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/04-design/browse-and-detail.md`
- 관련 테스트/QA 계획 수립
  - `src/app-shell/NurimapDetail.test.tsx`
  - 필요 시 `src/App.test.tsx`
  - Browser QA / User QA handoff 기준 정리
- Sprint 16 문서 세트 생성
  - `docs/05-sprints/sprint-16/planning.md`
  - `docs/05-sprints/sprint-16/qa.md`
  - `docs/05-sprints/sprint-16/review.md`

# Out Of Scope

- place data model / API contract / persistence 변경
- 새로운 navigation state 또는 routing 구조 도입
- 추천 / 내 리뷰 / 리뷰 작성 / 네이버 이동 UI 재도입
- 리뷰 작성/추천 도메인 로직 변경
- 지도 + 왼쪽 sidebar(장소 목록 / 장소 추가) app-shell surface 재설계
- 새로운 CTA 추가
- 새로운 제로페이 정책 변경
- review 0건 empty-state용 별도 카피 / 카드 / placeholder 추가

# Selected Specs

- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/foundations.md`
- `docs/03-specs/01-app-shell-and-layout.md` (legacy floating detail wording 참고용)
- `docs/00-governance/agent-workflow.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `docs/06-history/decisions.md`

# Constraints

- 사용자 제공 **모바일 스크린샷 + Figma 추출 코드**를 detail UI의 primary visual source of truth로 사용한다.
- screenshot/Figma 기준이 있는 UI 작업이므로 창의적 재해석보다 fidelity를 우선한다.
- 모바일 detail은 header / place info block / review section의 3영역 구조를 시각 기준으로 고정한다.
- place info block 하단 spacing은 `24px`를 유지한다.
- 세부 spacing, 크기, 아이콘 처리, 텍스트 스타일 같은 UI 디테일은 사용자 reference와 `.omx/plans/prd-sprint-16-place-detail-uxui.md`를 따른다.
- 장소 추가자 이름 필드는 `added_by_name`으로 문서/코드/테스트 전반에 통일한다.
- 현재 `src/app-shell/types.ts`의 review shape(`ReviewSummary.content: string`)를 유지하며, rating-only variant를 위해 새 optional field를 추가하지 않는다.
- desktop detail도 우선 mobile reference와 **같은 detail UI**를 사용하되, 현재 지도 노출 + 왼쪽 sidebar browse/add surface와 back affordance는 유지한다.
- 기존 핵심 동작은 유지한다.
  - desktop sidebar 내부 상세 전환
  - mobile full-screen detail
  - mobile back button / browser back -> map 복귀
  - selected place / map context 유지
  - `place_detail_load` loading / error state 유지
- detail에서 아래 legacy 모듈은 계속 노출하지 않는다.
  - 네이버 지도 이동
  - 추천
  - 내 리뷰
  - 리뷰 작성
- `docs/03-specs/01-app-shell-and-layout.md`의 legacy floating detail wording은 Sprint 16 selected spec으로 채택하지 않는다.
- 다만 구현 착수 전 또는 구현 중 문서 sync 시점에는 `docs/03-specs/01-app-shell-and-layout.md`의 floating detail 표현을 legacy note 또는 후속 정리 대상으로 함께 검토한다.
- review 0건이면 empty-state용 별도 카피/placeholder를 노출하지 않고, `평가 및 리뷰` 섹션 본문은 비워 둔다.
- review 본문이 빈 문자열인 경우 본문 text block을 숨기는 쪽을 기본 가정으로 두고, review 저장/검증 규칙 변경은 이번 Sprint 범위에서 제외한다.
- 리뷰/평가 리스트는 `created_at` 기준 최신순으로 노출하는 것을 기본 정책으로 계획한다.
- 장소 추가자 이름 필드는 문서/코드/테스트 전반에서 `added_by_name`으로 일치시킨다.

# Agent Instructions

- 핵심 합의 방향은 아래와 같다.
  - mobile screenshot/Figma를 canonical reference로 사용한다.
  - desktop detail도 우선 같은 detail UI를 사용하되, 지도 + 왼쪽 sidebar browse/add surface와 back affordance는 유지한다.
  - `added_by_name` naming과 리뷰/평가 최신순 정책을 문서/코드/테스트에서 일관되게 맞춘다.
- `src/app-shell/NurimapAppShell.tsx`의 current detail structure와 `src/app-shell/NurimapDetail.test.tsx`의 행동 회귀를 함께 본다.
- 문서 변경 시 우선순위는 `planning.md` > `docs/03-specs/04-place-detail.md` > `docs/01-product/user-flows/browse-and-detail.md` > `docs/04-design/browse-and-detail.md`로 해석한다.
- 시각 구조 변경이 비자명하면 `docs/06-history/decisions.md`에 남기고, 작은 scope 반영은 source-of-truth 문서에 흡수한다.
- 테스트는 기존 핵심 `data-testid`와 행동 contract를 가능한 유지하면서 새 구조 검증용 selector만 최소 추가하는 방향으로 계획한다.
- desktop detail UI는 mobile reference를 우선 동일하게 쓰되, 지도 + 왼쪽 sidebar browse/add surface 자체는 바꾸지 않는다.

# Done Criteria

- Sprint 16 문서가 place detail UX/UI refresh의 source of truth로 바로 사용 가능하다.
- 문서는 범위/원칙 중심으로 유지되고, 세부 UI 수치/토큰은 `.omx/plans/`와 reference로 분리된다.
- 모바일 detail target structure가 아래 수준으로 명시된다.
  - header / place info block / review section
  - info row 순서
  - review variant 2종
- desktop detail은 기존 sidebar/back affordance와 지도 + 왼쪽 sidebar browse/add surface를 유지하면서 mobile reference와 같은 detail UI를 우선 사용하는 방향으로 범위가 고정된다.
- `added_by_name` 통일, legacy module 비노출, loading/error/back/history 보존 조건이 명시된다.
- rating-only review variant가 existing review shape 안에서 처리된다는 guardrail이 명시된다.
- 리뷰/평가 최신순 정렬 정책이 planning 기준에 명시된다.
- source-of-truth docs update 대상과 test/QA evidence 계획이 planning 문서에 적힌다.
- 사용자 결정 2건(desktop detail 동일 UI 적용, review 0건 시 비워두기)이 planning에 반영된다.

# QA Plan

## Automated Checks

- 대상 시나리오:
  - mobile detail fixed header / info block / review block 구조 검증
  - 추가자 row(`added_by_name`) 노출 여부 검증
  - review 본문 있는 variant / rating-only variant 검증
  - review/평가 최신순 정렬 검증
  - browse row 상단 QR icon / 하단 type meta 구조 검증
  - browse row 제로페이 QR icon hover `1초` tooltip 검증
  - review 0건일 때 empty-state 카피/placeholder 없이 섹션 본문이 비워지는지 검증
  - 기존 back/history/loading/error/legacy module 비노출 회귀 검증
  - 장소 추가 header가 상세 header와 같은 back affordance 구조를 유지하는지 회귀 검증
- 실행 주체:
  - AI Agent
- 종료 기준:
  - `pnpm exec vitest run src/app-shell/NurimapDetail.test.tsx`
  - 필요 시 관련 테스트 추가 후 `pnpm lint`

## AI Agent Interactive QA

- 대상 시나리오:
  - 모바일 390px 기준으로 screenshot/Figma 의도와 실제 hierarchy 비교
  - grey meta icon + red star accent만 남는지 시각 구조 확인
  - desktop sidebar detail이 mobile reference와 같은 detail UI를 사용하되 지도 + 왼쪽 sidebar surface는 유지하는지 확인
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 구현 diff와 실제 렌더 결과를 비교해 hierarchy / spacing intent / preserved behavior를 설명 가능

## Browser Automation QA

- 대상 시나리오:
  - 모바일 viewport에서 detail 진입, back 버튼, browser back, review variant 확인
  - desktop viewport에서 sidebar 내부 detail 전환과 back 복귀 확인
- 실행 주체:
  - AI Agent
- 종료 기준:
  - Playwright 또는 `agent-browser`로 주요 흐름 캡처
- 예상 증빙 경로:
  - `artifacts/qa/sprint-16/`

## User QA Required

- 사용자 확인 항목:
  - 없음 (2026-03-15 사용자 결정 반영 완료)
- 기대 결과:
  - 구현 범위가 고정된 상태로 유지된다.
- handoff 조건:
  - 구현 시작 지시가 오면 planning 기준으로 착수 가능

# Active Changes

## CHG-01 Mobile place detail flat refresh planning

- Why:
  - 사용자 제공 모바일 detail reference가 Sprint 16의 직접 source of truth다.
- Outcome:
  - fixed header, info block, review block, review variant 구조와 최신순 정렬 정책을 planning 기준으로 고정한다.
- Touched Docs:
  - `docs/05-sprints/sprint-16/planning.md`
  - `docs/03-specs/03-list-browse.md`
- `docs/03-specs/04-place-detail.md`
  - `docs/04-design/browse-and-detail.md`
  - `docs/01-product/user-flows/browse-and-detail.md`
- Verify:
  - `src/app-shell/NurimapDetail.test.tsx`
  - mobile viewport browser QA
- Status: closed

## CHG-02 Desktop detail content-hierarchy alignment planning

- Why:
  - desktop detail도 mobile reference와 동떨어진 시각 언어를 쓰지 않도록 bounded alignment가 필요하다.
- Outcome:
  - desktop detail도 existing sidebar/back affordance와 지도 + 왼쪽 sidebar browse/add surface를 유지한 채 mobile reference와 같은 detail UI를 우선 사용한다.
- Touched Docs:
  - `docs/05-sprints/sprint-16/planning.md`
  - `docs/04-design/browse-and-detail.md`
  - 필요 시 `docs/03-specs/04-place-detail.md`
- Verify:
  - `src/app-shell/NurimapDetail.test.tsx`
  - desktop viewport browser QA
- Status: closed
