# Auth And Name Entry Design

이 문서는 로그인, 링크 발송 완료, 인증 실패, 누리맵에서 사용할 이름을 입력해주세요. 화면의 UI 구조와 상호작용 규칙을 정의한다.

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

## Shared Layout
- 로그인 화면과 로그인 링크 발송 완료 화면은 모바일과 데스크톱 모두 같은 가운데 정렬 레이아웃을 사용한다.
- auth 컨테이너는 단일 컴포넌트로 유지하고 장식용 shadow를 사용하지 않는다.
- `auth_failure`, `verifying`, `name_required`도 같은 auth surface 계열로 읽히도록 일관된 정렬과 폭을 유지한다.

## Login Screen
- 브랜드 영역은 누리맵 icon asset + `누리맵` wordmark 조합을 사용한다.
- 브랜드 wordmark에는 Rota를 사용하지 않는다.
- 안내 문구는 `누리미디어에서 사용 중인 이메일을 입력해주세요.`를 사용한다.
- 허용 도메인 설명용 보조 문구를 노출하지 않는다.
- 이메일 label은 시각적으로 숨기고 접근성용으로만 유지한다.
- 이메일 input placeholder는 `example@nurimedia.co.kr`다.
- 로그인 링크 요청 버튼 텍스트는 `로그인 링크 전송`이다.
- 이메일이 비어 있거나 이메일 형식이 유효하지 않으면 버튼은 비활성화되고 `opacity: 0.5`, `cursor: not-allowed` 상태를 사용한다.
- burst 5회까지는 같은 이메일에 대해 대기 시간 없이 재전송할 수 있다.
- cooldown에 진입하면 남은 시간 카피는 `MM분 SS초 후에 다시 시도해주세요.` 형식을 사용하고, 분이 0이면 초만 표시한다.

## Link Sent State
- 로그인 링크 요청 성공 후에는 별도 페이지로 이동하지 않고 같은 auth 컴포넌트 안에서 발송 안내를 표시한다.
- 발송 안내 문구는 `로그인 링크를 보냈어요. 메일함을 확인해 주세요.`를 사용한다.
- 발송 안내 아래에는 사용자가 입력한 이메일 주소를 읽기 전용 field처럼 보여준다.
- CTA는 `로그인 링크 다시 전송`을 사용한다.

## Failure And Verifying Screens
- 인증 요청 단계의 실패는 로그인 화면 안에서 inline error로 표시한다.
- 인증 링크 검증 실패는 전용 인증 실패 화면으로 표시한다.
- 인증 실패 화면에는 `새 로그인 링크 받기`와 `이메일 다시 입력` CTA를 함께 둔다.
- 인증 실패 이유는 raw code(`expired`, `used`, `invalidated`)를 그대로 보여주지 않고, `로그인 링크가 만료됐어요. 새 로그인 링크를 받아주세요.`, `이미 사용한 로그인 링크예요. 새 로그인 링크를 받아주세요.`, `최근에 보낸 로그인 링크만 사용할 수 있어요. 최신 이메일의 링크를 열어주세요.` 중 하나로 노출한다.
- 인증 에러는 브라우저 기본 `alert`로 표시하지 않는다. generic failure 문구는 `인증에 실패했어요. 로그인 링크를 다시 받아주세요.`를 사용한다.
- `재요청 cooldown` 실패 시 남은 대기 시간을 함께 표시한다.
- `verifying` 화면은 transient 상태여야 하며, refresh 또는 예외 상황에서도 무한 정지 상태로 남지 않아야 한다.
- canonical auth verify entry는 `/auth/verify`를 사용한다.

## Name Capture Screen
- 누리맵에서 사용할 이름을 입력해주세요. 화면은 단일 input field 하나만 사용한다.
- 이름 input은 빈 값 제출을 허용하지 않는다.
- 이름 input placeholder는 `김누리`를 사용한다.
- 이름 input은 최대 10글자까지 허용한다.
- 10글자보다 긴 입력은 타이핑 단계에서 더 이상 입력되지 않아야 하고, 붙여넣기된 초과분은 잘라낸다.
- 저장 CTA는 `저장`을 사용한다.
