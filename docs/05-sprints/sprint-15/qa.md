# Verification Scope

- Sprint 15 장소 목록 / 상세 UI refresh
- 장소 등록 연계 회귀 (browse/detail refresh 이후 direct-entry registration DOM contract 확인)
- Sprint 15 추가 요청: desktop browse 상단 compact top bar 보정
- Sprint 15 추가 요청: place-list browse card row UI 보정
- Sprint 15 추가 요청: browse title 제거, logout bottom text action 이동, list divider 적용
- Sprint 15 추가 요청: direct-entry submit button spinner-only loading state 적용
- Sprint 15 추가 요청: browse header/footer full-width region 보정, add button shadow 제거, rating icon 교체
- Sprint 15 추가 요청: browse/detail UI asset을 `public/assets/`로 재배치하고 semantic naming rule 적용
- Sprint 15 추가 요청: browse header/footer를 sidebar top/bottom edge에 바로 붙도록 보정
- Sprint 15 추가 요청: add button height 36px, footer vertical-center, list hover/divider spacing 보정
- Sprint 15 추가 요청: footer 로그아웃 hover color + pointer cursor + browser confirm 추가

# Automated Checks Result

- PASS — `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx`
  - 결과: Test Files 3 passed, Tests 37 passed
  - 확인 포인트: desktop sidebar 내부 상세 전환, 모바일 목록→상세, legacy detail 모듈 제거, 등록 성공 alert, 등록 후 상세/목록 갱신
- PASS — `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/App.test.tsx src/auth/AuthFlow.test.tsx`
  - 결과: Test Files 3 passed, Tests 46 passed
  - 확인 포인트: desktop browse top bar 구조, compact `추가` CTA의 접근성 이름 유지, height 36px, top/bottom edge 정렬, footer vertical center, footer 로그아웃 hover/pointer/confirm, desktop browse surface 내 `로그아웃` 접근성 회귀
- PASS — `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/App.test.tsx`
  - 결과: Test Files 2 passed, Tests 20 passed
  - 확인 포인트: place-list card의 flat white row 구조, road address 비노출, 별점/리뷰/optional `제로페이` 메타 라인 유지, browse title 제거, bottom `로그아웃` 유지
- PASS — `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/App.test.tsx src/auth/AuthFlow.test.tsx`
  - 결과: Test Files 3 passed, Tests 46 passed
  - 확인 포인트: header/footer full-width region 유지, `추가` button shadow 제거 + pointer cursor, footer `로그아웃` 접근성 회귀, asset 경로가 `/assets/` naming rule로 교체됨
- PASS — `pnpm exec vitest run src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx`
  - 결과: direct-entry submit button loading 중 visible `등록 중` 문구 제거, spinner-only 유지, disabled state 회귀 검증 통과
- PASS — `pnpm lint`
  - 결과: `eslint .` 통과
- PASS — `pnpm exec tsc --noEmit`
  - 결과: 통과
- PASS — `pnpm build`
  - 결과: `tsc -b && vite build` 통과

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - browse/detail/register 렌더링 DOM을 Vitest로 점검
  - 데스크톱 상세가 `desktop-sidebar` 내부 콘텐츠 교체 방식으로 열리고 map canvas가 계속 유지되는지 확인
  - 상세에서 제거 대상 모듈(`detail-review-compose`, `detail-my-review`, `detail-recommendation-control`, `detail-naver-link`)이 노출되지 않는지 확인
  - desktop browse 상단이 brand-left / compact-add-right top bar 구조로 바뀌고, top edge에 바로 붙는지 확인
  - `로그아웃`이 최하단 footer text action으로 유지되고 bottom edge에 바로 붙는지 확인
  - `추가` button height 36px, footer vertical-center 정렬이 유지되는지 확인
  - footer `로그아웃`이 hover 시 red + pointer로 바뀌고 click 시 browser confirm을 먼저 띄우는지 확인
  - place-list card가 이름 + blue type icon 상단 row, 별점/리뷰/optional `제로페이` 하단 row 구조로 정리되고 road address가 빠졌는지 확인
  - desktop browse에서 `오늘 둘러볼 장소` title row가 제거되고, `로그아웃`이 목록 최하단 text action으로 남아 있는지 확인
  - direct-entry submit button이 loading 동안 text 없이 spinner만 노출하는지 확인
  - browse header/footer가 full-width region처럼 배치되고, add button shadow 제거 및 `/assets/` 자산 경로 정리가 반영됐는지 확인
  - browse card hover background가 제거되고 divider line spacing이 적용됐는지 확인
- 결과:
  - PASS — targeted Vitest DOM assertions 기준으로 위 항목 확인
  - PASS — registration 성공 후 browser alert 계약과 detail/list 전환 계약이 테스트에 반영됨
  - PASS — `desktop-browse-topbar`와 `desktop-add-button` DOM contract가 추가 feedback 방향과 일치함
  - PASS — browse card가 flat white row 구조로 바뀌고 `place-list-item-*` / `place-list-zeropay-*` contract가 유지됨
  - PASS — browse title row가 제거되고 `로그아웃` button은 desktop browse surface에서 계속 접근 가능함
  - PASS — direct-entry submit button은 submitting 동안 visible label 없이 spinner만 유지함
  - PASS — top/bottom region이 header/footer처럼 동작하고 browse/detail asset 경로는 `public/assets/branding`, `public/assets/icons` naming rule로 정리됨
  - PASS — desktop browse header/footer는 sidebar padding에 밀리지 않고 top/bottom edge에 바로 붙도록 정렬됨
  - PASS — `추가` button은 36px height를 유지하고, browse card는 hover background 없이 cursor만 유지하며 divider spacing이 반영됨
  - PASS — footer `로그아웃`은 hover red + pointer state와 confirm gate를 통해 취소/진행을 제어함

## Browser Automation QA Evidence
- 실행 목적:
  - registration 성공 후 browser alert 및 detail open 최소 성공 경로 확인
- 실행 명령 또는 스크립트:
  - Playwright node script (desktop local verification, worker lane 실행)
- 확인한 시나리오:
  - 데스크톱에서 `장소 추가` → 이름/주소/리뷰 입력 → 등록 → success alert 노출 → 새 상세 열림
- 판정:
  - pass
- 스크린샷 경로:
  - 없음 (로그 기반 확인)

## User QA Required
- 사용자 확인 항목:
  - 없음
- 기대 결과:
  - 없음
- 상태:
  - not required

# Issues Found

- targeted suite 실행 시 `pnpm test:run -- <files>` 대신 `pnpm exec vitest run <files>`로 명시 실행해야 원하는 파일 집합만 검증됨.
- 브라우저 자동화는 성공 경로 확인까지 수행했지만 스크린샷 증빙은 남기지 못했다.

# QA Verdict

- pass with risk — 핵심 자동화 검증과 build는 통과했지만 브라우저 자동화 스크린샷 증빙이 없다.

# Follow-ups

- 필요하면 `artifacts/qa/sprint-15/` 경로로 스크린샷을 남기는 후속 browser QA를 추가 수행한다.
