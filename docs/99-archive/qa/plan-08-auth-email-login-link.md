> Status: Archived
> Archived on: 2026-03-09
> Reason: Historical QA report from the legacy Plan workflow.
> Replaced by: No direct replacement. Future Sprint verification records belong in `docs/04-sprints/sprint-XX/qa.md` and `review.md`.
>
> 이 문서는 더 이상 현재 기준 문서가 아니다.

# Plan 08 Manual QA Report

- Date: 2026-03-08
- Plan: Plan 08 인증과 접근 제어
- Source spec: `docs/03-specs/05-auth-email-login-link.md`

## Environment
- Local dev server: `npm run dev -- --host 127.0.0.1`
- Desktop viewport: `1440x960`
- Visual QA method: Playwright runtime screenshots + AI visual inspection
- Local auth QA mode: `?auth_test_state=...` (development-only override)

## Runtime Evidence
```json
{
  "invalidDomainMessage": "허용된 회사 이메일만 사용할 수 있어요.",
  "failureVisible": true,
  "returnedToLogin": true,
  "authenticatedAfterName": true,
  "logoutReturnedToLogin": true
}
```

## Automated Evidence
- `npm run test:run` 결과 86개 테스트 통과
- 관련 핵심 자동 검증:
  - 허용 도메인/비허용 도메인 처리
  - cooldown / 일일 제한 메시지
  - 요청 중 버튼 비활성화
  - 검증 중 처리 상태
  - 인증 실패 화면 CTA
  - 이름 입력 1글자 이상 검증
  - 이름 저장 후 앱 진입
  - 로그아웃 후 보호 화면 차단
  - 링크 만료/사용됨/무효화 정책 helper 검증

## Manual QA Checklist
- [pass] 허용 도메인이 아닌 이메일 입력 시 inline error가 보이고 입력값이 유지된다.
- [pass] 인증 실패 화면에서 `새 로그인 링크 받기`, `이메일 다시 입력` 흐름을 확인했다.
- [pass] 이름이 없는 사용자는 이름 입력 화면으로 이동하고, 1글자 이상 저장 후 앱으로 진입한다.
- [pass] 로그아웃 후 보호 화면 접근이 막힌다.
- [auto-pass] 요청 중 버튼 비활성화, 이름 저장 중 버튼 비활성화는 자동 테스트로 검증했다.
- [auto-pass] cooldown / 일일 제한 / 만료 / 사용 완료 / 무효화 정책은 자동 테스트와 auth policy unit test로 검증했다.

## Visual Notes
- `invalid-domain.png`에서 허용 도메인이 아닌 이메일 입력 시 inline error가 표시되는 것을 확인했다.
- `auth-failure.png`에서 인증 실패 화면과 CTA를 확인했고, `이메일 다시 입력`으로 로그인 화면 복귀를 확인했다.
- `name-capture.png`에서 이름 입력 화면 진입 후 저장하면 앱 셸로 진입하는 것을 확인했다.
- `authenticated-shell.png`에서 인증된 사용자가 바로 앱 셸을 보는 것을 확인했다.
- `post-logout.png`에서 로그아웃 후 다시 로그인 화면으로 돌아가는 것을 확인했다.

## Limitations
- 현재 `RESEND_FROM_EMAIL=onboarding@resend.dev`를 사용 중이라 Resend 테스트 도메인 정책상 실제 이메일 inbox 클릭 검증은 제한적이다.
- 따라서 실제 메일 전달과 inbox 클릭은 verified domain 전환 후 한 번 더 수행하는 것이 바람직하다.
- 대신 현재 단계에서는 server-side auth policy 테스트, 인증 화면 상태 테스트, local dev QA screen capture로 보완했다.

## Supporting Files
- `artifacts/qa/plan-08/invalid-domain.png`
- `artifacts/qa/plan-08/auth-failure.png`
- `artifacts/qa/plan-08/name-capture.png`
- `artifacts/qa/plan-08/authenticated-shell.png`
- `artifacts/qa/plan-08/post-logout.png`

## Conclusion
Plan 08의 인증 화면/실패 화면/이름 입력/로그아웃/보호 접근 제어는 자동 테스트와 수동 QA evidence 기준으로 검증되었다. 실제 이메일 inbox 클릭 검증은 verified domain 전환 후 보강하면 된다.
