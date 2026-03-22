# Sprint 15 UI Refresh Plan

## Requirements Summary

- 장소 목록 화면 UI와 장소 상세 정보 화면 UI를 사용자 제공 시안 기준으로 모바일/데스크톱 모두 리프레시한다.
- 첫 실행 단위는 장소 목록 화면 UI다.
- 기존 browse/detail 동작과 상태 모델은 유지하되, 시안과 현재 spec이 충돌하면 시안을 우선한다.

## Acceptance Criteria

- 목록 화면이 새 헤더/추가 버튼/row 구조/타입 아이콘/별점·리뷰·제로페이 메타를 모바일/데스크톱 양쪽에 반영한다.
- 상세 화면이 새 상단 구조와 리뷰 리스트 시각 위계를 모바일/데스크톱 양쪽에 반영하고, 데스크톱은 sidebar 내부 전환 구조를 따른다.
- 모바일 상세 뒤로 가기와 브라우저 뒤로 가기 동작은 기존처럼 지도 맥락을 유지한다.
- 네이버 이동 / 추천 / 내 리뷰 / 리뷰 작성 UI는 이번 1차 범위에서 제외된다.
- registration notice는 제거하고 필요한 성공 안내는 browser alert 기준으로 정리한다.
- 목록은 제로페이 텍스트를 유지하고 상세는 QR SVG 아이콘으로 제로페이를 표시한다.
- 관련 Vitest와 lint 검증이 통과한다.

## Implementation Steps

1. **소스 오브 트루스와 범위를 고정한다.**
   - 대상: `docs/05-sprints/sprint-15/planning.md`, 필요 시 `docs/03-specs/03-list-browse.md`, `docs/03-specs/04-place-detail.md`, `docs/04-design/browse-and-detail.md`, `docs/04-design/review.md`
   - Acceptance:
     - 모바일/데스크톱 모두 Sprint 범위로 문서에 명시된다.
     - 시안에 없는 상세 모듈의 보존/제거 정책이 문서에 명시된다.

2. **공통 아이콘 자산과 rating/star 기준을 정리한다.**
   - 대상: 새 asset 경로, `src/app-shell/NurimapAppShell.tsx`, 필요 시 공통 icon 파일
   - Acceptance:
     - plus / place-type / qr 아이콘 매핑이 고정된다.
     - 기존 star SVG를 resize해 재사용한다.

3. **장소 목록 UI를 먼저 리프레시한다.**
   - 대상: `src/app-shell/NurimapAppShell.tsx`, `src/app-shell/NurimapBrowse.test.tsx`
   - Acceptance:
     - 목록 헤더, 추가 버튼, row UI가 시안 기준으로 정렬된다.
     - 목록 선택, 제로페이 표시 규칙, 로딩/에러/empty 상태 테스트가 유지된다.

4. **장소 상세 UI를 리프레시하고 기존 동작을 보존한다.**
   - 대상: `src/app-shell/NurimapAppShell.tsx`, `src/app-shell/NurimapDetail.test.tsx`
   - Acceptance:
     - 모바일 상세 상단/메타/리뷰 시각 구조가 시안 기준으로 정렬된다.
     - 데스크톱은 floating panel 대신 sidebar 내부 상세 전환 구조로 바뀐다.
     - 뒤로 가기와 상세 진입/복귀 동작은 유지되고, 이번 범위에서 제외한 UI는 제거된다.
     - registration success notice는 제거되고 필요한 성공 안내는 alert로 대체된다.

5. **회귀 검증과 Sprint 문서 sync를 마무리한다.**
   - 대상: `docs/05-sprints/sprint-15/qa.md`, `docs/05-sprints/sprint-15/review.md`
   - Acceptance:
     - lint / 테스트 / 브라우저 QA 결과가 기록된다.
     - 사용자 QA handoff가 필요한 항목이 문서에 남는다.

## Risks And Mitigations

- **시안과 spec 충돌** → 구현 전에 문서 우선순위를 사용자에게 확인한다.
- **모바일 시안만으로 데스크톱 해석이 엇갈릴 수 있음** → 별도 데스크톱 시안 제공 여부를 먼저 확인하고, 없으면 모바일 시각 언어를 동일하게 적용한다.
- **주아체 asset 전달 전까지 폰트 적용 지연 가능** → 우선 fallback 지정 후 font 파일 수령 즉시 self-host 적용한다.

## Verification Steps

- `pnpm test:run -- src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx`
- `pnpm lint`
- 모바일 viewport 브라우저 QA: 목록 → 상세 → 뒤로 가기
- 필요 시 데스크톱 sidebar/detail panel 시각 회귀 확인
