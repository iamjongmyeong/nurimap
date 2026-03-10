# Definition Of Ready

이 문서는 Sprint에 작업을 넣기 전에 충족해야 하는 최소 준비 기준을 정의한다.
아래 조건이 충족되지 않으면 구현보다 문서 보강이나 범위 정리가 우선이다.

## 1. Goal Clarity
- Sprint 목표가 한두 문장으로 명확하게 설명된다.
- 이번 Sprint가 무엇을 해결하는지와 왜 지금 하는지가 드러난다.

## 2. Scope Boundaries
- 포함 범위와 제외 범위가 `planning.md`에 적혀 있다.
- 현재 Sprint에 반영하지 않을 항목이 명시돼 있다.

## 3. Selected Specs
- 구현 기준이 되는 `docs/03-specs/*.md`가 선택돼 있다.
- 선택된 spec의 acceptance criteria가 검증 가능하다.

## 4. User Flow, Design, And Architecture Context
- 관련 `user-flows`, `04-design`, `architecture` 문서가 연결돼 있다.
- 구현 중 추정으로 메우면 안 되는 흐름과 제약이 파악돼 있다.

## 5. Dependencies And Access
- 필요한 외부 서비스, 환경 변수, fixture, 계정, 로컬 검증 방법이 준비돼 있다.
- 준비되지 않은 의존성이 있으면 회피 전략 또는 보류 결정이 문서에 적혀 있다.

## 6. Execution Brief
- `planning.md`에 목표, 참고 문서, 제약, 완료 조건, QA 계획이 적혀 있다.
- AI Agent가 별도 추정 없이 시작할 수 있을 정도로 범위가 정리돼 있다.

## 7. Open Questions
- 현재 Sprint를 막는 미해결 질문이 남아 있지 않다.
- 남아 있는 질문이 있어도 범위를 바꾸지 않는 수준으로 제한돼 있다.

## 8. Change Handling
- 직전 변경 요청이 있었다면 `change-log.md`에 기록돼 있다.
- 현재 Sprint에 반영할지, 다음 Sprint로 넘길지가 이미 결정돼 있다.
