# AI Agent Development Workflow

## Purpose
이 문서는 Nurimap 프로젝트에서 AI Agent가 문서 기반으로 개발을 진행할 때 따라야 할 운영 규칙을 정의한다.
핵심 원칙은 **Plan 기준으로 한 번에 하나의 범위를 선택하고, 해당 Plan의 spec을 직접 source of truth로 삼아 구현하며, 완료 전 검증과 commit을 반드시 마치는 것**이다.

## Mandatory Context
작업 시작 전 반드시 아래를 읽는다.

1. `AGENTS.md`
2. `docs/project-overview.md`
3. `docs/plans.md`
4. `docs/definition-of-done.md`
5. `docs/decisions.md`
6. 현재 작업에 필요한 `docs/architecture/*.md`
7. 현재 Plan에 포함된 `docs/specs/*.md`

## Source Of Truth Hierarchy
문서 충돌이 없다는 가정에서 아래 순서로 해석한다.

1. 현재 Plan에 연결된 `docs/specs/*.md`
2. 관련 `docs/architecture/*.md`
3. `docs/definition-of-done.md`
4. `docs/plans.md`
5. `docs/project-overview.md`
6. `docs/todos.md`

### Conflict Rule
- `docs/plans.md`는 **실행 순서와 묶음**을 정한다.
- 현재 Plan의 `docs/specs/*.md`는 **구현 요구사항과 검증 기준**을 정한다.
- `docs/architecture/*.md`는 **공통 도메인, UI, flow, integration, security 규칙**을 정한다.
- `docs/definition-of-done.md`는 **완료 판정 게이트**다.
- `docs/todos.md`는 **백로그**이며 현재 구현 범위를 확장하는 근거가 아니다.
- spec과 architecture가 정면충돌하면 추정으로 메우지 말고 문서 충돌로 보고한다.

## Plan Execution Order
개발 순서는 spec 파일 번호순이 아니라 아래 Plan 순서를 따른다.

| Plan | Goal | Included Specs |
|---|---|---|
| Plan 1 | 앱 셸과 공통 레이아웃 | `docs/specs/00-app-shell-and-layout.md` |
| Plan 2 | 지도와 목록 탐색 기본 | `docs/specs/06-map-rendering.md`, `docs/specs/07-list-browse.md` |
| Plan 3 | 상세 화면 탐색 | `docs/specs/08-place-detail.md` |
| Plan 4 | 네이버 URL 입력과 정규화 | `docs/specs/02-naver-url-normalization.md` |
| Plan 5 | place 데이터 추출 | `docs/specs/03-place-data-extraction.md` |
| Plan 6 | place 등록과 병합 | `docs/specs/04-place-registration.md`, `docs/specs/05-place-merge.md` |
| Plan 7 | 로컬 통합 검증 | `docs/specs/12-local-integration-qa.md` |
| Plan 8 | 인증과 접근 제어 | `docs/specs/01-auth-email-login-link.md` |
| Plan 9 | 리뷰와 별점 평가 | `docs/specs/10-review.md` |
| Plan 10 | 추천 기능 | `docs/specs/11-recommendation.md` |
| Plan 11 | 배포 전 운영 안정화 | `docs/specs/13-release-hardening.md` |

## Concern-To-Doc Mapping
| Concern | Primary Docs |
|---|---|
| 제품 목표, 비목표, 운영 제약 | `docs/project-overview.md` |
| 현재 무엇을 구현할지 | `docs/plans.md` |
| 도메인 용어, 엔터티, 무결성 | `docs/architecture/domain-model.md` |
| UI 구조, 반응형, 상태 모델 | `docs/architecture/ui-design.md` |
| 사용자 흐름, 실패 UX | `docs/architecture/user-flow.md` |
| 시스템 경계, 책임 분리 | `docs/architecture/system-context.md` |
| Naver/Kakao/Supabase 연동 | `docs/architecture/integrations.md` |
| 인증, 세션, robots, abuse 방지, ops | `docs/architecture/security-and-ops.md` |
| 기능 요구사항, acceptance, TDD, QA | 현재 Plan의 `docs/specs/*.md` |
| 완료 판정 | `docs/definition-of-done.md` |
| 자율 의사결정 로그 | `docs/decisions.md` |
| 미래 범위 | `docs/todos.md` |

## Standard Execution Loop

### 1. Plan 선택
- 한 번에 하나의 Plan만 진행한다.
- 현재 Plan의 goal, expected outcome, included specs를 `docs/plans.md`에서 확인한다.

### 2. Planning Artifact 준비
- Ralph 실행 전에 `.omx/plans/prd-*.md` 와 `.omx/plans/test-spec-*.md`가 준비되어 있어야 한다.
- 이 저장소에는 Plan 1~11용 starter artifact가 이미 생성되어 있다.
- 실행 전에 현재 Plan에 맞춰 내용을 최신화한다.

### 3. Relevant Architecture 읽기
작업 유형에 따라 아키텍처 문서를 좁혀 읽는다.
- UI/레이아웃: `ui-design`, `user-flow`, `system-context`
- 데이터/등록: `domain-model`, `integrations`, `user-flow`
- 인증/보안: `security-and-ops`, `system-context`, `user-flow`

### 4. Spec 중심 구현
현재 spec에서 아래 순서로 내용을 소비한다.
1. `Functional Requirements`
2. `Acceptance Criteria`
3. `TDD Implementation Order`
4. `Required Test Cases`
5. `Manual QA Checklist`
6. `QA Evidence`

### 5. Verification
- spec의 acceptance criteria를 모두 만족해야 한다.
- `docs/definition-of-done.md`의 공통 기준을 통과해야 한다.
- 검증 spec이 있는 경우 추가로 따른다.
  - 통합 검증: `docs/specs/12-local-integration-qa.md`
  - 배포 검증: `docs/specs/13-release-hardening.md`

### 6. Documentation Sync
- 구현 결과가 기존 문서와 어긋나면 관련 문서를 수정한다.
- 후속 작업은 `docs/todos.md` 또는 해당 spec에 기록한다.

### 7. Autonomous Decision Log
- 사용자가 개발 완료 시점까지 간섭하지 않는 전제를 따른다.
- AI Agent는 문서 경계 안에서 스스로 판단해 진행하되, 비자명한 판단은 `docs/decisions.md`에 기록한다.
- 아래 상황이면 기록한다.
  - 구현 방식에 여러 유효한 선택지가 있었을 때
  - 문서만으로 세부 구현이 완전히 고정되지 않았을 때
  - 임시 우회책, fallback, mock, staged rollout을 선택했을 때
  - 이후 Plan에도 영향을 주는 구조/상태/API/테스트 결정을 했을 때
- entry에는 최소한 다음을 포함한다.
  - 날짜
  - 현재 Plan
  - context
  - options considered
  - decision
  - rationale
  - impact
  - revisit trigger
  - related docs
  - related commit
- Plan 종료 전 `docs/decisions.md`의 관련 decision entry에 실제 commit hash를 반영한다.

## React / Frontend Rule
이 저장소의 프론트엔드 구현은 Vite + React + Tailwind CSS + daisyUI를 따른다.
React 컴포넌트, 상태, 렌더링을 건드리는 작업에서는 반드시 `vercel-react-best-practices` 기준을 적용한다.

## Plan 1~7 Sequencing Note
`docs/plans.md`는 사용자에게 보이는 기능을 먼저 만들고 인증을 나중에 붙이도록 정의한다.
따라서 Plan 1~7에서는 목업 데이터와 로컬 검증을 허용하되, Plan 8에서 인증/접근제어를 붙일 수 있는 구조를 남겨야 한다.

## Ralph And Team Usage Policy
- 범위가 넓거나 문서 충돌 가능성이 있으면 먼저 `$plan` 또는 `$ralplan`
- 단일 Plan을 끝까지 밀어붙일 때는 `$ralph`
- UI/서버/QA 등 병렬 작업이 필요하면 `$team`
- 검토 전용 점검은 `/prompts:architect`, `/prompts:test-engineer`, `/prompts:verifier`

## Git Commit Policy
이 프로젝트에서는 **Plan 완료 후 commit 없이 다음 Plan으로 넘어가면 안 된다.**

### Mandatory Rules
- Plan 단위 commit 또는 Plan 내부의 더 작은 atomic commit은 허용한다.
- 단, **현재 Plan의 완료 상태를 대표하는 commit이 최소 1개는 존재해야 다음 Plan을 시작할 수 있다.**
- 작업 중간에 여러 commit을 만들었다면 마지막 검증 뒤에 Plan 완료 상태가 commit history에 반영되어 있어야 한다.
- commit 전에 관련 테스트/검증 결과를 확인한다.
- commit 직후 `git log -1 --stat`로 방금 commit을 확인한다.
- commit hash와 범위는 `/note` 또는 notepad에 남긴다.

### Commit Style
기존 이력은 주로 짧은 한국어 평서/서술형 메시지를 사용한다.
권장 예시:
- `Plan 01 앱 셸과 공통 레이아웃 완료`
- `Plan 06 place 등록과 병합 구현`
- `Plan 08 인증 실패 흐름과 세션 복구 정리`

### Commit Gate Checklist
다음 조건을 모두 만족해야 Plan 완료로 간주한다.
- [ ] 현재 Plan spec acceptance criteria 충족
- [ ] 필요한 자동화 테스트/수동 QA 수행
- [ ] `docs/definition-of-done.md` 통과
- [ ] 관련 문서 sync 완료
- [ ] 필요했던 의사결정이 `docs/decisions.md`에 기록됨
- [ ] `git commit` 완료
- [ ] `git log -1 --stat` 확인
- [ ] commit hash 기록

## Suggested Agent Roles
- 계획 수립: `/prompts:planner`
- 구현: `/prompts:executor`
- 설계/충돌 검토: `/prompts:architect`
- 테스트 전략: `/prompts:test-engineer`
- 커밋 분리/메시지: `/prompts:git-master`
- 완료 검증: `/prompts:verifier`

## Exit Criteria
현재 Plan을 종료하려면 아래를 모두 만족해야 한다.
- spec acceptance criteria 충족
- required test cases 대응 완료
- manual QA checklist 점검 완료
- QA evidence 확보
- definition of done 통과
- commit 완료
- 필요한 decision log 기록 완료
- 다음 Plan으로 넘어갈 준비가 됨
