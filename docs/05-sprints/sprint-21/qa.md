# Verification Scope

- Sprint 21 mobile place-add route/page 승격 검증

# Automated Checks Result

- 실행 결과:
  - `pnpm test:run src/App.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/NurimapDetail.test.tsx` → PASS (`4 passed`, `61 passed`)
  - `pnpm vitest run src/App.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/app-shell/NurimapDetail.test.tsx` → PASS (`3 passed`, `56 passed`)
  - `pnpm build` → PASS
  - LSP diagnostics → PASS
    - `src/App.test.tsx`
    - `src/app-shell/NurimapAppShell.tsx`
    - `src/app-shell/PlaceAddPanels.tsx`
    - `src/app-shell/PlaceRegistrationFlow.test.tsx`
    - `src/app-shell/NurimapDetail.test.tsx`
    - `src/app-shell/PlaceLookupFlow.test.tsx`
- 확인 포인트:
  - `/add-place` route 진입 / direct entry / back fallback 테스트 통과
  - mobile `/add-place`가 map overlay가 아니라 standalone page로 렌더링되는 회귀 테스트 통과
  - add-rating non-route invariant 유지
  - mobile shell이 `visualViewport`의 `top + height`를 직접 추적하고 child surface는 safe-area만 소비하도록 contract 정리
  - place submission API contract 변경 없음

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - Sprint 21 planning + `.omx/plans/plan-sprint-21-mobile-place-add-route.md` 기준으로 live SSOT 문서 충돌 점검
  - `docs/02-architecture/system-runtime.md`, `docs/03-specs/08-place-registration.md`, `docs/04-design/place-submission.md`, `docs/04-design/browse-and-detail.md` 동기화
  - architect review로 mobile `/add-place`가 아직 in-shell overlay 성격을 남기는지 구조 검토
  - 구조 검토 결과를 반영해 mobile `place_add_open`을 map shell과 분리된 standalone page로 수정
  - shell-first follow-up으로 keyboard geometry와 safe-area contract를 분리하고 `/add-place` child padding keyboard 의존 제거
- 결과:
  - `/add-place` route contract와 live SSOT 문서 정합성 확보
  - mobile `/add-place`는 map canvas를 함께 유지하지 않는 standalone page로 조정
  - desktop `/add-place` direct entry는 기존 sidebar place-add surface 유지
  - add-rating non-route / place submission API contract unchanged 유지
  - mobile `/add-place`와 add-rating이 shared shell contract 기준으로 같은 keyboard viewport model을 따르도록 정리

## Browser Automation QA Evidence
- 실행 목적:
  - mobile `/add-place` focus/back/fallback 및 desktop direct entry를 실제 브라우저에서 재현해 Sprint 21 route contract를 검증
- 실행 명령 또는 스크립트:
  - local dev server: `pnpm dev --host 127.0.0.1 --port 4173`
  - Playwright `node --input-type=module` 스크립트 사용
  - QA harness:
    - `auth_test_state=authenticated` query로 local auth override 사용
    - `window.kakao` minimal runtime stub 주입
    - `GET /api/places`를 `200 { status: 'success', places: [] }`로 fulfill
- 확인한 시나리오:
  - mobile in-app entry: `/?auth_test_state=authenticated` → `목록 보기` → `장소 추가` → 후기 input focus
  - mobile browser back restore: `/add-place`에서 browser back → `/` + mobile list context 복원
  - mobile direct entry / refresh / fallback: `/add-place?auth_test_state=authenticated` 진입 후 reload, browser back → `/`
  - desktop direct entry: `/add-place?auth_test_state=authenticated` → sidebar place-add surface 렌더링
- 판정:
  - PASS
  - mobile focus screenshot에서 place-add page 배경이 white surface로 유지되고 gray region 노출이 보이지 않음
  - mobile `/add-place` open 상태에서 `map-canvas`가 0건으로 확인되어 overlay 아래 map 의존성이 제거됨
  - mobile in-app back 후 `/` + list tab active 복원 확인
  - direct entry reload 후 fallback `/` 확인
  - desktop direct entry sidebar 렌더링 확인
- 스크린샷 경로:
  - `artifacts/qa/sprint-21/mobile-add-place-focus.png`
  - `artifacts/qa/sprint-21/mobile-add-place-back-restored.png`
  - `artifacts/qa/sprint-21/mobile-add-place-direct-entry-refresh.png`
  - `artifacts/qa/sprint-21/mobile-add-place-fallback-home.png`
  - `artifacts/qa/sprint-21/desktop-add-place-direct-entry.png`

## User QA Required
- 사용자 확인 항목:
  - mobile `/add-place` 후기 input focus 시 회색 영역 제거
  - mobile add-rating 후기 input focus 시 회색 영역 제거
  - mobile `/add-place` 기기 뒤로가기 context 복원
  - `/add-place` direct entry / refresh 후 back fallback
- 기대 결과:
  - mobile place-add / add-rating keyboard UX가 안정적으로 동작한다.
- 상태:
  - AI Agent automated/browser QA 완료
  - 사용자 실기기 QA 대기
  - handoff 메모: local browser QA는 auth override + Kakao/runtime stub 기반으로 수행했으므로, 최종 sign-off는 실제 mobile device/browser에서 `/add-place`와 add-rating 둘 다 한 번 더 확인 필요

# Issues Found
- 없음
- 참고: local browser QA는 dev bootstrap blocker(auth/session + Kakao runtime 부재)를 피하기 위해 stub harness를 사용했다. 제품 계약 검증용 evidence로 기록하되, 실기기 user QA는 별도 유지한다.

# QA Verdict
- PASS with user-device handoff pending

# Follow-ups
- 사용자가 실제 mobile device/browser에서 keyboard open 상태와 device back behavior를 최종 확인하면 Sprint 21 QA handoff를 닫을 수 있다.
- place submission runtime contract의 `place-lookups -> place-submissions` 2단계 정합성은 별도 follow-up으로 추적한다. 현재 Sprint 21 route/page contract의 blocker는 아니다.
