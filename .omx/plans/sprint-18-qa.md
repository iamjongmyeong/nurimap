# Verification Scope

- Sprint 18의 검증 범위는 **magic link 제거 + email OTP immediate cutover**다.
- 아래 항목이 이번 Sprint verification의 핵심이다.
  - OTP request / verify happy path
  - wrong code / expired code / generic failure
  - resend burst 5회 + cooldown formatting
  - `name_required` / `authenticated` branching 유지
  - refresh / hard refresh / logout 후 재로그인 convergence
  - old `/auth/verify` fallback UX
  - bypass / local auto-login / protected API auth contract regression
- live deployed email verification은 이 문서의 `## User QA Required`에 handoff로 남길 수 있다.

# Automated Checks Result

- 실행 전
- 예정 명령:
  - `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authPolicy.test.ts src/server/authService.test.ts src/App.test.tsx`
  - `pnpm lint`
  - 필요 시 `pnpm build`
- 결과:
  - pending

# Manual QA Result

## AI Agent Interactive QA Result
- 수행 내용:
  - pending
- 결과:
  - pending

## Browser Automation QA Evidence
- 실행 목적:
  - local/preview 환경에서 OTP request / input / resend / failure / old-link fallback / terminal convergence를 확인한다.
- 실행 명령 또는 스크립트:
  - pending
- 확인한 시나리오:
  - pending
- 판정:
  - pending
- 스크린샷 경로:
  - `artifacts/qa/sprint-18/` 예정

## User QA Required
- 사용자 확인 항목:
  - deployed 환경에서 실제 이메일로 OTP 수신 후 로그인되는지 확인
  - resend 이후 이전 코드 처리 UX 확인
  - old magic link 클릭 시 새 OTP 요청으로 복귀하는지 확인
  - hard refresh 후 auth가 terminal state로 수렴하는지 확인
- 기대 결과:
  - live deployed 환경에서도 OTP 인증이 정상 동작하고, legacy link는 안전한 fallback으로 정리된다.
- 상태:
  - pending

# Issues Found

- 없음 (초기화 상태)

# QA Verdict

- pending

# Follow-ups

- live deployed email verification 결과를 사용자 QA handoff로 수집한다.

# Change Verification

## CHG-01 Auth source-of-truth OTP cutover
- Automated:
  - pending
- Manual / Browser:
  - pending
- Evidence:
  - pending
- Verdict:
  - pending

## CHG-02 Server auth boundary immediate cutover
- Automated:
  - pending
- Manual / Browser:
  - pending
- Evidence:
  - pending
- Verdict:
  - pending

## CHG-03 Client auth phase / UI / legacy cleanup
- Automated:
  - pending
- Manual / Browser:
  - pending
- Evidence:
  - pending
- Verdict:
  - pending
