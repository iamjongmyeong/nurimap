# Plan: Retire Recommendation From Live Docs Only

## Requirements Summary
- 목표는 live documentation에서 제품 기능으로서의 `추천`을 제거하고, 제품 서술을 `평가 및 리뷰` 중심으로 재정렬하는 것이다.
- 이번 변경은 **문서 전용 정리**다. `src/`, `api/`, `src/server/`, 테스트, UI, 상태 로직은 수정하지 않는다.
- history를 다시 쓰지 않기 위해 1차 범위는 live source-of-truth 문서(`docs/00-governance` ~ `docs/04-design`)에 한정한다. 과거 Sprint 기록(`docs/05-sprints/`의 과거 sprint), `docs/06-history/`, `docs/99-archive/`는 보존한다.
- recommendation 전용 live 문서는 삭제보다 **archive retirement**를 우선한다. `docs/00-governance/docs-structure.md`의 live/archive boundary에 맞춰 retired snapshot을 남기고 live tree에서는 제거한다.
- detail UX의 현재 canonical source는 recommendation이 아닌 review 중심 문서다. 특히 `docs/03-specs/04-place-detail.md:16-40`은 상세 정보/리뷰/평가 CTA만 정의하므로 이 문서는 유지 기준점으로 삼는다.

## Current Live Touchpoints To Clean Up
- `docs/01-product/product-overview.md:18,59,66`
  - 제품 목표와 Completed Product Criteria가 아직 추천을 live capability로 설명한다.
- `docs/01-product/user-flows/recommendation.md:1-20`
  - recommendation 전용 live user flow 문서다.
- `docs/02-architecture/domain-model.md:11,15,69,78-81,99,141-162`
  - recommendation 엔터티, 관계, 파생 필드(`my_recommendation_active`), 집계 규칙이 남아 있다.
- `docs/02-architecture/system-runtime.md:92,112`
  - `recommendation_toggle` async substate와 DB responsibility가 recommendation 저장을 가정한다.
- `docs/02-architecture/security-and-ops.md:14,70`
  - 인증 필요 변경성 액션 목록에 recommendation이 포함돼 있다.
- `docs/03-specs/09-place-merge.md:30,62`
  - merge 정책이 recommendation 누적/단일 상태를 언급한다.
- `docs/03-specs/11-recommendation.md:1-57`
  - recommendation 전용 live spec이다.
- `docs/04-design/browse-and-detail.md:5,9,14,28,43,45,50,58`
  - detail contract가 review/recommendation module을 함께 설명하고 관련 spec/user-flow를 참조한다.
- `docs/00-governance/agent-workflow.md:106`
  - surface reading guidance에 `리뷰/추천`이 함께 적혀 있다.

## Out Of Scope
- `src/app-shell/types.ts`, `src/app-shell/placeRepository.ts`, `src/app-shell/appShellStore.ts`, `src/app-shell/mockPlaces.ts` 등 코드 정리
- `src/app-shell/*.test.tsx`, `*.test.ts` 테스트 정리
- 과거 sprint 기록 재작성 (`docs/05-sprints/sprint-13/`, `sprint-15/`, `sprint-16/` 등)
- `docs/06-history/decisions.md`, `docs/06-history/change-log.md` 수정
- `.codex/`, `.omx/`, `.agents/`의 내부 운영 프롬프트/노트 정리

## Acceptance Criteria
1. `git diff --name-only` 기준으로 변경 파일이 `docs/` 하위 live 문서와 새 archive 문서, 그리고 이번 plan 파일에만 한정된다.
2. `src/`, `api/`, `src/server/`, 테스트 파일에는 diff가 없다.
3. `docs/00-governance`, `docs/01-product`, `docs/02-architecture`, `docs/03-specs`, `docs/04-design`의 live 문서에서 recommendation 기능을 제품 contract로 설명하는 문구가 제거된다.
4. `docs/01-product/user-flows/recommendation.md`와 `docs/03-specs/11-recommendation.md`는 live tree에서 retire되고, archive 위치에 snapshot/stub로 보존된다.
5. `docs/04-design/browse-and-detail.md`는 detail submodule을 review/add-rating 기준으로만 설명하고 recommendation 전용 참조를 남기지 않는다.
6. `docs/03-specs/04-place-detail.md`의 현재 review-centric contract는 변경되지 않는다.
7. live docs 대상 grep에서 `recommendation`, `추천`, `recommendation_toggle`, `my_recommendation_active`, `recommendation_count`가 0건이거나, feature 제거를 설명하는 의도적 archive pointer만 남는다.

## Recommended Archive Strategy
- recommendation user flow: `docs/01-product/user-flows/recommendation.md` → `docs/99-archive/user-flows/recommendation.md`
- recommendation spec: `docs/03-specs/11-recommendation.md` → `docs/99-archive/specs/11-recommendation.md`
- archive 파일 상단에는 기존 archive stub 관례처럼 `Status`, `Replaced by`를 넣는다. 예시는 `docs/99-archive/design/recommendation.md:1-5`를 따른다.
- live 문서 안에 retired recommendation 경로를 계속 링크로 남기지 말고, 필요한 경우에만 archive stub 내부에서 replacement를 가리킨다.

## Implementation Steps

### 1. Scope Lock And Diff Guard
- 작업 시작 전에 이번 변경을 docs-only cleanup으로 고정한다.
- 변경 허용 경로:
  - `docs/00-governance/`
  - `docs/01-product/`
  - `docs/02-architecture/`
  - `docs/03-specs/`
  - `docs/04-design/`
  - `docs/99-archive/`(retirement snapshot 추가용)
- 변경 금지 경로:
  - `src/`
  - `api/`
  - `src/server/`
  - 테스트 파일
  - `docs/06-history/`
  - 과거 sprint docs

### 2. Product Layer Cleanup
- `docs/01-product/product-overview.md:18,59,66`
  - Goal/criteria에서 `추천`을 제거하고 `평가 및 리뷰`만 남긴다.
  - 상세 화면 설명에서도 `추천 수`를 제거한다.
- `docs/01-product/user-flows/recommendation.md:1-20`
  - live tree에서 retire한다.
  - replacement가 필요하면 browse/detail 또는 review 관련 live 문서를 가리키는 archive stub로 이동한다.

### 3. Architecture Layer Cleanup
- `docs/02-architecture/domain-model.md:11,15,69,78-81,99,141-162`
  - Recommendation 엔터티/관계/무결성 규칙 제거
  - `recommendation_count`, `my_recommendation_active` 제거
  - place summary 설명을 review/rating 중심으로 재작성
- `docs/02-architecture/system-runtime.md:92,112`
  - `recommendation_toggle` substate 제거
  - DB responsibility를 `place, review, user` 중심으로 수정
- `docs/02-architecture/security-and-ops.md:14,70`
  - recommendation mutation 언급 제거

### 4. Spec Layer Cleanup
- `docs/03-specs/11-recommendation.md:1-57`
  - live spec에서 retire 후 archive 이동
- `docs/03-specs/09-place-merge.md:30,62`
  - merge rule에서 recommendation 단일 상태/누적 처리 제거
- 유지 anchor:
  - `docs/03-specs/04-place-detail.md:16-40`은 그대로 두고, detail live contract가 이미 review-only라는 기준점으로 사용한다.

### 5. Design And Governance Cleanup
- `docs/04-design/browse-and-detail.md:5,9,14,28,43,45,50,58`
  - review/recommendation 병기 표현을 review/add-rating 중심으로 축소
  - recommendation user-flow/spec 참조 제거
  - failure/context rule도 review/add-rating 범위로만 남긴다.
- `docs/00-governance/agent-workflow.md:106`
  - 관련 문서 읽기 가이드를 `리뷰` 기준으로 축소한다.

### 6. Link And Terminology Sweep
- live docs 전체에서 아래 토큰을 다시 검색한다.
  - `recommendation`
  - `추천`
  - `recommendation_toggle`
  - `my_recommendation_active`
  - `recommendation_count`
- 검색 hit는 아래로 분류한다.
  - 남겨야 하는 archive/history 기록
  - 제거해야 하는 live source-of-truth 잔여 문구
  - 일반 영어 단어 `recommendation(s)`처럼 제품 기능과 무관한 노이즈

### 7. Final Verification
- docs-only diff 검증
- retired link 잔존 여부 검증
- live docs semantics 재검토: 상세/도메인/보안/merge 문서가 모두 `평가 및 리뷰` 중심으로 일관적인지 확인

## Risks And Mitigations
- **Risk:** 과거 기록까지 덮어써서 history를 왜곡할 수 있다.
  - **Mitigation:** 1차 범위에서 `docs/05-sprints/` 과거 sprint, `docs/06-history/`, `docs/99-archive/` 기존 문서는 수정하지 않고, archive snapshot만 추가한다.
- **Risk:** retired spec/user-flow를 지운 뒤 live 문서의 링크가 깨질 수 있다.
  - **Mitigation:** archive 이동 전에 `11-recommendation.md`, `user-flows/recommendation.md` 참조를 먼저 sweep하고, live 링크를 모두 제거/대체한다.
- **Risk:** 문서가 코드보다 먼저 바뀌면서 구현과 문서가 잠시 어긋날 수 있다.
  - **Mitigation:** 이번 계획은 product/source-of-truth 정리로 한정하고, 코드 cleanup은 별도 follow-up으로 분리한다. 문서 안에는 recommendation이 현재 코드에 남아 있다는 구현 세부를 새 contract로 남기지 않는다.
- **Risk:** `추천`이라는 일반 한국어 표현까지 과잉 제거할 수 있다.
  - **Mitigation:** grep hit를 기능 의미와 일반 서술 의미로 분리해 수동 검토한다.

## Verification Steps
1. 변경 파일 범위 확인
   - `git diff --name-only`
   - 기대 결과: `docs/` 하위 문서와 `.omx/plans/plan-retire-recommendation-docs-only.md` 외 변경 없음
2. 코드/테스트 무변경 확인
   - `git diff --name-only -- src api`
   - 기대 결과: 출력 없음
3. live docs 잔여 추천 토큰 확인
   - `rg -n --hidden --glob '!docs/05-sprints/**' --glob '!docs/06-history/**' --glob '!docs/99-archive/**' 'recommendation|추천|recommendation_toggle|my_recommendation_active|recommendation_count' docs/00-governance docs/01-product docs/02-architecture docs/03-specs docs/04-design`
   - 기대 결과: 0건 또는 의도적으로 남긴 retirement pointer만 존재
4. retired 링크 확인
   - `rg -n '11-recommendation\.md|user-flows/recommendation\.md' docs/00-governance docs/01-product docs/02-architecture docs/03-specs docs/04-design`
   - 기대 결과: live docs에서 0건
5. semantic spot check
   - `docs/01-product/product-overview.md`
   - `docs/02-architecture/domain-model.md`
   - `docs/02-architecture/system-runtime.md`
   - `docs/03-specs/09-place-merge.md`
   - `docs/04-design/browse-and-detail.md`
   - 기대 결과: 모두 recommendation 없는 동일 제품 서술을 사용

## Follow-Ups (Not In This Plan)
- 코드/테스트에서 dormant recommendation 필드와 로직 제거
- 내부 프롬프트/노트(`.codex/`, `.omx/`) 정리
- 필요 시 과거 sprint/history 문서에 “현재는 recommendation 폐기”라는 후속 메모를 남길지 별도 결정
