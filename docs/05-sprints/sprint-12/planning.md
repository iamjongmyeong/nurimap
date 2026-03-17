# Sprint Goal

- broken auth mail URL을 고쳐 이메일의 로그인 링크가 실제 앱 URL로 시작하도록 복구한다.
- 인증 방식은 magic link를 유지하고, 로그인 메일과 로그인 화면 UX를 현재 합의한 사양으로 단순화한다.

# In Scope

- `PUBLIC_APP_URL` 기준의 로그인 링크 생성과 검증 경로를 점검하고, 로컬/Vercel에서 `undefined`로 시작하는 링크가 발송되지 않도록 정리한다.
- 기존 Supabase magic link + app-managed nonce wrapper 인증 방식을 유지한다.
- 로그인 이메일 제목, 본문 정렬, 버튼, 만료 안내, raw URL fallback 노출 규칙을 이번 Sprint 기준으로 확정한다.
- 로그인 화면을 모바일/데스크톱 동일 레이아웃의 minimal SaaS 스타일로 단순화한다.
- 로그인 링크 요청 성공 후 페이지 이동 없이 현재 컴포넌트 안에서 입력 이메일을 포함한 안내 상태를 보여준다.
- invalid domain, cooldown, daily limit, delivery failure 등 기존 로그인 에러 처리를 유지한다.
- 로그인 성공 후 이름이 없는 사용자를 현재와 동일하게 이름 입력 화면으로 강제 이동시킨다.

# Out Of Scope

- 5분 유효 6자리 코드 기반 로그인으로 인증 방식을 변경하는 작업
- 이름 입력 화면 UX 자체를 새로 설계하거나 완화하는 작업
- bypass 이메일 정책, 세션 정책, 허용 도메인 정책 변경
- 인증 실패 화면의 정보 구조를 이번 Sprint 범위를 넘어 재설계하는 작업
- auth feature 전체를 Clerk 또는 다른 외부 인증 제품으로 교체하는 작업

# Selected Specs

- `docs/03-specs/05-auth-email-login-link.md`

# Related Product / Design / Architecture Docs

- `docs/01-product/product-overview.md`
- `docs/01-product/product-principles.md`
- `docs/01-product/user-flows/auth-and-name-entry.md`
- `docs/99-archive/04-design/foundations.md`
- `docs/04-design/auth-and-name-entry.md`
- `docs/02-architecture/security-and-ops.md`
- `docs/99-archive/02-architecture/system-context.md`
- `docs/00-governance/definition-of-ready.md`
- `docs/00-governance/definition-of-done.md`

# Constraints

- 인증 방식은 magic link를 유지한다.
- 로그인 링크는 Supabase Auth가 최종 세션을 발급하되, 앱은 nonce wrapper 링크로 5분 만료, 재발급 invalidation, 1회 사용 정책을 계속 통제한다.
- 로그인 링크의 base URL은 `PUBLIC_APP_URL`을 기준으로 하며, 값이 비어 있거나 잘못된 환경에서는 조용히 `undefined...` 링크를 발송하면 안 된다.
- 로그인 메일 제목은 `[NURIMAP] 로그인 링크`를 사용한다.
- 로그인 메일 본문은 가운데 정렬된 `NURIMAP LOGIN` 브랜드 텍스트, `누리맵 로그인` 버튼, 5분 유효 안내, raw URL fallback을 포함한다.
- 로그인 화면은 가운데 정렬된 단일 auth 컴포넌트를 사용하고, 기존 `shadow-xl` 카드 스타일은 제거한다.
- 로그인 화면의 메인 텍스트는 `NURIMAP LOGIN`만 노출하고, 허용 도메인 설명 문구는 노출하지 않는다.
- 이메일 input은 `example@nurimedia.co.kr` placeholder를 사용하고, label은 시각적으로 숨기되 접근성용으로 유지한다.
- 로그인 버튼 텍스트는 `이메일로 로그인 링크 전송`을 사용한다.
- 로그인 링크 전송 성공 후에는 같은 컴포넌트 안에서 입력한 이메일 주소를 보여주며 발송 안내를 표시한다.
- 로그인 성공 후 이름이 없는 사용자는 반드시 이름 입력 화면으로 이동해야 한다.

# Agent Instructions

- Sprint 12에서는 magic link 유지가 결정 사항이므로 6자리 코드 인증으로 범위를 확장하지 않는다.
- auth source of truth를 바꾸는 내용이 생기면 `planning.md`와 관련 auth 문서를 함께 갱신한다.
- 메일 링크 문제를 UI 문제와 섞어서 추정 처리하지 말고, env/runtime link assembly 경계를 먼저 확인한다.
- 로그인 요청 실패 메시지와 보호 접근 제어는 기존 동작을 우선 보존한다.
- 모바일과 데스크톱 auth 화면은 동일 구조를 사용하고, 새로운 설명 문구나 장식 요소를 추가하지 않는다.

# Done Criteria

- 허용 도메인 이메일로 요청한 로그인 메일의 링크가 `undefined`가 아닌 실제 앱 URL로 시작한다.
- 로그인 이메일 제목과 본문이 Sprint 12 메일 사양과 일치한다.
- 로그인 화면이 가운데 정렬된 동일 레이아웃으로 동작하고, 요청한 텍스트/placeholder/button 문구가 반영된다.
- 로그인 링크 전송 성공 후 페이지 이동 없이 현재 컴포넌트 안에서 입력 이메일을 포함한 안내가 보인다.
- invalid domain, cooldown, daily limit, delivery failure 흐름이 기존과 동일하게 유지된다.
- 유효한 로그인 링크 클릭 시 인증이 완료되고, 이름이 없는 사용자는 이름 입력 화면으로 이동한다.
- 관련 auth spec, user flow, UI 문서와 Sprint 문서가 실제 동작 기준과 일치한다.

# QA Plan

- 허용 도메인 이메일로 로그인 링크를 요청해 메일 제목이 `[NURIMAP] 로그인 링크`인지 확인한다.
- 수신된 메일 본문에서 가운데 정렬된 `NURIMAP LOGIN`, `누리맵 로그인` 버튼, 5분 유효 안내, raw URL fallback이 보이는지 확인한다.
- 메일에 포함된 로그인 링크가 `https://...` 또는 로컬 검증용 실제 origin으로 시작하는지 확인한다.
- 메일 버튼 클릭과 raw URL 직접 열기 모두에서 로그인 링크 검증이 동작하는지 확인한다.
- 로그인 성공 후 이름이 없는 계정이 이름 입력 화면으로 이동하는지 확인한다.
- 로그인 화면에서 placeholder, 숨김 label, 버튼 텍스트, 성공 안내 이메일 노출이 의도대로 보이는지 모바일/데스크톱에서 확인한다.
- invalid domain, cooldown, daily limit, delivery failure 흐름이 기존 메시지와 함께 유지되는지 확인한다.
