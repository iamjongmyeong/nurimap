# Auth And Name Entry

## Scope
- 회사 이메일 OTP 요청
- OTP 입력 및 검증
- 인증 실패 처리
- 이름 입력 온보딩
- 세션 복구
- OTP 재전송 정책
- anonymous browse 상태에서 시작되는 write-intent login handoff

## Authentication Flow
1. 사용자가 웹사이트에 접속한다.
2. 사용자는 로그인하지 않아도 browse/detail을 둘러볼 수 있고, explicit `로그인` control을 누르거나 anonymous write 시도에서 auth flow를 시작할 수 있다.
3. anonymous 사용자가 `장소 추가`를 시도하면 browser-native confirm `누가 추가했는지 알 수 있도록 로그인해주세요.`를 본다.
4. anonymous 사용자가 `평가 남기기`를 시도하면 browser-native confirm `누가 등록했는지 알 수 있도록 로그인해주세요.`를 본다.
5. 사용자가 confirm을 취소하면 현재 browse/detail 맥락에 그대로 머문다.
6. 사용자가 confirm을 수락하거나 explicit `로그인` control을 누르면 `/login`으로 이동해 로그인 화면에서 회사 이메일을 입력한다.
7. 시스템이 허용 도메인인지 확인하고, 필요 시 운영자가 설정한 exact allowlist 이메일 예외를 함께 확인한다.
8. 허용 도메인이 아니거나 OTP를 요청할 수 없는 상태면 로그인 화면에 그대로 머물며 실패 이유를 확인한다.
9. 요청이 가능하면 이메일로 OTP가 발송되고, 사용자는 같은 auth 흐름 안에서 OTP 입력 상태를 본다.
10. 사용자가 이메일로 받은 6자리 OTP를 입력한다.
11. OTP가 유효하면 시스템은 사용자 이름 존재 여부를 확인한다.
12. OTP가 잘못되었거나 만료되었거나 더 새 OTP 발급으로 무효화되었으면 사용자는 같은 auth 흐름 안에서 다시 시도하거나 새 OTP를 요청한다.
13. 예상하지 못한 인증 오류가 발생하면 사용자는 인증 실패 화면을 본다.
14. 이름이 비어 있으면 이름 입력 화면으로 이동한다.
15. 이름 입력이 완료되면 explicit login이었다면 현재 browse/detail로, anonymous write intent였다면 원래 add-place/add-rating 시도로 복귀한다.
16. 사용자가 pending intent 없이 `/login`을 직접 열어 로그인했다면 홈(`/`)으로 이동한다.
17. 같은 브라우저 재방문 시 저장 세션이 유효하면 로그인 화면을 건너뛴다.
18. 로그아웃하면 사용자는 blocking login 화면이 아니라 anonymous browse/detail 상태로 돌아간다.
19. OTP 검증 중 예외가 생겨도 사용자는 무한 대기 상태에 머물지 않고, 다시 시도 가능한 상태로 돌아갈 수 있어야 한다.

## Rules
- 인증의 canonical 성공 경로는 이메일 OTP 입력이다.
- 허용 도메인 밖 이메일이라도 운영자가 별도 allowlist로 지정한 exact 이메일은 canonical OTP 경로에 진입할 수 있다.
- OTP verify와 세션 채택은 backend-mediated flow로 동작하며, frontend는 app API를 통해 auth state를 확인한다.
- `auth_required`는 로그인 전 상태를 뜻하지만 browse/detail read 자체를 막지 않는다.
- anonymous browse/detail은 허용되지만, write intent는 로그인 완료 전까지 usable surface로 열리지 않는다.
- anonymous write intent는 browser-native confirm을 거쳐 `/login`의 기존 OTP flow로 이어진다.
- OTP는 제한된 시간 동안만 유효해야 한다.
- 새 OTP를 발급하면 이전 미사용 OTP는 더 이상 사용할 수 없어야 한다.
- OTP는 한 번 성공적으로 사용하면 다시 사용할 수 없다.
- 반복 재요청에는 재전송 제한과 cooldown 정책이 적용된다.
- `비허용 도메인`, 재요청 제한 같은 요청 단계 문제는 로그인 화면 또는 OTP 요청 흐름 안에서 처리한다.
- 잘못된 코드, 만료, 새 코드 발급으로 인한 무효화 같은 recoverable 문제는 OTP 입력 흐름 안에서 처리할 수 있어야 한다.
- 인증 실패 화면에서는 사용자가 앱 메인 화면으로 우회 진입할 수 없어야 한다.
- backend-issued session cookie가 유효하면 사용자는 끊기지 않는 세션 복원 결과를 보게 되어야 한다.
- 이름 입력 완료 뒤에는 explicit login이면 browse/detail로, anonymous write intent면 원래 write surface로 돌아가야 한다.
- direct `/login` with no pending intent는 로그인 완료 뒤 홈(`/`)으로 돌아가야 한다.
- 로그아웃 후에는 browse/detail이 유지되고, protected write만 다시 로그인 안내를 거친다.
- 인증 실패 이유는 시스템 내부 코드가 아니라 사람이 이해할 수 있는 설명으로 보여야 한다.

## Name Capture Flow
1. 로그인 성공 후 이름이 비어 있는 사용자는 이름 입력 화면을 본다.
2. 이름 입력은 단일 이름 입력 흐름으로 진행한다.
3. 이름은 비워 둘 수 없다.
4. 최소 1글자 이상 입력하면 제출할 수 있다.
5. 저장 성공 후 사용자는 explicit login이면 현재 browse/detail로, anonymous write intent였다면 원래 add-place/add-rating 시도로 이동한다.

## Failure Expectations
- OTP 요청이 실패해도 사용자가 입력한 이메일은 유지한다.
- OTP 검증이 실패해도 사용자는 같은 이메일 맥락에서 다시 시도하거나 새 OTP를 요청할 수 있다.
- 인증 실패 화면에서는 로그인 재시도 경로가 항상 보인다.
- 인증 실패 화면은 auth 흐름 바깥으로 이탈하지 않고, 새 OTP 요청 또는 이메일 재입력으로 이어져야 한다.
- 인증 실패 화면에는 raw reason code가 아니라 사람이 이해할 수 있는 설명이 보여야 한다.
- 이름 저장 실패 시 이름 입력 화면에 머물며 입력값을 유지한다.
- OTP 검증 중 예외나 네트워크 지연이 발생해도 무한 로딩 대신 다시 시도 가능한 terminal auth state가 보여야 한다.
- anonymous write prompt를 취소하면 현재 browse/detail 맥락이 유지돼야 한다.
