> Status: Archived
> Archived on: 2026-03-09
> Reason: The legacy local development guide is no longer part of the live docs structure.
> Replaced by: No direct replacement. Create a new live guide only when local workflow needs to become active documentation again.
>
> 이 문서는 더 이상 현재 기준 문서가 아니다.

# Local Development Workflow

## 목적
로컬에서 충분히 검증한 뒤 배포하기 위한 개발 절차를 정리한다.

## Make 명령

### `make dev`
- 순서:
  1. `npm run test:run`
  2. `npm run lint`
  3. `npm run build`
  4. `npm run dev -- --host 127.0.0.1`

### `make dev-run`
- `make dev`와 같은 검증을 먼저 수행한다.
- 그 다음 로컬 dev server를 띄우고 브라우저를 연다.

## Auth bypass (선택)

public repository 특성상 **실제 bypass 이메일 값은 git에 커밋하지 않는다.**

실제 값은 로컬의 ignored file 또는 배포 환경 변수에서만 관리한다.

예시 위치:
- `.env.local` (git ignored)
- Vercel Environment Variables

예시 키:
```env
AUTH_BYPASS_ENABLED=true
AUTH_BYPASS_EMAILS=<comma-separated-email-list>
```

주의:
- 실제 이메일 주소를 문서, 소스 코드, Makefile 기본값에 직접 적지 않는다.
- bypass 동작은 버튼 문구가 아니라 인증 액션/API 계약 기준으로 유지한다.
- 배포 환경에서 bypass가 필요하면 `AUTH_BYPASS_ENABLED`, `AUTH_BYPASS_EMAILS`만 추가하고, `PUBLIC_APP_URL`은 계속 실제 배포 도메인을 사용한다.
- 필요 없으면 `AUTH_BYPASS_ENABLED=false` 또는 env 제거로 비활성화한다.
