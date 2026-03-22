# Sprint 18 Execution Task List — Auth Email OTP Immediate Cutover

## Purpose
Sprint 18 planning을 실제 실행 단위로 쪼갠 task list다. 각 task는 **한 번에 하나의 안정 단위**로 끝낼 수 있어야 하며, 다음 task는 이전 task의 acceptance가 충족된 뒤 진행한다.

## Global Execution Rules
- 문서 계약이 바뀌기 전에는 server/client 구현을 시작하지 않는다.
- `src/server/*`와 `api/_lib/*` duplicated boundary는 항상 같은 task window에서 함께 갱신한다.
- 매 단계 종료 시 최소 auth regression test를 돌려 green 상태를 확인한다.
- `/auth/verify` legacy cleanup은 OTP request + verify flow가 먼저 green이 된 뒤 수행한다.
- live deployed email verification은 이 task list의 완료 조건이 아니라 handoff 조건이다.

## Recommended Minimal Verification Cluster Per Step
- `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/server/authPolicy.test.ts src/server/authService.test.ts`
- 필요 시 `pnpm lint`

---
## Frozen Contracts For Execution
- canonical request endpoint: `POST /api/auth/request-otp`
- canonical request body: `{ email, requireBypass? }`
- canonical success response: `{ status: 'success', mode: 'otp', message: '인증 코드를 보냈어요.' }`
- bypass success response: `{ status: 'success', mode: 'bypass', message: '테스트 계정으로 바로 로그인합니다.', tokenHash, verificationType }`
- canonical normal verify path: client-side `supabaseBrowser.auth.verifyOtp({ email, token, type: 'email' })`
- no canonical `verify-link` / `consume-link` route after cutover
- server-side resend storage: `app_metadata.nurimap_auth` (OTP-era bookkeeping only)
- recoverable copy:
  - wrong code: `인증 코드가 올바르지 않아요. 다시 확인해 주세요.`
  - expired code: `인증 코드가 만료됐어요.\n새 코드를 받아주세요.`
  - invalidated code: `새 코드가 발급됐어요.\n새 코드를 입력해 주세요.`
  - generic: `인증에 실패했어요. 새 코드를 받아주세요.`
- old-link fallback:
  - surface: `auth_failure`
  - message: `이 로그인 링크는 더 이상 사용할 수 없어요.\n이메일로 인증 코드를 다시 받아주세요.`
  - primary CTA: `새 코드 받기` -> `auth_required` with query email prefilled if present, no auto-send
  - secondary CTA: `이메일 다시 입력` -> blank `auth_required`

---

## T1. Auth source-of-truth를 OTP 기준으로 고정
**Goal**
- implementation 전에 canonical contract를 OTP 기준으로 바꾼다.

**Primary files**
- `docs/03-specs/05-auth-email-login-link.md`
- `docs/05-sprints/sprint-18/planning.md`

**Subtasks**
- spec title/summary/scope를 OTP 기준으로 교체
- functional requirements / acceptance / test cases를 OTP 기준으로 재작성
- old `/auth/verify`를 fallback-only로 정의
- planning과 spec 간 충돌 제거

**Acceptance**
- spec만 읽어도 executor가 OTP flow를 구현할 수 있다.
- magic-link success path가 canonical contract로 남아 있지 않다.

**Suggested role**
- planner/executor (docs-first)

---

## T2. Related docs sync draft 작성
**Goal**
- user-flow / design / architecture가 새 spec과 직접 충돌하지 않게 맞춘다.

**Primary files**
- `docs/01-product/user-flows/auth-and-name-entry.md`
- `docs/04-design/auth-and-name-entry.md`
- `docs/02-architecture/security-and-ops.md`
- `docs/02-architecture/system-runtime.md`

**Subtasks**
- user-flow를 링크 클릭 기반에서 OTP 입력 기반으로 전환
- design thin contract에서 `auth_link_sent` / verify-link 서술 제거
- security-and-ops의 Login Link Policy를 Email OTP Policy로 치환
- runtime의 canonical auth entry / auth phases / async substate를 OTP 기준으로 업데이트

**Acceptance**
- selected spec, user-flow, design, architecture 사이에 직접 충돌하는 auth 문장이 없다.
- `/auth/verify`는 login success path가 아니라 fallback/legacy entry로만 설명된다.

**Suggested role**
- writer/executor

---

## T3. Server auth policy 모델을 OTP용으로 단순화
**Goal**
- nonce/token-hash 중심 상태를 제거하고 OTP request policy 중심 상태로 전환한다.

**Primary files**
- `src/server/authPolicy.ts`
- `src/server/authPolicy.test.ts`
- `api/_lib/_authPolicy.ts`

**Subtasks**
- OTP 기준 상태 필드 정의
- burst/cooldown policy 유지
- old nonce lifecycle helper 삭제
- 테스트를 새 policy contract로 전환

**Acceptance**
- `active_nonce`, `active_token_hash`, `last_consumed_nonce`가 canonical server policy에서 사라진다.
- cooldown/burst tests가 green이다.

**Suggested role**
- executor

---

## T4. Server auth service / route contract를 request-otp 중심으로 교체
**Goal**
- auth request route와 service가 실제 동작 이름/책임과 일치하게 만든다.

**Primary files**
- `src/server/authService.ts`
- `src/server/authService.test.ts`
- `api/auth/request-otp.ts` (new)
- `api/auth/request-link.ts` (remove/redirect decision)
- `api/_lib/_authService.ts`

**Subtasks**
- `requestLoginLink` 대체 flow 추가
- `POST /api/auth/request-otp` route naming과 response payload 고정
- normal verify는 client-side flow로 두고 server verify route를 만들지 않음
- bypass path 유지
- ops logging / delivery failure contract 유지

**Acceptance**
- `generateLink({ type: 'magiclink' })` 기반 canonical path가 제거된다.
- request route naming이 동작과 일치한다.
- server tests가 green이다.

**Suggested role**
- executor

---

## T5. Client auth context와 phase 모델 전환
**Goal**
- auth state machine의 타입과 public contract를 OTP 기준으로 바꾼다.

**Primary files**
- `src/auth/authContext.ts`
- 관련 tests/mocks

**Subtasks**
- `auth_link_sent` -> `otp_required` 전환
- request action naming 정리 (`requestLink` vs `requestOtp`)
- context contract를 새 flow 기준으로 맞춤

**Acceptance**
- client public auth types가 magic-link semantics를 강하게 품고 있지 않다.
- downstream UI가 새 phase model로 컴파일 가능하다.

**Suggested role**
- executor

---

## T6. AuthProvider request/verify flow를 OTP 입력 기반으로 교체
**Goal**
- 실제 로그인 진입 경로를 OTP 기준으로 전환한다.

**Primary files**
- `src/auth/AuthProvider.tsx`
- `src/auth/AuthFlow.test.tsx`
- `src/auth/authVerification.ts`
- `src/auth/authVerification.test.ts`

**Subtasks**
- request OTP -> otp_required flow 구현
- verifyOtp with email/token path 구현
- wrong/expired/generic failure handling
- resend / email reset flow 구현
- refresh/hard refresh terminal convergence 유지

**Acceptance**
- 이메일 요청 후 OTP 입력 UI가 보인다.
- 올바른 OTP는 `authenticated|name_required`로 이동한다.
- wrong/expired code는 recovery 가능한 auth state로 수렴한다.

**Suggested role**
- executor

---

## T7. bypass / local auto-login / test harness regression 보호
**Goal**
- auth mode 전환 중 local/dev convenience와 bypass path가 깨지지 않게 고정한다.

**Primary files**
- `src/auth/AuthProvider.tsx`
- `src/auth/testAuthState.ts`
- 관련 tests

**Subtasks**
- bypass 즉시 로그인 semantics 재검증
- local auto-login guard 유지
- auth test state helper가 새 phase model과 충돌하지 않게 수정

**Acceptance**
- bypass/local auth convenience가 OTP 전환 후에도 예측 가능하게 동작한다.
- 관련 regression tests가 green이다.

**Suggested role**
- executor

---

## T8. Legacy `/auth/verify` / root query를 fallback-only로 축소
**Goal**
- old links가 더 이상 로그인 성공을 만들지 않도록 정리한다.

**Primary files**
- `src/auth/AuthProvider.tsx`
- route bridge/auth entry files
- browser QA scripts if needed

**Subtasks**
- verify query parsing 제거 또는 fallback-only 축소
- old route 진입 시 query를 정리한 뒤 `auth_failure` surface로 수렴하는 UX 구현
- `새 코드 받기` email prefill / no-auto-send contract 반영
- blank screen/404 방지

**Acceptance**
- old link entry는 성공 login path가 아니다.
- fallback UX는 사용자를 새 OTP 요청으로 복귀시킨다.

**Suggested role**
- executor

---

## T9. Dead code / route / API cleanup
**Goal**
- legacy verify/consume artifacts를 실제로 제거한다.

**Primary files**
- `api/auth/verify-link.ts`
- `api/auth/consume-link.ts`
- `src/server/authService.ts`
- `api/_lib/_authService.ts`
- tests/docs references

**Subtasks**
- unused helper/route 삭제
- tests/docs/artifacts references 정리
- misleading copy 제거

**Acceptance**
- canonical runtime에서 `verify-link` / `consume-link` dependency가 사라진다.
- search 결과에 legacy auth path가 intentional fallback 외에는 거의 남지 않는다.

**Suggested role**
- executor

---

## T10. OTP regression suite와 Sprint QA evidence 준비
**Goal**
- AI agent가 autonomous completion 전까지 확보해야 할 verification 자산을 정리한다.

**Primary files**
- `docs/05-sprints/sprint-18/qa.md`
- `docs/05-sprints/sprint-18/review.md`
- auth tests
- browser QA scripts / artifacts

**Subtasks**
- automated test command 확정
- browser QA 시나리오/증빙 경로 채우기
- User QA handoff 문장 구체화
- review skeleton에 completed/not-completed/carry-over 반영 준비

**Acceptance**
- qa.md만 읽어도 남은 자동화/브라우저/사용자 QA를 바로 수행할 수 있다.
- live deployed email verification이 handoff로 명확히 분리된다.

**Suggested role**
- verifier / writer

---

## Final Gate Before Claiming Sprint Completion
- selected spec + user-flow + design + architecture auth docs sync 완료
- server/client auth tests green
- browser QA evidence 확보
- `docs/05-sprints/sprint-18/qa.md` 반영
- `docs/05-sprints/sprint-18/review.md` 반영
- live deployed email verification만 `User QA Required`로 남음
