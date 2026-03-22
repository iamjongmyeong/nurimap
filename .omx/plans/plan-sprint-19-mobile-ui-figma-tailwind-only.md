# Sprint 19 모바일 UI Figma 구현 + Tailwind-only 전환 계획

## Requirements Summary
- 이번 작업은 **새 Sprint로 분리**해 진행한다. 현재 `docs/05-sprints/sprint-18/planning.md:1-17`은 auth OTP 컷오버 범위라 이번 요청과 source of truth가 충돌한다.
- 모바일 browse/detail/place-add 시각 기준은 사용자 제공 Figma node `9:319`, `9:299`를 source of truth로 사용한다. 단, 현재 세션에서는 Figma MCP가 reload되지 않았고 HTTP 직접 접근도 2026-03-21 기준 `403`이라, 실행 시작 전 **새 세션에서 Figma MCP로 node 내용을 확인**하는 preflight가 필요하다.
- 기존 runtime contract는 유지한다.
  - mobile detail full-screen 유지: `docs/04-design/browse-and-detail.md:23-33`, `docs/03-specs/04-place-detail.md:15-34`
  - place add 전용 route 미도입: `docs/04-design/place-submission.md:18-27`, `docs/03-specs/08-place-registration.md:21-44`
  - 현재 mobile shell surface: `src/app-shell/NurimapAppShell.tsx:800-957`
- DaisyUI는 최종적으로 제거하되, **시각 redesign 대상은 mobile handoff surface 우선**, 나머지 영역은 **regression-only**로 다룬다.
  - plugin 등록: `src/index.css:33-36`
  - DaisyUI 사용처: `src/app-shell/NurimapAppShell.tsx`, `src/app-shell/PlaceAddPanels.tsx`, `src/app-shell/MapPane.tsx`, `src/auth/AuthProvider.tsx`, `package.json:25`

## Working Assumptions
1. 이번 요청은 `docs/05-sprints/sprint-19/`를 새로 여는 방향으로 진행한다.
2. 두 Figma node는 모바일 app-shell 핵심 surface(목록/상세/등록 또는 그 일부)를 가리킨다. 정확한 screen-to-node 매핑은 preflight에서 확정한다.
3. desktop/auth/map는 이번 Sprint에서 **새 visual redesign 대상이 아니며**, DaisyUI 제거 때문에 필요한 Tailwind 치환만 수행한다.
4. loading/error/empty/disabled 상태가 Figma에 없으면 기존 hierarchy/behavior를 유지하고 visual만 최소 보정한다.

## Guardrails
- Figma가 정한 **layout, spacing, copy, icon, visual priority**는 handoff 우선으로 구현한다.
- browse/detail/add 상태 모델(`map_browse`, `mobile_place_list_open`, `place_add_open`, `place_detail_open`)은 유지한다: `src/app-shell/NurimapAppShell.tsx:945-957`.
- mobile detail/back/browser back contract는 깨뜨리지 않는다: `src/app-shell/NurimapDetail.test.tsx:115-167`.
- mobile add 진입 시 floating actions는 숨겨져야 한다: `src/app-shell/PlaceLookupFlow.test.tsx:83-94`.
- DaisyUI 제거는 **치환 완료 → grep clean 확인 → dependency/plugin 제거** 순서로만 진행한다.
- 문서에서 `Tailwind CSS + daisyUI`를 canonical 기준으로 적은 항목은 이번 Sprint에서 `Tailwind CSS` 기준으로 정리한다.

## Change Breakdown
### CHG-01 Mobile Figma surface implementation
대상:
- `src/app-shell/NurimapAppShell.tsx`
- `src/app-shell/PlaceAddPanels.tsx`
- 필요 시 mobile 전용 icon/font/token asset

목표:
- mobile floating actions, list page, detail page, place-add page 중 Figma 대상 surface를 node별로 매핑하고 시안 기준으로 재구현한다.
- browse/detail/submission contract는 유지한 채 visual만 Figma 우선으로 정렬한다.

### CHG-02 Tailwind-only migration
대상:
- `src/index.css`
- `package.json`
- `src/app-shell/NurimapAppShell.tsx`
- `src/app-shell/PlaceAddPanels.tsx`
- `src/app-shell/MapPane.tsx`
- `src/auth/AuthProvider.tsx`

목표:
- `btn`, `input`, `textarea`, `loading`, `form-control`, `bg-base-*`, `text-error`, `text-primary` 등 DaisyUI 의존 클래스를 Tailwind-only 표현으로 치환한다.
- 최종적으로 `daisyui` dependency와 plugin을 제거한다.

### CHG-03 Sprint/docs/test sync
대상:
- `docs/05-sprints/sprint-19/planning.md`
- `docs/05-sprints/sprint-19/qa.md`
- `docs/05-sprints/sprint-19/review.md`
- `docs/03-specs/01-app-shell-and-layout.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/place-submission.md`
- `docs/00-governance/agent-workflow.md`
- 필요 시 `docs/06-history/decisions.md`

목표:
- 새 Sprint 범위/QA 계획을 source of truth로 고정한다.
- DaisyUI baseline 문구를 live docs에서 제거하거나 Tailwind-only 기준으로 업데이트한다.
- visual detail은 Figma handoff를 우선 source of truth로 남기고, live docs는 surface contract와 guardrail만 유지한다.

## Implementation Steps
1. **Sprint 19 planning preflight 고정**
   - `docs/05-sprints/sprint-19/` 문서 세트를 만든다.
   - Figma node `9:319`, `9:299`를 새 세션에서 MCP로 열어 **node → screen/state 매핑표**를 planning에 기록한다.
   - In Scope / Out Of Scope / Constraints / QA Plan에 아래를 명시한다.
     - 모바일 Figma 대상 surface
     - DaisyUI 제거 완료 정의
     - desktop/auth/map regression-only 원칙
   - Acceptance criteria:
     - planning만 읽어도 구현 범위와 비범위가 분명하다.
     - Figma 대상 screen/state와 비Figma 상태 처리 원칙이 명시된다.

2. **Mobile Figma 대상 surface를 먼저 테스트로 고정**
   - `src/App.test.tsx`, `src/app-shell/NurimapBrowse.test.tsx`, `src/app-shell/NurimapDetail.test.tsx`, `src/app-shell/PlaceLookupFlow.test.tsx`, `src/app-shell/PlaceRegistrationFlow.test.tsx`를 검토해 기존 contract를 유지하는 테스트를 보강한다.
   - 필요한 경우 Figma 반영용 selector를 최소 추가하되, 기존 행동 test id는 가능한 유지한다.
   - 핵심 고정 시나리오:
     - map → list → detail
     - map → add / add 중 floating actions hidden
     - detail back / browser back / direct entry
     - add submit disabled / submitting / success → detail
   - Acceptance criteria:
     - 모바일 시각 변경 후에도 navigation/runtime contract 회귀를 바로 감지할 수 있다.
     - Figma 대상 hierarchy를 설명하는 테스트가 추가된다.

3. **Mobile app-shell을 Figma 기준으로 재구현**
   - `NurimapAppShell.tsx:800-957`의 mobile floating actions, list page, detail page를 Figma hierarchy로 정리한다.
   - `PlaceAddPanels.tsx:40-42, 347-439`의 mobile place-add surface를 동일 visual language로 맞춘다.
   - Figma에 없는 loading/error/empty/disabled는 현재 contract를 유지하되 Tailwind-only 스타일로 보정한다.
   - Acceptance criteria:
     - node `9:319`, `9:299`에 포함된 모바일 surface가 레이아웃/copy/icon/CTA hierarchy 기준으로 일치한다.
     - `mobile-detail-page`, `mobile-place-add-page`, `mobile-floating-actions` 동작 계약이 유지된다.

4. **공용 DaisyUI 의존을 Tailwind-only로 치환**
   - app-shell부터 시작해 `MapPane.tsx`, `AuthProvider.tsx`까지 DaisyUI semantic class를 순차 치환한다.
   - 필요하면 `src/index.css`에 소규모 공용 utility/component class를 추가하되 Daisy plugin 없이 해석되도록 유지한다.
   - 치환 완료 후 아래를 제거한다.
     - `package.json:25`의 `daisyui`
     - `src/index.css:33-36`의 `@plugin "daisyui"`
   - Acceptance criteria:
     - `rg -n "\b(btn|form-control|input|textarea|loading|bg-base|text-error|text-primary)\b|daisyui" src docs package.json` 결과가 의도한 예외 없이 정리된다.
     - auth/map/desktop는 동작 회귀 없이 렌더된다.

5. **문서/QA/검증 동기화 후 마감**
   - Sprint 19 `planning.md`, `qa.md`, `review.md`를 구현 결과 기준으로 채운다.
   - live docs에서 DaisyUI baseline 문구를 제거하고 Tailwind-only 기준으로 정리한다.
   - 비자명한 선택(예: non-Figma 상태 처리 원칙, Daisy 제거 범위, shared primitive 전략)은 `docs/06-history/decisions.md`에 기록한다.
   - Acceptance criteria:
     - Sprint 문서, live docs, 구현, 테스트가 같은 계약을 설명한다.
     - 후속 작업자가 DaisyUI가 남아 있는지 여부와 왜 특정 비Figma 상태가 유지됐는지 추적 가능하다.

## Test / Verification Plan
### Automated
- `pnpm exec vitest run src/App.test.tsx src/app-shell/NurimapBrowse.test.tsx src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceLookupFlow.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/auth/AuthFlow.test.tsx`
- `pnpm lint`
- `pnpm build`
- `rg -n "\b(btn|form-control|input|textarea|loading|bg-base|text-error|text-primary)\b|daisyui" src docs package.json`

### AI Agent Interactive QA
- 모바일 390px 기준으로 Figma node와 실제 hierarchy 비교
- 비Figma 상태(loading/error/empty/disabled)의 bounded fallback이 계획대로 남았는지 확인
- desktop/auth/map가 regression-only 범위에서 깨지지 않았는지 확인

### Browser Automation QA
- 모바일 viewport:
  - map → list → detail
  - detail back / browser back
  - map → add → submit disabled/submitting
- desktop viewport:
  - sidebar browse/detail 유지
  - map zoom/loading/error 기본 회귀
- auth viewport:
  - request / otp / name / verifying 기본 렌더 회귀

## Risks And Mitigations
- **Figma 세션 접근 불가** → 새 Codex 세션에서 Figma MCP 확인 후 node 매핑부터 고정한다.
- **Daisy 제거 범위 폭증** → mobile redesign과 repo-wide cleanup을 change card로 분리하고, regression-only 원칙을 planning에 명시한다.
- **plugin 제거 후 숨은 붕괴** → dependency 제거는 grep clean + tests green 이후 마지막 단계로 제한한다.
- **문서 충돌** → sprint-18과 분리된 sprint-19 문서를 먼저 만들고, live docs는 surface contract만 갱신한다.

## Success Criteria
- Sprint 19가 새 source of truth로 생성된다.
- 모바일 Figma 대상 surface가 시안 기준으로 구현된다.
- 기존 mobile browse/detail/add runtime contract가 유지된다.
- DaisyUI dependency/plugin이 제거되고 Tailwind CSS만 남는다.
- auth/map/desktop는 의도치 않은 회귀 없이 유지된다.
- 테스트, QA evidence, live docs가 최종 구현과 일치한다.
