# Sprint Goal

- `/add-place`를 **Naver URL-entry-first staged flow**로 확장해 사용자가 네이버 지도 URL로 이름/주소를 먼저 불러올 수 있게 한다.
- lookup success / failure / direct manual bypass가 모두 **기존 manual add-place form**으로 자연스럽게 이어지도록 정리한다.
- desktop은 기존 sidebar shell을 유지하고, mobile은 canonical `/add-place` page를 유지한 채 같은 staged flow를 제공한다.

# In Scope

- `/add-place` URL-entry first step 도입
- Naver URL lookup success / failure / direct bypass / manual back contract 정의
- 기존 manual add-place form으로의 prefill handoff(name/address only)
- `naver.me` redirect / URL normalize / robust placeId extraction / internal API/XHR lookup hardening
- source-of-truth 문서(app-shell / place-registration / user-flow / design / sprint docs) 업데이트
- 관련 테스트 및 QA handoff 정리

# Out Of Scope

- 기존 manual add-place form UX/UI 리디자인
- add-rating route 승격
- desktop 전용 신규 visual language 설계
- place submission backend resource contract 재설계
- HTML scraping / browser automation 기반 request-path lookup

# Selected Specs

- `docs/03-specs/01-app-shell-and-layout.md`
- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/08-place-registration.md`
- `docs/03-specs/04-place-detail.md`
- `docs/03-specs/10-review.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/user-flows/place-submission.md`
- `docs/04-design/place-submission.md`
- `docs/02-architecture/system-runtime.md`
- `docs/00-governance/agent-workflow.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`
- `.omx/specs/deep-interview-naver-place-xhr-lookup.md`
- `.omx/plans/plan-add-place-naver-url-entry-consensus.md`
- `.omx/plans/prd-add-place-naver-url-entry.md`
- `.omx/plans/test-spec-add-place-naver-url-entry.md`

# Constraints

- `/add-place`는 계속 유일한 durable route로 유지한다.
- URL-entry screen 다음 단계는 **기존 manual form 그대로** 사용한다.
- 기존 manual form의 입력 항목 / 등록 버튼 동작 / 리뷰 입력 방식 / 등록 성공 후 상세 이동은 바꾸지 않는다.
- lookup success는 `name`, `road_address` prefill만 보장하면 된다.
- `invalid_url`은 URL-entry screen에 머무르며 inline field error로 수정이 필요함을 알려야 한다.
- `invalid_url`이 아닌 lookup failure 또는 사용자의 직접 입력 선택은 모두 manual form으로 이어져야 한다.
- manual form 뒤로가기는 URL-entry step으로 돌아가야 한다.
- desktop은 existing sidebar shell reuse only를 따른다. 별도 desktop handoff 없이 새 desktop-specific UI를 임의 설계하지 않는다.
- request-path lookup은 internal API/XHR만 허용하고 HTML scraping fallback은 금지한다.

# Agent Instructions

- 구현/검증/문서 sync는 Sprint 22 source of truth 기준으로 기록한다.
- 기존 manual form contract를 깨는 변경은 범위 밖으로 본다.
- visual feedback이 추가로 들어오면 URL-entry screen 범위에 한해 반영하고, desktop shell 범위를 넘는 새 UI 설계는 보류한다.
- QA 기록은 Sprint 22 문서와 경로를 우선 사용한다.

# Done Criteria

- `/add-place`가 URL-entry first flow로 동작한다.
- `직접 입력하기`는 기존 manual form으로 이어진다.
- `invalid_url`은 inline field error로 URL-entry screen에 남고, 그 외 lookup failure는 안내 후 manual form으로 이어진다.
- lookup success 시 manual form에 `name`, `road_address`가 prefilled 된다.
- manual form 뒤로가기가 URL-entry step으로 복귀한다.
- 기존 manual form의 UX/UI / field order / submit / review / success navigation이 유지된다.
- Naver URL lookup이 `naver.me`, URL normalize, numeric placeId extraction, internal API/XHR lookup을 처리한다.
- Sprint 22 planning / qa / review 문서가 현재 구현/검증 상태와 일치한다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - `/add-place` URL-entry first render
  - lookup success / `invalid_url` inline error / other failure fallback / direct bypass / manual back
  - Naver URL normalize / short-link / route error mapping
  - existing manual form regression
- 실행 주체:
  - AI Agent
- 종료 기준:
  - focused tests + full test suite + lint + typecheck + build가 모두 green이다.

## AI Agent Interactive QA
- 대상 시나리오:
  - Figma node `85:24`와 URL-entry screen 정합성
  - 기존 manual form contract 유지 여부
  - prefill lookup이 coordinate unavailable이어도 success 가능한지
  - `invalid_url`은 URL-entry에 머물고, non-`invalid_url` lookup failure는 안내 후 manual form으로 이동하는지
- 실행 주체:
  - AI Agent
- 종료 기준:
  - docs / code / tests / architect verification 사이에 계약 충돌이 없다.

## Browser Automation QA
- 대상 시나리오:
  - authenticated `/add-place` 진입 후 URL-entry screen 확인
  - lookup success / failure / direct bypass 체감 확인
  - mobile / desktop shell rendering smoke
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 필요 시 local authenticated browser smoke를 수행하고 결과를 Sprint 22 QA에 기록한다.
- 예상 증빙 경로:
  - `artifacts/qa/sprint-22/`

## User QA Required
- 사용자 확인 항목:
  - URL-entry screen이 의도한 Figma handoff와 맞는지
  - lookup success / failure / direct bypass 흐름이 자연스러운지
  - loading spinner / button state가 의도대로 보이는지
- 기대 결과:
  - 사용자는 `/add-place` 진입 시 URL 기반 자동 채움과 직접 입력을 모두 예측 가능하게 사용할 수 있다.
- handoff 조건:
  - automated checks, AI Agent QA, 남은 visual/runtime risk가 함께 정리돼 있다.
