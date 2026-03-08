# Plan: 특정 이메일 1개에 대한 관리자급 인증 우회 + Makefile 로컬 테스트 워크플로

- Date: 2026-03-09
- Mode: direct plan
- Supersedes: `.omx/plans/plan-local-bypass-and-make.md`

## Requirements Summary

사용자 요구사항:
- `<BYPASS_EMAIL>` **1개 이메일만** 인증 링크 클릭 없이 로그인 가능해야 한다.
- 기존에 검토했던 추가 테스트 이메일은 bypass 정책에서 제거한다.
- 이 bypass는 **로컬 전용이 아니라**, 해당 이메일이면 환경에 상관없이 동작 가능한 구조를 목표로 한다.
- 다만 저장소는 public repository이므로, **실제 bypass 이메일 값은 git에 올리지 않는다.**
- `docs/decisions.md` 내용도 이 정책 변경에 맞게 수정해야 한다.
- 앞으로 배포 전에는 로컬에서 먼저 검증한다.
- `Makefile`에 최소한 다음 명령이 있어야 한다:
  - `make dev`
  - `make dev-run`
- 두 명령은 dev server 시작 전에 자동 검증을 수행해야 한다.

## Key Assumption

여기서 “관리자처럼 bypass”는 **권한(role) 상승**이 아니라,
**특정 allowlisted 이메일 1개에 대해 로그인 링크 검증 절차를 생략하는 인증 예외**로 해석한다.
즉, admin UI/권한 모델을 새로 만드는 것이 아니라 auth gate 예외를 만드는 작업이다.

## Decision Drivers
1. public repo이므로 실제 bypass 이메일 값은 코드/문서/Makefile 기본값에 넣으면 안 된다.
2. bypass는 버튼 문구가 아니라 **인증 액션/API 계약**에 붙어야 한다.
3. 배포 환경에서도 동작 가능해야 하므로 local-only guard는 제거해야 한다.
4. 기존 세션/이름 입력/로그아웃/보호 화면 흐름은 최대한 재사용해야 한다.
5. 운영상 추적 가능하도록 bypass 사용 로그는 남겨야 한다.

## Recommended Design

### Chosen approach
**서버 env allowlist 기반 global bypass 메커니즘**

핵심 설계:
- 실제 bypass 이메일 값은 코드에 넣지 않는다.
- server env로만 관리한다.
- 추천 env shape:
  - `AUTH_BYPASS_ENABLED=true|false`
  - `AUTH_BYPASS_EMAILS=<BYPASS_EMAIL>`
- client는 `/api/auth/request-link` 응답의 `mode: "bypass"`를 받아 즉시 `verifyOtp()` 를 수행한다.
- 이후 흐름은 기존과 동일:
  - 세션 생성
  - 이름 없으면 `name_required`
  - 이름 있으면 `authenticated`

## Why this approach

### Option A: 코드에 이메일 하드코딩
- 장점: 간단함
- 단점: public repo에 이메일 노출
- 결론: 부적합

### Option B: 로컬 전용 `.env.local` bypass 유지
- 장점: 노출 위험 낮음
- 단점: 사용자가 원한 “해당 이메일이면 환경과 무관하게 bypass” 요구와 불일치
- 결론: 이번 요구에는 부적합

### Option C: env allowlist 기반 global bypass
- 장점:
  - public repo에 값 안 남김
  - 로컬/배포 모두 같은 구조 사용 가능
  - 버튼명 변경과 무관
  - on/off 가능
- 단점:
  - env 관리 주의 필요
- 결론: 가장 적합

## Scope Changes Required

### 1. Remove previous local-only restriction
현재 로컬-only 우회 가드가 있다면 제거한다.
즉:
- `PUBLIC_APP_URL` 이 localhost일 때만 bypass 허용
이런 조건은 삭제한다.

### 2. Remove second bypass email from local docs/config assumptions
- 기존 추가 테스트 이메일 제거
- bypass allowlist는 1개 이메일만 유지
- 단, 실제 값은 tracked file에 쓰지 않음

### 3. Update decision log
- 기존 local-only bypass decision은 superseded 또는 revised 상태로 정리
- 새 decision은 “public repo에서 값은 비공개, mechanism만 버전관리” 원칙을 반영

## File-Level Implementation Plan

### Server auth layer
Files:
- `src/server/authService.ts`
- `api/_lib/_authService.ts`
- 필요 시 `src/server/opsLogger.ts`
- 필요 시 `api/_lib/_opsLogger.ts`

Tasks:
- bypass env parsing 유지/도입
- local-only gating 제거
- exact email match allowlist 유지
- bypass 로그인 이벤트 운영 로그 기록
- actual email 문자열은 committed source에 넣지 않음

### Client auth layer
Files:
- `src/auth/AuthProvider.tsx`
- 관련 테스트 파일

Tasks:
- `mode: "bypass"` 응답 처리 유지/구현
- 버튼 이름과 무관하게 auth action 경로에서 bypass 동작
- name_required / authenticated 분기 재사용

### Tests
Files:
- `src/server/authService.test.ts`
- `src/auth/AuthFlow.test.tsx`

Tasks:
- allowlisted bypass email success
- non-allowlisted external email invalid_domain 유지
- bypass enabled=false 시 우회 안 됨
- 버튼 문구에 의존하지 않는 테스트 구조 유지

### Makefile
Files:
- `Makefile`

Targets:
- `make check`
- `make dev`
- `make dev-run`

Behavior:
- `make dev`, `make dev-run` 실행 전 자동으로
  - `npm run test:run`
  - `npm run lint`
  - `npm run build`
- 그 다음 localhost dev server 실행

### Local / deployment config guidance
Tracked files:
- 실제 이메일 값 없음

Ignored files / env:
- `.env.local` 에 local bypass email 설정 가능
- Vercel environment variables 에도 동일 key/value 설정 가능
- 실제 이메일 값은 환경변수 UI 또는 ignored file에서만 관리

## Acceptance Criteria
1. bypass email allowlist는 코드가 아니라 env에서만 관리된다.
2. tracked source / docs / Makefile에 실제 bypass 이메일 값이 남지 않는다.
3. bypass 메커니즘은 button label이 아니라 auth action/API 응답 기준으로 동작한다.
4. allowlisted email 1개는 이메일 링크 클릭 없이 로그인된다.
5. non-allowlisted 외부 이메일은 계속 차단된다.
6. 기존 `@nurimedia.co.kr` 로그인 링크 흐름은 유지된다.
7. 기존 추가 테스트 이메일은 bypass 정책에서 제거된다.
8. `make dev`, `make dev-run`은 자동 검증 후 실행된다.
9. `docs/decisions.md`는 새 정책 기준으로 정리된다.
10. 구현 후 code review에서 CRITICAL/HIGH 이슈가 없어야 한다.

## Risks And Mitigations

### Risk 1: bypass email이 실수로 커밋됨
- Mitigation:
  - source/doc/Makefile에 실제 이메일 값 금지
  - env UI / ignored local file only
  - commit 전 diff scan

### Risk 2: bypass가 사실상 영구 백도어가 됨
- Mitigation:
  - `AUTH_BYPASS_ENABLED` 명시 스위치
  - 운영 로그 기록
  - decision 문서에 목적/리스크 명시

### Risk 3: 기존 auth spec과 충돌
- Mitigation:
  - docs/decisions.md에 정책 예외 명시
  - 필요 시 auth spec/security doc wording 업데이트

### Risk 4: button label 변경 시 기능이 깨짐
- Mitigation:
  - UI text가 아닌 `requestLink()`와 API contract 기준 테스트 작성

## Verification Steps
- `npm run test:run`
- `npm run lint`
- `npm run build`
- `make dev` smoke test
- `make dev-run` smoke test
- tracked diff scan for actual bypass email leakage
- code review repeat until no blocking issues

## ADR
### Decision
Use env-managed global bypass for one allowlisted email, while keeping the actual value out of git.

### Drivers
- public repository
- auth-action independence from button label
- reusable auth flow
- local-first verification workflow

### Alternatives Considered
- hardcoded email in source
- local-only bypass
- env-managed global bypass

### Why Chosen
It satisfies the new requirement while still preventing the actual bypass value from being exposed in the public repo.

### Consequences
- bypass can work in deployed environments if env is set
- env hygiene becomes important
- docs/decisions need revision from the previous local-only policy

### Follow-ups
- optional future hardening: separate admin/test-only allowlist with audit visibility
