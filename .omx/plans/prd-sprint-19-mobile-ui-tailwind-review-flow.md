# PRD: Sprint 19 Mobile UI Tailwind + Review Flow

## Context
- Sprint 19의 기준은 모바일 전 화면(map/list/detail/add)을 Figma 기준으로 재정렬하면서 DaisyUI를 repo 전체에서 제거하는 것이다.
- 현재 모바일 browse shell은 floating actions + mobile list/detail/place-add surface로 구성돼 있고, DaisyUI class가 app-shell/map/auth 전반에 남아 있다.
- 현재 상세 화면에는 inline `DetailReviewComposer`가 남아 있지만, 새 요구사항은 detail 하단 `평가 남기기` CTA와 별도 add-rating 화면을 도입하는 것이다.
- review lifecycle은 이미 `docs/03-specs/10-review.md`와 `src/app-shell/placeRepository.ts`에 존재하며, 같은 place에 대해 사용자당 review 1건 규칙과 기존 정책(별점 1~5, 후기 선택 입력, 실패 시 입력 유지)을 유지해야 한다.

## Desired Outcome
- Sprint 19에서 모바일 전 화면이 Figma 방향으로 정리된다.
- place detail 하단 CTA + add-rating flow가 도입된다.
- add-rating 저장 성공 후 상세 화면으로 돌아가고, 새 리뷰가 즉시 보인다.
- DaisyUI dependency/plugin/semantic class 사용이 repo 전체에서 제거되고 Tailwind CSS만 남는다.
- Sprint 문서, selected spec, design doc, 테스트, QA 계획이 구현 기준과 일치한다.

## User Decisions
1. DaisyUI는 repo 전체에서 완전히 제거한다.
2. 모바일 구현 범위는 전 화면(map/list/detail/add)이다.
3. Figma에 직접 없는 모바일 detail/add 시각 detail은 desktop UI 언어를 재사용한다.
4. DaisyUI 제거와 디자인 반영의 작업 순서는 고정하지 않는다.
5. `평가 남기기` 저장 성공 후 place detail로 복귀하고, 새 리뷰가 바로 보여야 한다.

## RALPLAN-DR Summary

### Mode
- SHORT

### Principles
1. Figma-first mobile fidelity
2. Behavior-preserving refactor
3. Tailwind-only end state
4. Single-review-per-user rule preservation
5. Docs/tests/QA sync before close

### Decision Drivers
1. 모바일 Figma fidelity와 UX 일관성
2. DaisyUI 제거에 따른 repo-wide regression 위험 통제
3. 기존 review/domain/runtime contract 재사용

### Viable Options

#### Option A — Surface-first integrated refactor (Recommended)
- 설명: 모바일 surface와 review flow를 Figma 기준으로 정리하면서, touched surface마다 DaisyUI를 Tailwind-only로 같이 치환한다. 이후 map/auth 잔여 DaisyUI를 정리하고 dependency/plugin을 제거한다.
- Pros:
  - 시각 작업과 Daisy 제거를 같은 변경맥락에서 처리할 수 있어 diff가 이해하기 쉽다.
  - Figma 비교와 회귀 검증을 surface 단위로 나눠서 할 수 있다.
  - detail CTA/add-rating 같은 새 UI 흐름을 가장 자연스럽게 반영할 수 있다.
- Cons:
  - surface별로 Tailwind token 재사용 기준을 잘못 잡으면 중복 class churn이 생길 수 있다.
  - 중간 단계에서 일부 화면만 Daisy 제거된 상태가 잠시 생긴다.

#### Option B — Daisy-first global cleanup, then design implementation
- 설명: 먼저 repo 전체 DaisyUI를 제거해 Tailwind-only 기반을 만들고, 그 뒤 모바일 Figma UI와 review CTA/add-rating를 구현한다.
- Pros:
  - 최종 styling system이 먼저 고정된다.
  - 이후 컴포넌트 구현에서 Daisy 잔존 여부를 덜 신경 써도 된다.
- Cons:
  - 시각 회귀 원인을 Daisy 제거와 디자인 변경으로 분리해 보기 어렵다.
  - 중간 단계에서 모바일 UI가 크게 깨질 가능성이 높다.

#### Option C — Shared primitive layer first, then surface migration
- 설명: 버튼/입력/상태/spacing primitive를 먼저 공용화하고, 이후 모바일 surface와 review flow를 얹는다.
- Pros:
  - 장기적으로 styling consistency가 좋아진다.
  - auth/map/app-shell 공용 규칙을 정리하기 쉽다.
- Cons:
  - 이번 Sprint 범위 대비 초기 투자량이 크다.
  - concrete Figma 반영보다 선행 구조 논의가 늘어난다.

### Preferred Option
- Option A

### Alternative Invalidation Rationale
- Option B는 최종 상태는 분명하지만 시각 회귀와 구현 회귀를 동시에 키운다.
- Option C는 장기적으로 좋지만 Sprint 19의 feature delivery(모바일 전 화면 + review flow)에 비해 초기 구조 비용이 과하다.
- 따라서 Sprint 19는 surface-first integrated refactor가 가장 균형적이다.

## Guardrails
- 모바일 detail은 full-screen, back/browser back, selected place/map context 유지 계약을 깨지 않는다.
- add-rating은 기존 detail inline composer를 대체하는 **detail-owned child surface**이며, durable route는 계속 `/places/:placeId`를 유지한다.
- add-rating의 상태 소유권과 back/success 복귀 규칙은 `appShellStore`에 명시적으로 모델링한다.
- 이미 review가 있는 사용자는 `평가 남기기` CTA를 보지 않는다.
- review 0건 empty-state 미노출, rating-only review, 작성자/날짜 표시 규칙은 유지한다.
- mobile/detail/add에 직접 없는 visual detail은 desktop UI 언어를 재사용하되 새 임의 기능은 추가하지 않는다.
- DaisyUI 제거는 dependency/plugin/class 치환이 모두 끝난 뒤 완료로 간주한다.

## Work Objectives
1. Sprint 19 source of truth와 acceptance criteria를 고정한다.
2. 모바일 map/list/detail/add와 detail CTA/add-rating 흐름을 하나의 실행 범위로 정리한다.
3. DaisyUI 제거를 repo-wide cleanup으로 계획하되 surface 단위로 안전하게 수행한다.
4. 구현 전 테스트/QA/문서 sync 범위를 명확히 고정한다.

## Success Criteria
- 실행자가 추정 없이 Sprint 19 구현 범위와 비범위를 이해할 수 있다.
- review CTA/add-rating와 repo-wide DaisyUI removal이 하나의 실행 계획으로 묶인다.
- 테스트/브라우저 QA/문서 갱신 범위가 implementation 전에 명확해진다.
