# Definition Of Done

이 문서는 Nurimap 전체 프로젝트에 공통 적용되는 완료 기준이다.
각 spec 문서는 이 기준 위에 기능별 로컬 완료 조건을 추가할 수 있지만, 아래 항목을 대체하지는 않는다.

## 1. Spec Alignment
- 구현 결과가 해당 spec의 목표, 요구사항, acceptance criteria와 일치한다.
- spec에 없는 기능을 임의로 추가하지 않는다.
- spec에 정의된 제외 범위를 침범하지 않는다.

## 2. Functional Completion
- 핵심 사용자 시나리오가 정상 동작한다.
- 해당 기능의 주요 예외 케이스가 처리된다.
- 실패 상태는 사용자에게 이해 가능한 방식으로 표시된다.
- 데이터 생성, 수정, 삭제 또는 상태 변경이 의도한 결과를 만든다.

## 3. UX Consistency
- 데스크톱과 모바일에서 정의된 UX 흐름을 따른다.
- 기존 화면 구조와 상호작용 패턴을 불필요하게 깨지 않는다.
- 목록, 상세, 폼, 에러 상태가 일관된 방식으로 동작한다.
- 프론트엔드 구현 작업인 경우 `vercel-react-best-practices`와 `frontend-design` 기준을 적용했다.
- 프론트엔드 UI 리뷰나 UX 점검 작업인 경우 `web-design-guidelines` 기준을 참고했다.

## 4. Data And Domain Integrity
- `place`, `place_type`, `zeropay_status`, `naver_place_id` 같은 핵심 도메인 용어를 일관되게 사용한다.
- 중복 병합, 상태 갱신, 집계 값 계산이 문서화된 규칙과 일치한다.
- 저장되는 데이터는 정의된 무결성 조건을 만족한다.
- 데이터 소스 우선순위와 fallback 정책이 문서와 구현에서 어긋나지 않는다.

## 5. Security And Access Control
- 인증이 필요한 기능은 로그인 없이 접근되지 않는다.
- 허용 도메인, 로그인 링크, 세션 정책 등 인증 규칙이 spec과 일치한다.
- 민감한 키, 토큰, 서버 전용 로직이 클라이언트에 노출되지 않는다.
- 검색 엔진 차단, abuse 방지, 권한 검사가 필요한 곳에 적용된다.

## 6. Test And Verification
- 가능한 범위에서 자동화 테스트를 작성하거나 기존 테스트를 확장했다.
- 최소한 핵심 흐름이 깨지지 않음을 검증했다.
- lint, type check, build, 실행 검증 중 해당 작업에 필요한 검증을 통과했다.
- 브라우저 상호작용 검증이 필요하면 가능하면 Playwright CLI를 사용하고, 실행했다면 `qa.md`에 목적, 명령/스크립트, 판정, 스크린샷 경로를 남긴다.
- 사용자 직접 QA가 필요한 항목은 `qa.md`에 수행 절차, 기대 결과, 상태(`pending`, `passed`, `blocked`)와 함께 남긴다.
- 테스트를 생략한 경우 이유와 남은 리스크를 명확히 남긴다.
- 현재 Sprint의 `qa.md`에 필요한 검증 결과를 반영했다.

## 7. Documentation Sync
- 구현 결과가 관련 문서와 일치한다.
- 필요 시 `docs/03-specs/`, `docs/01-product/`, `docs/04-design/`, `docs/02-architecture/`, 현재 Sprint 문서를 업데이트했다.
- Open Questions가 해소되었으면 문서에서 반영했다.
- 범위 변경이 있었다면 `docs/06-history/change-log.md`에 남긴다.
- 중요한 판단이 있었다면 `docs/06-history/decisions.md`에 남긴다.

## 8. Review Readiness
- 다른 개발자나 AI Agent가 읽고 이어서 작업할 수 있다.
- 코드와 문서에 불필요한 혼란이나 임시 흔적을 남기지 않는다.
- 변경 이유와 영향 범위를 설명할 수 있는 상태다.
- 현재 Sprint의 `review.md`에 결과 요약, 미완료 항목, carry-over가 정리돼 있다.
