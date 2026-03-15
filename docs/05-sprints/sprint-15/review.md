# Sprint Summary

- Sprint 15 browse/detail UI refresh는 데스크톱 sidebar 내부 상세 전환, 1차 상세 범위 축소, registration success alert 전환까지 반영됐고, 추가 사용자 피드백으로 desktop browse 상단/하단 region, edge alignment, add button sizing, footer logout interaction, place-list card hover/divider spacing, direct-entry submit loading UI, asset 관리 규칙까지 Figma 방향으로 계속 보정했다.

# Completed

- `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx` 통과 (3 files, 37 tests)
- `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/App.test.tsx src/auth/AuthFlow.test.tsx` 통과 (3 files, 46 tests)
- `pnpm exec vitest run src/app-shell/NurimapBrowse.test.tsx src/App.test.tsx` 통과 (2 files, 20 tests)
- `pnpm exec vitest run src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx` 통과
- browse/detail assertions 기준으로 데스크톱 상세가 floating overlay가 아니라 sidebar 내부 콘텐츠 교체 방식으로 유지되고, 제거 대상 legacy detail 모듈이 재도입되지 않았음을 확인
- desktop browse 상단을 `누리맵` 브랜드 좌측 + compact `추가` CTA 우측 top bar로 조정하고, `로그아웃`을 최하단 footer text action으로 유지했다
- desktop browse header/footer를 sidebar top/bottom edge에 바로 붙도록 정렬했다
- `추가` button은 36px height로 고정하고, footer `로그아웃`은 36px container 안에서 vertical center 정렬로 맞췄다
- footer `로그아웃`은 hover 시 red + pointer로 바뀌고, 클릭 시 browser confirm을 거친 뒤 실제 sign-out 하도록 정리했다
- place-list browse card를 flat white row로 정리하고, 이름 + blue type icon 상단 row / 별점·리뷰·optional `제로페이` 하단 row 구조로 보정했다
- place-list hover background를 제거하고 cursor만 유지했으며, divider line spacing을 4px 기준으로 보정했다
- `오늘 둘러볼 장소` title row를 제거하고, `로그아웃`을 목록 최하단 text action으로 이동했으며 place 사이 divider line을 추가했다
- direct-entry 등록 버튼은 submitting 동안 visible `등록 중` 문구를 제거하고 spinner만 보이도록 정리했다
- browse top/bottom 영역을 header/footer처럼 full-width region으로 보정했고, `추가` button shadow 제거와 함께 browse/detail asset을 `public/assets/branding`, `public/assets/icons` naming rule로 정리했다
- `pnpm lint` 통과
- `pnpm exec tsc --noEmit` 통과
- `pnpm build` 통과
- registration 성공 후 browser alert 및 detail open 최소 성공 경로를 브라우저 자동화로 확인
- `docs/05-sprints/sprint-15/qa.md`에 검증 근거와 잔여 리스크 반영

# Not Completed

- 브라우저 자동화 스크린샷 증빙 수집

# Carry-over

- 필요 시 `artifacts/qa/sprint-15/` 스크린샷 증빙 보강

# Risks

- 실브라우저 성공 경로는 확인했지만 스크린샷이 없어 시각 증빙 강도는 낮다.

# Retrospective

- targeted Vitest는 `pnpm test:run -- <files>`보다 `pnpm exec vitest run <files>`로 명시 실행하는 편이 검증 범위를 더 정확히 고정했다.
- React 19 + 현재 tsconfig 조합에서는 `JSX.Element`보다 `ReactNode` 타입이 안전한 선택이었다.
