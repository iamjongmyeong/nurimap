# Test Spec: Sprint 16 Place Detail UX/UI Refresh

## Automated Tests
- `src/app-shell/NurimapDetail.test.tsx`
  - mobile detail fixed header render
  - added-by row render from `added_by_name`
  - info row ordering / content presence
  - review variant with content
  - review variant without content
  - review/평가 최신순 정렬 검증
  - no-review 시 empty-state 카피/placeholder 없이 섹션 본문이 비워지는지 검증
  - legacy modules remain hidden
  - mobile back / browser back behavior regression
  - loading / error state regression
- 필요 시 `src/App.test.tsx`
  - app-level regression only when selector or surface composition changes

## AI Agent Interactive QA
- screenshot/Figma와 실제 hierarchy 비교
- flat layout / no chip / no card / no CTA 확인
- grey meta icon + red star accent 확인
- rating-only review가 본문 없이 플랫 리스트로 보이는지 확인
- 최신 리뷰가 리스트 상단에 보이는지 확인

## Browser Automation QA
- mobile 390px
  - detail open
  - fixed header 확인
  - back button
  - browser back
  - review variants
- desktop 1280px
  - sidebar 내부 detail 전환
  - back affordance 복귀
  - mobile과 같은 detail UI가 sidebar 안에서 유지되는지 확인

## User QA Required
- 없음 (2026-03-15 사용자 결정 반영 완료)

## Evidence Paths
- `artifacts/qa/sprint-16/`
