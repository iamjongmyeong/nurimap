# Test Spec - Docs Writing Durability

## Verification Objectives
1. governance 문서에 durable writing rules가 명시돼 있다.
2. user-flow는 사용자 여정/기대 결과 중심으로 읽힌다.
3. architecture는 concern/경계/정책 중심으로 읽힌다.
4. spec은 requirements/acceptance 중심으로 읽히고, 중복 설명이 줄어든다.
5. live docs에서 retired 경로 stale ref가 없다.
6. target docs는 `git diff --check`를 통과한다.

## Heuristic Checks
- current-shape / current-filename / current-sprint 고정 표현이 줄었는가
- “무엇을 정의하지 않는가”가 필요한 문서에 명시되어 있는가
- user-flow/design/architecture/spec 사이 책임이 더 잘 분리되었는가
