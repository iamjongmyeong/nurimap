# Doc Writing Checklist

이 체크리스트는 `docs/` 아래 문서를 수정할 때, 문서가 현재 구현 결과에 과도하게 종속되지 않도록 점검하기 위한 기준이다.

## When To Use
- `docs/` 아래 라이브 문서를 새로 만들거나 수정할 때
- user-flow, design, architecture, spec, sprint, history 문서의 경계를 판단할 때

## Checklist
- 이 내용은 **이 문서 역할**에 맞는가?
- 이 내용은 **장기 규칙**인가, 아니면 **현재 작업 / 현재 Sprint 상태**인가?
- 현재 작업에만 유효한 내용이라면 live 문서가 아니라 Sprint 또는 history 문서로 가야 하는가?
- 현재 파일명, 현재 분할 방식, 현재 조합을 **규칙처럼 고정**하고 있지 않은가?
- 바뀔 수 있는 사실은 `예:` 또는 `현재는`으로 표시했는가?
- 같은 내용이 다른 source-of-truth 문서에 이미 있다면, 이 문서에는 꼭 필요한 최소한만 남겼는가?
- 이 문서가 **무엇을 정의하는지**뿐 아니라 **무엇을 정의하지 않는지**도 분명한가?
- UI 작업이라면 visual fidelity 기준을 문서가 아니라 **external handoff**(screenshot / Figma / annotated capture)에 두고 있는가?
- thin contract에는 visual detail(px, color, asset path, hover timing, 임시 copy)을 넣지 않았는가?
- 구조가 바뀌어도 이 문장이 계속 유효한지 확인했는가?

## Layer Hints
- 사용자 여정 / 기대 결과 / 실패 경험 → `01-product/user-flows/`
- 공통 runtime / state ownership / integration / security → `02-architecture/`
- 기능 요구 / acceptance / test 기준 → `03-specs/`
- surface / transition / hidden invariant / failure boundary → `04-design/`
- 현재 범위 / 검증 / handoff / carry-over → `05-sprints/`
- 비자명한 결정 / 변경 요청 이력 → `06-history/`

## Anti-Patterns
- 현재 구조를 영구 규칙처럼 쓰기
- 이번 Sprint 결과를 장기 문서에 고정하기
- exact copy / visual detail / implementation workaround를 여러 문서에 중복 쓰기
- 예시와 규칙을 구분하지 않고 섞어 쓰기
