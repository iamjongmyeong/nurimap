# Sprint Goal

- anti-bot / rate-limit 리스크가 있는 외부 URL 조회 의존 대신, **사용자가 장소명과 주소를 직접 입력하는 등록 흐름**으로 제품 방향을 전환한다.
- 현재 별도 place-add component에 의존하는 UX를 정리하고, **목록 영역이 등록 화면으로 바뀌는 구조**로 place 등록 흐름을 재설계한다.
- user flow, design, spec, architecture, sprint 문서를 구현 전에 먼저 동기화해 Sprint 14의 새로운 source of truth를 고정한다.

# In Scope

- `docs/01-product/user-flows/place-submission.md`, `docs/01-product/user-flows/browse-and-detail.md`
- `docs/04-design/place-submission.md`, `docs/04-design/browse-and-detail.md`, `docs/99-archive/04-design/foundations.md`
- `docs/03-specs/01-app-shell-and-layout.md`, `docs/03-specs/03-list-browse.md`, `docs/03-specs/07-place-data-extraction.md`, `docs/03-specs/08-place-registration.md`, `docs/03-specs/09-place-merge.md`
- `docs/99-archive/02-architecture/system-context.md`, `docs/99-archive/02-architecture/integrations.md`, `docs/02-architecture/domain-model.md`
- `docs/01-product/product-overview.md`, `docs/01-product/product-principles.md`
- `docs/06-history/decisions.md`에 **직접 입력 전환 decision만** 기록

# Out Of Scope

- Sprint 14 code implementation
- place-add UI 실제 컴포넌트 리팩터링 구현
- anti-bot extraction path 고도화 구현
- 외부 지도 링크 입력 지원
- UXUI 세부 변경 이력을 별도 history/change-log에 기록하는 작업

# Selected Specs

- `docs/03-specs/01-app-shell-and-layout.md`
- `docs/03-specs/03-list-browse.md`
- `docs/03-specs/07-place-data-extraction.md`
- `docs/03-specs/08-place-registration.md`
- `docs/03-specs/09-place-merge.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/product-overview.md`
- `docs/01-product/product-principles.md`
- `docs/01-product/user-flows/browse-and-detail.md`
- `docs/01-product/user-flows/place-submission.md`
- `docs/04-design/browse-and-detail.md`
- `docs/04-design/place-submission.md`
- `docs/99-archive/04-design/foundations.md`
- `docs/99-archive/02-architecture/system-context.md`
- `docs/99-archive/02-architecture/integrations.md`
- `docs/02-architecture/domain-model.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`

# Constraints

- 이번 문서 변경의 핵심 decision은 **사용자가 직접 장소명과 주소를 입력하고 geocoding으로 좌표를 확보하는 흐름으로 전환하는 것**이다.
- UXUI 수정 내역 자체는 `decisions.md`나 다른 history 문서에 상세히 남기지 않는다.
- 데스크톱과 모바일 모두 별도 전용 등록 화면을 추가하는 대신 기존 목록 영역이 등록 화면으로 바뀌는 기준으로 문서를 정리한다.
- 외부 지도 링크 입력은 이번 범위에서 보류한다.
- duplicate/merge 규칙은 URL 기반 canonical key가 아니라 현재 문서화된 직접 입력 기준으로 다시 맞춘다.

# Agent Instructions

- 구현 전에 source-of-truth 문서부터 먼저 정리한다.
- 문서 간 충돌이 생기지 않도록 user flow → design → spec → architecture → sprint 순으로 맞춘다.
- `docs/06-history/decisions.md`에는 직접 입력 전환 decision만 추가하고, UXUI 영역 변경 상세는 남기지 않는다.
- `docs/06-history/change-log.md`는 이번 범위에서 수정하지 않는다.

# Done Criteria

- place 등록의 기본 진입점이 `네이버 지도 URL 입력`이 아니라 `장소명 + 주소 직접 입력`으로 읽힌다.
- place 등록 흐름이 별도 전용 component가 아니라 목록 영역 안의 단일 등록 화면 기준으로 문서화된다.
- geocoding이 저장 전 내부 처리로 정리된다.
- geocoding 실패, 중복 장소 confirm, dirty state confirm 정책이 문서화된다.
- merge 규칙, domain model, system context가 직접 입력 기반 규칙과 충돌하지 않는다.
- `docs/06-history/decisions.md`에는 직접 입력 전환 decision만 기록된다.
- 관련 sprint 문서가 현재 문서 방향과 일치한다.

# QA Plan

## Automated Checks
- 대상 시나리오:
  - 이번 턴은 문서 변경만 수행
  - source-of-truth 문서 간 용어/흐름 일관성 점검
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 변경 문서 diff review 완료

## AI Agent Interactive QA
- 대상 시나리오:
  - 직접 입력 기반 flow가 user flow/design/spec/architecture에 일관되게 반영되었는지 점검
  - 목록 영역이 등록 화면으로 바뀌는 UX가 관련 문서에 일관되게 반영되었는지 점검
  - 최종 UI 기준 필드 순서와 별점 정책이 문서에 반영되었는지 점검
  - geocoding 실패 / 중복 confirm / dirty state confirm 정책이 문서에 반영되었는지 점검
- 실행 주체:
  - AI Agent
- 종료 기준:
  - 주요 충돌 문구가 제거되고 문서 요약이 가능함

## Browser Automation QA
- 대상 시나리오:
  - 없음 (이번 턴은 문서 변경만 수행)
- 실행 주체:
  - N/A
- 종료 기준:
  - 구현 전까지 보류
- 예상 증빙 경로:
  - 없음

## User QA Required
- 사용자 확인 항목:
  - 문서 방향성 승인 여부
  - 직접 입력 + 목록 영역 UX 방향이 의도와 맞는지
- 기대 결과:
  - 다음 턴부터 구현에 들어갈 수 있는 문서 기준 확정
- handoff 조건:
  - 문서 변경 요약과 touched docs 목록 제공
