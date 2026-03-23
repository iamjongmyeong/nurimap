# Agent Workflow

## Purpose
이 문서는 Nurimap 프로젝트에서 AI Agent가 Sprint 단위 작업을 수행할 때 따라야 할 repository-specific execution workflow를 정의한다.
문서 구조는 `docs/00-governance/docs-structure.md`가 기준이며, `AGENTS.md`는 runtime/orchestration 규칙과 hard constraints를 담당한다.
구현 절차, QA 절차, 문서 갱신 절차, 기본 stack/verification 규칙은 이 문서를 따른다.

## Required Reading
작업 시작 전 아래 문서를 먼저 읽는다. `AGENTS.md`는 runtime/orchestration 규칙과 hard constraints를 확인하기 위해 포함한다.

1. `AGENTS.md`
2. `docs/00-governance/docs-structure.md`
3. 현재 Sprint의 `docs/05-sprints/sprint-XX/planning.md`
4. 현재 Sprint에서 선택된 `docs/03-specs/*.md`
5. UI fidelity가 중요한 작업이면 사용자 제공 screenshot / Figma / annotated capture 같은 external handoff
6. 현재 작업과 관련된 `docs/01-product/user-flows/*.md`, `docs/04-design/*.md`, `docs/02-architecture/*.md`
7. `docs/00-governance/definition-of-ready.md`
8. `docs/00-governance/definition-of-done.md`
9. 필요 시 `docs/06-history/decisions.md`, `docs/06-history/change-log.md`

## Source Of Truth Hierarchy
문서 충돌이 없다는 가정에서 아래 순서로 해석한다.

1. 현재 Sprint의 `planning.md`
2. 현재 Sprint에서 명시적으로 선택된 `docs/03-specs/*.md`
3. 관련 `docs/01-product/user-flows/*.md`
4. UI fidelity-sensitive 작업의 external screenshot / Figma / annotated capture
5. 관련 `docs/04-design/*.md` thin contract
6. 관련 `docs/02-architecture/*.md`
7. `docs/01-product/product-principles.md`
8. `docs/01-product/product-overview.md`
9. `docs/00-governance/definition-of-ready.md`
10. `docs/00-governance/definition-of-done.md`
11. `docs/06-history/decisions.md`
12. `docs/06-history/change-log.md`

### Conflict Rule
- 현재 Sprint의 `planning.md`는 이번 실행 범위와 작업 지시를 고정한다.
- `docs/03-specs/*.md`는 기능 요구사항과 검증 기준을 고정한다.
- `docs/01-product/user-flows/*.md`는 사용자 흐름과 실패 흐름을 고정한다.
- UI 작업에 external handoff가 있으면 screenshot / Figma / annotated capture가 layout, spacing, text, icon, visual priority의 source of truth다.
- `docs/04-design/*.md`는 thin contract로서 surface boundary, transition, hidden invariant, failure/context rule만 고정한다.
- `docs/02-architecture/*.md`는 공통 도메인, runtime, security 규칙을 고정한다.
- `docs/06-history/*`는 이력 문서이며 현재 범위를 확장하는 근거가 아니다.
- `docs/99-archive/`는 역사 기록이다. 현재 구현의 source of truth로 사용하지 않는다.
- handoff와 thin contract가 시각 detail에서 충돌하면 handoff를 우선하되, thin contract의 boundary/invariant가 바뀐 경우에만 문서를 갱신한다.
- spec, design, architecture가 정면충돌하면 추정으로 메우지 말고 문서 충돌로 보고한다.
- handoff가 spec / user-flow / architecture의 behavior, state, security 계약과 충돌하면 handoff만으로 덮지 말고 문서 충돌로 보고한다.

## Task Guidance
### Planning / Scoping
- 범위나 selected spec이 비어 있으면 구현보다 문서 보강을 우선한다.
- broad하거나 ambiguous한 작업은 구현 전에 먼저 plan을 만들고, 구조/거버넌스처럼 trade-off가 큰 변경은 필요하면 `$ralplan`으로 합의한다.

### Durable Doc Writing
- `docs/` 아래 라이브 문서를 쓸 때는 현재 구현 결과보다 역할, 판단 기준, 변경 트리거가 먼저 보이도록 쓴다.
- 파일명, 현재 분할 방식, 현재 조합은 쉽게 바뀔 수 있으므로 규칙처럼 고정하지 말고 필요하면 예시로만 적는다.
- 장기 문서에는 Sprint 한정 결정이나 임시 workaround를 쓰지 말고, 그런 내용은 현재 Sprint 문서나 history 문서에 남긴다.
- 문서가 “무엇을 정의하는가”뿐 아니라 “무엇을 정의하지 않는가”도 함께 적어 다음 작업자가 추정으로 채우지 않게 한다.
- 문서 수정 전에는 이 문장이 구조가 바뀌어도 유효한지, 아니면 이번 작업에만 유효한지를 먼저 구분한다.

### Design / Development
- SDK, framework, API를 사용할 때는 먼저 공식 문서를 확인한다.
- 프론트엔드 구현은 spec에 다른 지시가 없으면 Vite + React + Tailwind CSS를 따른다. 별도 UI 라이브러리 baseline은 source of truth가 명시할 때만 추가한다.
- frontend state가 필요하면 React-oriented library로 Zustand를 사용할 수 있다.
- backend / data integration 작업은 기본적으로 **Frontend -> Backend -> Supabase** 계약을 따른다. source of truth가 명시적으로 바뀌지 않는 한 frontend가 Supabase에 직접 연결하거나 frontend에 Supabase client/runtime contract를 다시 도입하지 않는다.
- Supabase는 backend에서만 사용한다. server-only credential/service-role-capable credential을 기준으로 연결하고, RLS는 필요 시 defense-in-depth로만 사용한다. 제품의 인증/인가/business rule을 RLS에 primary source of truth로 위임하지 않는다.
- 인증, 인가, business logic, mutable data write 규칙은 backend가 소유한다. AI Agent는 frontend helper나 client state에 server-owned rule을 복제하기보다 backend API contract를 기준으로 구현한다.
- schema 변경은 migration file로만 수행한다. dashboard 수동 변경이나 ad-hoc SQL을 canonical 변경 경로로 사용하지 않는다.
- 여러 단계가 묶인 write/auth flow는 backend transaction을 기본으로 한다. RPC는 source of truth가 요구하거나 transaction/API boundary보다 명확한 이점이 있을 때만 예외적으로 검토한다.
- backend code는 provider 교체 가능성을 남기는 방향으로 작성한다. Supabase-specific detail은 adapter/service boundary 안에 가두고, domain type이나 frontend contract에 provider-specific shape를 직접 새기지 않는다.
- UI 작업에서 사용자 제공 screenshot / Figma / annotated capture가 있으면 그것을 visual source of truth로 사용하고, 자율적 디자인 해석은 하지 않는다.
- UI fidelity가 중요한데 screenshot reference가 없으면, 비자명한 시각 변경 전에 사용자에게 desktop/mobile screenshot 제공을 먼저 요청한다.
- screenshot이 제공되면 `/prompts:vision`으로 레이아웃/spacing/text/icon 요구를 먼저 분석하고, 구현 결과 비교가 필요하면 `$visual-verdict`를 사용한다.
- design 문서는 visual guide가 아니라 thin contract로 유지한다. 시각 구현 디테일은 external handoff 또는 해당 Sprint QA evidence에 두고, design 문서에는 surface/transition/invariant/failure boundary만 남긴다.
- 특정 UI 계약이 더 큰 surface나 flow에 종속되면 별도 문서로 과분화하지 말고 관련 thin contract에 흡수한다. 공통 route/layout/view-state/integration runtime 규칙은 관련 architecture 문서를 기준으로 본다.
- frontend UI review, UX audit, accessibility/design review에는 `web-design-guidelines`를 참고한다.
- 관련 spec이 `docs/03-specs/`에 있으면 TDD 순서로 failing test -> 구현 -> 검증을 따른다.

### Auth / Login Work
- auth/login/session 변경은 코드 수정만으로 닫지 말고 **배포 코드 / 런타임 env / DB schema-migration / production smoke**를 별도 gate로 확인한다.
- production auth incident를 볼 때는 latest production logs 기준으로 blocker가 **TLS/env**, **schema/migration**, **route/method**, **app logic** 중 어디 단계인지 먼저 분리한다.
- production auth rollout 또는 recovery에는 최소한 아래를 함께 확인한다.
  - active production alias/deployment
  - auth-critical env (`DATABASE_URL`, 필요 시 `DATABASE_SSL_ROOT_CERT`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `PUBLIC_APP_URL`)
  - auth-critical table / migration readiness (`user_profiles`, `app_sessions` 등)
  - `POST /api/auth/verify-otp` 후 `GET /api/auth/session` smoke
- server-only auth/session persistence를 Supabase `public` 같은 노출 schema에 둘 때는 RLS / privilege revoke 또는 private schema 격리를 함께 설계한다.

### QA / Docs
- 브라우저 자동화나 페이지 inspection이 필요하면 아래 순서로 진행한다.
  - 1차: Playwright (`playwright` command)
  - 2차: PATH에서 사용할 수 있는 `agent-browser`
  - 둘 다 사용할 수 없거나 실행에 실패하면 사용자에게 즉시 알리고 QA blocker로 보고한다.
- QA 결과의 canonical 기록 위치는 현재 Sprint의 `qa.md`다.
- `docs/`를 수정할 때는 현재 디렉터리 구조와 기존 참조 경로를 먼저 확인하고, `docs/00-governance/docs-structure.md`의 placement/naming과 문서 경계, 이 문서의 절차를 따른다.
- `docs/`를 수정할 때는 `docs/00-governance/doc-writing-checklist.md`를 먼저 확인하고, 현재 문장이 장기 규칙인지 현재 작업 상태인지를 구분한다.
- design 문서를 수정할 때는 visual detail을 새 canonical 문서로 복제하지 말고, 필요하면 external handoff reference 또는 Sprint QA evidence 경로를 남긴다.
- `docs/06-history/` 아래 문서에 새 내용을 추가하거나 기존 entry의 의미를 바꾸는 수정이 필요하면, 먼저 사용자에게 추가 목적과 대상 문서를 짧게 설명하고 확인을 받는다.
- 단, 오탈자 수정, 깨진 링크 수정, 관련 commit hash 보강처럼 의미를 바꾸지 않는 기계적 갱신은 사용자 확인 없이 진행할 수 있다.
- 비자명한 autonomous decision은 `docs/06-history/decisions.md`에 context, options considered, decision, rationale, impact, revisit trigger, related docs, related commit 형식으로 남긴다.

## Sprint Execution Loop
### 1. Current Sprint 확인
- 한 번에 하나의 Sprint만 진행한다.
- 현재 실행 단위는 `docs/05-sprints/sprint-XX/` 아래 문서로 판단한다.
- 새 Sprint를 열 때는 `docs/05-sprints/template/`를 기준으로 문서를 만든다.
- Sprint가 비어 있거나 아직 범위가 고정되지 않았다면 구현하지 않고 범위 확정부터 요구한다.

### 2. Sprint Ready Gate 확인
- 구현 전에 `definition-of-ready` 기준을 점검한다.
- 아래가 비어 있으면 현재 Sprint는 ready가 아니다.
  - `planning.md`
- `planning.md`의 `# QA Plan`이 `Automated Checks`, `AI Agent Interactive QA`, `Browser Automation QA`, `User QA Required`로 구분되지 않았다면 ready가 아니다.
- 범위가 불완전하면 추정 구현 대신 필요한 문서 보강을 우선한다.

### 3. Relevant Docs 읽기
작업 유형에 따라 관련 문서를 좁혀 읽는다.
- UI/레이아웃: 관련 thin contract, 관련 architecture runtime 문서, 필요 시 external screenshot/Figma handoff
- 데이터/등록: 관련 submission 또는 입력 surface thin contract, 관련 domain/runtime 문서
- 인증/보안: 관련 auth thin contract, 관련 security/runtime 문서
- 리뷰: 해당 surface를 소유하는 thin contract, 관련 domain/runtime 문서

### 4. Spec 중심 구현
선택된 spec에서 아래 순서로 내용을 소비한다.
1. `Summary`
2. `Scope` / `Out Of Scope`
3. `Functional Requirements`
4. `Acceptance Criteria`
5. `Required Test Cases`
6. `Manual QA Checklist`
7. `QA Evidence`

추가 해석 규칙:
- `Manual QA Checklist`와 `QA Evidence`는 현재 Sprint의 `planning.md`, `qa.md`에서 `Automated Checks`, `AI Agent Interactive QA`, `Browser Automation QA`, `User QA Required`로 재배치해 해석할 수 있다.

### 5. Verification And Sprint Docs Sync
- spec의 acceptance criteria를 만족해야 한다.
- `docs/00-governance/definition-of-done.md`를 통과해야 한다.
- Sprint의 `planning.md`, `qa.md`, `review.md`는 한국어로 작성한다.
- 단, 명령어, 파일 경로, 코드 식별자, 환경변수, 외부 서비스의 고유 메시지와 에러명은 원문을 유지할 수 있다.
- `planning.md`의 `# QA Plan`은 `Automated Checks`, `AI Agent Interactive QA`, `Browser Automation QA`, `User QA Required`로 나눠 유지한다.
- `qa.md`의 `# Manual QA Result`는 `AI Agent Interactive QA Result`, `Browser Automation QA Evidence`, `User QA Required`로 나눠 기록한다.
- Playwright (`playwright` command) 또는 `agent-browser`를 사용했다면 `qa.md`에 목적, 실행 명령 또는 사용 도구, 확인한 시나리오, 판정, 스크린샷 경로를 남긴다.
- 사용자 직접 QA 항목은 `qa.md`에 사용자 수행 절차, 기대 결과, 현재 상태를 함께 남긴다.
- 완료, 미완료, carry-over, 회고는 현재 Sprint의 `review.md`에 기록하되, `review.md`를 사용자 QA handoff의 기본 위치로 사용하지 않는다.

### 6. Change Handling
- 실행 중 새 요청이나 범위 변경이 생기면 바로 구현하지 않는다.
- 현재 Sprint 범위 안의 작은 변경은 `planning.md`와 관련 source of truth 문서에 직접 반영한다.
- 현재 Sprint 범위 안의 작은 변경은 `docs/06-history/decisions.md`나 `docs/06-history/change-log.md`에 기록하지 않는다.
- 구조, 정책, API/상태 모델, fallback처럼 이유를 남겨야 하는 선택은 `docs/06-history/decisions.md`에 기록한다.
- 요청 추적이 중요하거나 반영 보류/후속 후보를 남겨야 하는 변경은 `docs/06-history/change-log.md`에 기록한다.
- feature identity가 유지되면 기존 spec을 수정하고, 바뀌면 새 spec을 만든다.
- 한 sprint 안에 medium 이상 change가 여러 개 있거나, high-risk change 하나를 별도로 추적해야 하면 `planning.md`에 선택적으로 `# Active Changes`를 두고, `qa.md` / `review.md`에서 같은 change ID로 추적할 수 있다.
- tiny/local fix에는 change card를 만들지 않아도 된다.
- change card는 요약/추적용으로만 쓰고, spec / sprint 본문 / QA evidence를 길게 복제하지 않는다.

원칙: 작은 변경은 source of truth에 흡수하고, 큰 선택만 decision으로 남긴다.

### 7. Autonomous Decision Log
- AI Agent는 문서 경계 안에서 스스로 판단해 진행하되, 비자명한 판단은 `docs/06-history/decisions.md`에 기록한다.
- 아래 상황이면 기록한다.
  - 구현 방식에 여러 유효한 선택지가 있었을 때
  - 문서만으로 세부 구현이 완전히 고정되지 않았을 때
  - 임시 우회책, fallback, staged rollout, mock 전략을 선택했을 때
  - 이후 Sprint나 spec에도 영향을 주는 구조/상태/API/테스트 결정을 했을 때
- 단순 이동, 이름 변경, 기계적 링크 수정은 기록하지 않아도 된다.

### 8. Sensitive Bypass Email Guard
- live bypass 이메일 값은 `.env.local` 또는 배포 환경변수에서만 관리한다.
- 실제 bypass 이메일 값은 tracked code/docs/tests/examples에 직접 쓰지 않는다.
- bypass 관련 tracked 예시는 항상 placeholder(`bypass.user@example.com`, `bypass.named@example.com`)를 사용한다.
- git commit metadata(author/committer email)도 노출 surface로 간주한다. auth/security 작업 전에는 `git config user.email`, `git var GIT_AUTHOR_IDENT`, `git var GIT_COMMITTER_IDENT`를 확인한다.
- repo-local hook path를 사용하는 경우 `git config core.hooksPath .githooks`로 고정하고, bypass denylist guard를 우회한 commit/push를 금지한다.
- CI에서는 secure secret 기반 denylist(`BYPASS_EMAIL_DENYLIST` 등)로 tracked content와 history metadata를 함께 검사한다.

## Documentation Rules
- 문서는 `docs/00-governance/docs-structure.md`의 경로 규칙을 따른다.
- 새 문서는 구조 규칙에 맞는 위치에만 생성한다.
- 사용자의 명시적 요청이 없으면 `README`를 새로 만들지 않는다.
- archive 문서는 수정하지 않고, 새 라이브 문서로 대체한다.

## Git And Completion
- 구현과 문서 sync, 검증이 모두 끝난 뒤에만 commit한다.
- commit 전에 관련 테스트와 문서 링크 검증 결과를 확인한다.
- commit 이후 필요한 경우 `docs/06-history/decisions.md`의 관련 entry에 실제 commit hash를 반영한다.

## Suggested Agent Roles
- 구현: `/prompts:executor`
- 설계/충돌 검토: `/prompts:architect`
- 테스트 전략: `/prompts:test-engineer`
- 완료 검증: `/prompts:verifier`

## Exit Criteria
현재 Sprint의 작업을 종료하려면 아래를 모두 만족해야 한다.
- 선택된 spec acceptance criteria 충족
- 필요한 자동화 테스트와 AI Agent QA를 수행했고, 사용자 직접 QA가 남아 있으면 `qa.md`에 명시적으로 handoff 상태가 기록됨
- `docs/00-governance/definition-of-done.md` 통과
- `docs/05-sprints/sprint-XX/planning.md`가 실제 구현 기준과 일치함
- `docs/05-sprints/sprint-XX/qa.md` 반영
- `docs/05-sprints/sprint-XX/review.md` 반영
- 필요했던 의사결정이 `docs/06-history/decisions.md`에 기록됨
- 범위 변경이 있었다면 `docs/06-history/change-log.md`에 기록됨
