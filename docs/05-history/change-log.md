# Change Log

이 문서는 Sprint 진행 중 들어온 변경 요청과 문서 구조 변경 이력을 기록한다.
새 요청은 바로 구현하지 않고 이 문서에 먼저 남긴 뒤 반영 여부를 결정한다.

## Entry Template
앞으로의 변경 요청은 아래 형식으로 기록한다.

```md
## YYYY-MM-DD - Short Title
- Request:
- Reason:
- Requested by:
- Affected docs/specs:
  - docs/...
- Decision:
- Sprint impact:
- Follow-up:
```

## 2026-03-09 - `docs/` 구조를 Sprint 12 체계로 재편하고 archive를 단순화
- Why:
  - 기존 `plans.md` 중심 Plan 체계와 `specs/`, `qa/`, `decisions.md`, `todos.md`, `ai-agent-development-workflow.md`가 서로 겹쳐 stale 문서가 생기기 쉬웠다.
  - 현재 기준 문서와 역사 기록 문서를 분리해 Spec-Driven Development와 Sprint 기반 운영을 더 명확히 유지할 필요가 있었다.
  - 일부 문서는 이름이나 위치만 바뀐 live 문서인데 archive 복제본까지 유지하면 중복이 커진다.
  - archive 구조도 retired 문서만 남기는 형태가 더 단순하고 이해하기 쉬웠다.
- How:
  - 라이브 문서를 `00-governance`, `01-product`, `02-architecture`, `03-specs`, `04-sprints`, `05-history` 구조로 재편했다.
  - `project-overview.md`를 `product-overview.md`로 변경했다.
  - 기존 `user-flow.md`를 `user-flows/` 아래 개별 문서로 분해했다.
  - 기능 spec은 `03-specs/` 아래 새 번호 체계로 재정렬했다.
  - `docs/04-sprints/template/`를 만들고 `planning.md`, `qa.md`, `review.md` 템플릿을 추가했다.
  - `ai-agent-workflow.md`, `definition-of-ready.md`, `definition-of-done.md`, `AGENTS.md`를 새 구조 기준으로 정리했다.
  - 구조 규칙과 Sprint 문서 계약을 `docs/00-governance/docs-structure.md`에 문서화했다.
  - `docs/99-archive/` 루트에 retired 문서만 남기고, legacy QA 기록은 `docs/99-archive/qa/`에 모았다.
  - archive 문서 상단에 `Status`, `Archived on`, `Reason`, `Replaced by`, `이 문서는 더 이상 현재 기준 문서가 아니다.` 표시를 추가했다.
  - archive 문서 내부의 legacy 경로도 현재 live/archive 경로 기준으로 정리했다.
- Live docs:
  - `docs/00-governance/`
  - `docs/01-product/`
  - `docs/02-architecture/`
  - `docs/03-specs/`
  - `docs/04-sprints/`
  - `docs/05-history/`
- Archived docs:
  - `docs/99-archive/plans.md`
  - `docs/99-archive/user-flow.md`
  - `docs/99-archive/local-development.md`
  - `docs/99-archive/local-integration-qa.md`
  - `docs/99-archive/todos.md`
  - `docs/99-archive/qa/`
