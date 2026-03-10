# Auth And Name Entry Design

이 문서는 로그인, 인증 실패, 이름 입력 화면의 UI 구조와 상호작용 규칙을 정의한다.

관련 문서:
- [Auth And Name Entry User Flow](../01-product/user-flows/auth-and-name-entry.md)
- [Auth Email Login Link Spec](../03-specs/05-auth-email-login-link.md)
- [Design Foundations](./foundations.md)

## Screen Set
- `auth_required`
- `auth_link_sent`
- `auth_failure`
- `verifying`
- `name_required`

## Interaction Notes
- 인증 요청 단계의 실패는 로그인 화면 안에서 inline error로 표시한다.
- 인증 링크 검증 실패는 전용 인증 실패 화면으로 표시한다.
- 인증 실패 화면에는 `새 로그인 링크 받기`와 `이메일 다시 입력` CTA를 함께 둔다.
- 인증 에러는 브라우저 기본 `alert`로 표시하지 않는다.
- `재요청 cooldown` 실패 시 남은 대기 시간을 함께 표시한다.

## Name Capture Screen
- 이름 입력 화면은 단일 input field 하나만 사용한다.
- 이름 input은 빈 값 제출을 허용하지 않는다.
