# Plan: Auth failure 리디자인 재적용 + 문서 동기화

## Requirements Summary
- 현재 인증 실패 화면 구현은 `src/auth/AuthProvider.tsx:286-307`의 구형 레이아웃(상단 `NURIMAP LOGIN`, 가로 CTA 2개)을 사용한다.
- 사용자가 되살리고 싶은 리디자인 기준은 revert된 커밋 `d2b4ef0`에 남아 있다. 이 커밋은 인증 실패 화면을 brand-first 레이아웃, 이모지 제목, 세로 CTA 구성으로 바꾸고 관련 테스트를 함께 갱신했다 (`git show d2b4ef0 -- src/auth/AuthProvider.tsx src/auth/AuthFlow.test.tsx`).
- 이 작업은 새 sprint 폴더를 만드는 것이 아니라, 이미 존재하는 live source-of-truth와 현재 코드/테스트를 리디자인 버전으로 다시 맞추는 계획이다.
- 현재 source-of-truth 문서는 여전히 구형 auth failure contract를 적고 있다: spec `docs/03-specs/05-auth-email-login-link.md:41-45,102-104,224`, design `docs/04-design/auth-and-name-entry.md:42-45`, user-flow `docs/01-product/user-flows/auth-and-name-entry.md:37-40,51-52`, sprint-17 planning `docs/05-sprints/sprint-17/planning.md:22-26,130,157`, review `docs/05-sprints/sprint-17/review.md:15-19`, qa `docs/05-sprints/sprint-17/qa.md:49-55,115-116`.

## Assumptions
- “리디자인 버전”은 `d2b4ef0`의 **auth failure 화면 계약**을 다시 채택하는 뜻으로 해석한다: brand-first 구조, `인증에 실패했어요 🥲` 제목, 세로 CTA, 본문 전용 body 텍스트 블록.
- 다만 이후 이미 확정된 최신 변경(40px input/버튼 높이, 공통 AuthSurface 내부 padding 제거, cooldown countdown)은 유지한다. 즉 `d2b4ef0`를 통째로 되돌리는 것이 아니라 auth failure slice만 선택적으로 재적용한다.
- 새 sprint 폴더는 만들지 않는다. 대신 **현재 sprint-17 문서 중 auth failure 계약을 적는 부분은 live source-of-truth 충돌을 막기 위해 함께 수정**한다.

## Acceptance Criteria
1. `auth_failure` 상태에서 인증 실패 화면은 `d2b4ef0` 기준의 리디자인 레이아웃으로 보인다.
2. 실패 화면 DOM/스타일 계약은 테스트 가능해야 한다:
   - `auth-failure-screen`, `auth-failure-title`, `auth-failure-body` 같은 안정적인 selector/test id를 가진다.
   - title/CTA 구조가 현재 가로 2버튼 레이아웃이 아니라 세로 구성으로 바뀐다.
3. 실패 화면 카피/CTA는 리디자인 버전과 문서가 일치한다. 최소한 아래 항목이 코드/문서/테스트에서 동일해야 한다:
   - 제목 텍스트
   - primary CTA 라벨
   - secondary CTA 라벨
   - `expired` / `used` / `invalidated` / generic failure 문구
4. `이메일 다시 입력` CTA는 여전히 로그인 입력 화면으로 복귀한다.
5. 현재 유지 중인 최신 auth shell 변경은 깨지지 않는다:
   - 40px input/버튼 높이 (`src/auth/AuthProvider.tsx:231-280`)
   - cooldown countdown 동작 (`src/auth/AuthProvider.tsx:187-198, 376-423, 718-733`)
   - canonical/legacy verify failure 흐름 테스트 (`src/auth/AuthFlow.test.tsx:559-580,773-790,971-980`)
6. live docs와 current sprint docs 사이에 auth failure 계약 충돌이 남지 않는다.

## Implementation Steps
1. **리디자인 계약 확정**
   - `d2b4ef0`의 auth failure diff를 기준으로 재적용 범위를 분리한다.
   - 유지할 최신 변경과 재적용할 과거 변경을 분리한다:
     - 유지: `AuthSurface` 무padding wrapper (`src/auth/AuthProvider.tsx:163-168`), 40px controls (`src/auth/AuthProvider.tsx:244-280`), cooldown logic (`src/auth/AuthProvider.tsx:189-198, 376-423, 718-733`).
     - 재적용 대상: `AuthFailureScreen` 블록 (`src/auth/AuthProvider.tsx:286-307`)과 필요한 failure copy mapping (`src/auth/AuthProvider.tsx:18-22`).

2. **코드 반영**
   - `src/auth/AuthProvider.tsx`
     - `AuthFailureScreen`를 `d2b4ef0` 스타일의 brand-first/stacked-CTA 구조로 교체한다.
     - failure screen 전용 class/test id를 다시 도입한다.
     - `VERIFY_FAILURE_MESSAGES`를 리디자인 버전 문구로 조정할지 결정하고 반영한다.
     - generic failure가 `src/auth/authVerification.ts:1-3`와 일치하는지 함께 정리한다.
   - 필요 시 `src/auth/authVerification.ts`
     - generic failure 문구가 리디자인 문서 계약과 다르면 통일한다.

3. **테스트 동기화**
   - `src/auth/AuthFlow.test.tsx`
     - 현재 failure screen CTA 테스트 (`971-980`)를 리디자인 구조 검증 테스트로 교체/확장한다.
     - stale/invalidated verify 흐름 테스트 (`559-580`, `773-790`)가 새로운 문구를 기대하도록 갱신한다.
     - 필요 시 test ids, 버튼 라벨, multiline body 렌더링을 검증한다.
   - 필요 시 auth failure 관련 browser QA evidence 경로만 재생성 계획을 추가한다.

4. **문서 동기화**
   - live source-of-truth 갱신:
     - `docs/03-specs/05-auth-email-login-link.md`
     - `docs/04-design/auth-and-name-entry.md`
     - `docs/01-product/user-flows/auth-and-name-entry.md`
   - 현재 sprint 문서 sync (새 폴더 생성 없이 기존 파일 수정):
     - `docs/05-sprints/sprint-17/planning.md`
     - `docs/05-sprints/sprint-17/review.md`
     - `docs/05-sprints/sprint-17/qa.md`
   - 문서에는 레이아웃/CTA/문구/QA expectation만 바꾸고, mail-link policy나 verify-route behavior 등 비관련 auth 정책은 손대지 않는다.

5. **의사결정 기록**
   - `docs/06-history/decisions.md`에 짧은 entry를 추가한다.
   - 내용: `d2b4ef0`의 auth failure redesign을 왜 revert 이후 다시 채택했는지, 어떤 최신 변경은 유지했고 어떤 failure contract를 새 표준으로 삼았는지 기록한다.

## Risks and Mitigations
- **리스크: d2b4ef0 전체를 다시 가져오면 최신 input sizing/padding 수정이 덮일 수 있음**
  - 대응: cherry-pick/revert 대신 `AuthFailureScreen` slice만 수동 포팅한다.
- **리스크: 카피 변경이 단순 UI를 넘어 behavior contract 변경이 됨**
  - 대응: copy를 바꾸는 경우 spec + design + user-flow + sprint-17 문서를 함께 수정하고, 테스트 assertion도 동일 문자열로 맞춘다.
- **리스크: generic failure 문구가 이미 코드/문서 사이에서 어긋나 있음** (`src/auth/authVerification.ts:1-3` vs `docs/03-specs/05-auth-email-login-link.md:224`)
  - 대응: 이번 작업에서 하나의 canonical 문구로 통일한다.
- **리스크: 기존 browser QA evidence 스크린샷이 구형 화면 기준일 수 있음**
  - 대응: 구현 후 failure screen screenshot evidence를 재생성하고 `qa.md`에 최신 기준을 적는다.

## Verification Steps
- Diagnostics
  - `lsp_diagnostics` for `src/auth/AuthProvider.tsx`, `src/auth/AuthFlow.test.tsx`, and any doc-adjacent TS files touched.
- Focused tests
  - `pnpm exec vitest run src/auth/AuthFlow.test.tsx`
- Broader auth regression
  - `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authService.test.ts src/server/authPolicy.test.ts`
- Build
  - `pnpm build`
- Manual/browser QA
  - verify `expired`, `used`, `invalidated`, generic timeout failure each land on the redesigned failure screen.
  - verify `이메일 다시 입력` returns to the login form and `새 링크 받기` starts the retry path.
  - capture updated screenshots for the redesigned failure states.

## Notes
- 이 계획은 실행 전용이 아니라, 리디자인 재적용 범위와 문서 sync 경계를 명확히 하기 위한 direct plan이다.
- 구현 단계에서는 **revert된 d2b4ef0 전체를 복원하지 말고**, 현재 main 위에 필요한 auth failure UI/문서 조각만 선택 적용하는 것이 핵심이다.
