# Task Statement
bypass 정책이 코드에 들어간 시점부터 현재까지 모든 git log / git diff / git object history를 분석해 실제 bypass 이메일 노출 여부를 확인하고, 노출이 확인되면 history remediation 및 재발 방지 계획을 수립한다.

# Desired Outcome
- 실제 bypass 이메일이 code diff, tracked file history, commit metadata 어디에 노출되었는지 정확히 구분한다.
- pushed history 노출이 있으면 정리 대상 범위와 처리 순서를 포함한 실행 계획을 만든다.
- 앞으로 env file 외의 어떤 git-tracked surface에도 실제 bypass 이메일이 들어가지 않도록 예방 통제를 정의한다.

# Known Facts / Evidence
- bypass 정책 도입 commit은 `330fc1b` (`전역 bypass 로그인과 Makefile 개발 흐름 추가`)로 확인됐다.
- `git log --all -G` 및 `git grep $(git rev-list --all)` 기준으로 실제 bypass 이메일 문자열은 code patch / reachable blobs에서 발견되지 않았다.
- unreachable git blobs까지 exact string / username fragment 검색 결과 매치가 없었다.
- 그러나 `git log 330fc1b^..origin/main --format='%h %ae %s'` 기준으로 pushed commit 23개 모두 author email이 실제 bypass 이메일과 동일했다.
- repo 전체 히스토리도 동일 author email을 사용하고 있다.

# Constraints
- 실제 bypass 이메일 문자열은 새 tracked 문서/코드에 다시 적지 않는다.
- 계획만 수립한다; history rewrite나 force-push는 아직 실행하지 않는다.
- 공식 git history remediation은 협업/remote impact를 고려해야 한다.

# Unknowns / Open Questions
- GitHub 외에 포크, CI logs, release artifacts, email notifications 등에 author metadata가 추가 복제되었는지.
- remote에 보호 브랜치 / PR references / tags / release notes가 있어 rewrite 영향이 얼마나 큰지.
- 전체 repo history까지 rewrite할지, bypass 도입 시점 이후만 rewrite할지.

# Likely Codebase Touchpoints
- `.git` history / remote refs
- docs/06-history/decisions.md
- src/auth/AuthFlow.test.tsx
- src/auth/AuthProvider.tsx
- src/auth/authVerification.ts
- repo policy files (`AGENTS.md`, docs governance) for preventive guardrails
