> Status: Archived
> Archived on: 2026-03-09
> Reason: Legacy Plan-based execution model was replaced by Sprint-based docs governance.
> Replaced by: `docs/00-governance/agent-workflow.md`, `docs/00-governance/docs-structure.md`, `docs/05-sprints/sprint-XX/planning.md`
>
> 이 문서는 더 이상 현재 기준 문서가 아니다.

# Plans

이 문서는 Nurimap 프로젝트의 전역 개발 기준과 실행 순서를 함께 관리하는 통합 문서다.
AI Agent는 이 문서에서 어떤 plan을 진행할지 확인하고, 각 plan에 포함된 spec 문서를 source of truth로 삼아 구현한다.

## Requirements
- 서비스는 사내 전용이며 `@nurimedia.co.kr` 이메일만 허용한다.
- 로그인 링크 인증 실패와 요청 제한 흐름을 처리해야 한다.
- 로그인 후 사용자의 이름을 수집해야 한다.
- 지도는 Kakao Map을 사용한다.
- 프론트엔드는 Vite + React를 사용한다.
- 스타일링은 Tailwind CSS + daisyUI를 사용한다.
- 상태 관리가 필요하면 Zustand 같은 React 라이브러리를 사용할 수 있다.
- place 등록은 네이버 지도 URL을 기준으로 진행한다.
- 좌표를 확보하지 못한 place는 저장하지 않는다.
- place의 canonical 식별자는 `naver_place_id`다.
- 별점, 리뷰, 추천은 로그인 사용자만 남길 수 있다.
- 이미 review가 있는 사용자는 같은 place에 새 review를 추가할 수 없다.
- 검색 엔진 노출은 차단한다.

## Delivery Principle
- 사용자에게 보이는 기능을 먼저 만든다.
- place 탐색과 place 추가 흐름을 로컬에서 먼저 검증한다.
- 인증과 접근 제어는 그 다음 단계에서 붙인다.
- 배포 직전에는 운영 안정화와 보안 설정을 마무리한다.
- AI Agent는 한 번에 하나의 plan만 진행한다.

## Plan 1. 앱 셸과 공통 레이아웃
- goal
  - 로그인 없이도 앱의 기본 화면 구조가 보이도록 만든다.
- included specs
  - `docs/03-specs/01-app-shell-and-layout.md`
- expected outcome
  - 데스크톱/모바일 공통 레이아웃이 잡힌다.
  - 이후 탐색 기능을 얹을 수 있는 앱 골격이 준비된다.

## Plan 2. 지도와 목록 탐색 기본
- goal
  - 로그인 없이도 place 탐색의 기본 구조를 확인할 수 있게 만든다.
- included specs
  - `docs/03-specs/02-map-rendering.md`
  - `docs/03-specs/03-list-browse.md`
- expected outcome
  - 지도와 목록에서 place를 탐색할 수 있다.
  - 지도와 목록의 기본 연결 구조가 보인다.

## Plan 3. 상세 화면 탐색
- goal
  - place 상세 정보 확인 흐름을 완성한다.
- included specs
  - `docs/03-specs/04-place-detail.md`
- expected outcome
  - 목록/지도에서 상세 화면으로 자연스럽게 이동할 수 있다.
  - 데스크톱과 모바일의 상세 진입/복귀 흐름이 구조적으로 연결된다.
  - 모바일 상세에서 지도 화면으로 돌아갈 때 선택한 place 맥락이 유지된다.
  - 상세 화면 필수 정보가 구조적으로 확인 가능하다.

## Plan 4. 네이버 URL 입력과 정규화
- goal
  - place 등록의 시작점인 Naver URL 입력을 안정화한다.
- included specs
  - `docs/03-specs/06-naver-url-normalization.md`
- expected outcome
  - 지원 URL이 canonical 형태로 정규화된다.
  - 잘못된 URL이 일관되게 차단된다.

## Plan 5. place 데이터 추출
- goal
  - Naver place 데이터를 서버에서 가져오고 좌표를 확보한다.
- included specs
  - `docs/03-specs/07-place-data-extraction.md`
- expected outcome
  - place 등록 전에 필요한 최소 데이터가 확보된다.
  - 조회 실패와 fallback 흐름이 명확해진다.

## Plan 6. place 등록과 병합
- goal
  - place를 실제로 저장하고 중복 place를 병합한다.
- included specs
  - `docs/03-specs/08-place-registration.md`
  - `docs/03-specs/09-place-merge.md`
- expected outcome
  - 사용자가 place를 실제로 등록할 수 있다.
  - 같은 `naver_place_id`는 하나의 place로 유지된다.
  - 기존 review가 있는 사용자는 새 review를 추가하지 않고 기존 상세 흐름으로 안내된다.

## Plan 7. 로컬 통합 검증
- goal
  - 로그인 전 핵심 사용자 기능을 로컬에서 한 흐름으로 검증한다.
- included specs
  - `docs/99-archive/local-integration-qa.md`
- expected outcome
  - place 추가, 지도, 목록, 상세 흐름이 로컬에서 안정적으로 연결된다.
  - 인증을 붙이기 전에 UI와 데이터 흐름 문제가 정리된다.

## Plan 8. 인증과 접근 제어
- goal
  - 사내 전용 서비스 조건을 만족하도록 로그인 링크 인증, 이름 수집, 보호 접근 제어를 붙인다.
- included specs
  - `docs/03-specs/05-auth-email-login-link.md`
- expected outcome
  - 로그인한 사내 사용자만 앱과 API를 사용할 수 있다.
  - 무효, 만료, 재발급으로 무효화된 로그인 링크와 요청 제한이 일관된 인증 실패 흐름으로 처리된다.
  - 이름이 없는 사용자는 이름 입력을 완료해야 앱에 진입할 수 있다.
  - 같은 브라우저에서 세션이 복구된다.

## Plan 9. 리뷰와 별점 평가
- goal
  - 로그인 사용자의 리뷰 작성과 별점 평가 기능을 함께 완성한다.
- included specs
  - `docs/03-specs/10-review.md`
- expected outcome
  - 사용자가 리뷰 작성 단계에서 별점을 함께 남길 수 있다.
  - 이미 review가 있는 사용자는 새 리뷰 작성 UI 대신 기존 내 리뷰 상태를 확인한다.
  - 목록과 상세의 평균 별점, 리뷰 데이터가 최신 상태를 반영한다.

## Plan 10. 추천 기능
- goal
  - 로그인 사용자의 추천 기능을 완성한다.
- included specs
  - `docs/03-specs/11-recommendation.md`
- expected outcome
  - 사용자가 추천을 추가/취소할 수 있다.
  - 상세 화면 집계 값이 최신 상태를 반영한다.

## Plan 11. 배포 전 운영 안정화
- goal
  - 배포 직전 검색 차단, 환경변수 분리, 에러/로그 정책, 최종 검증 절차를 마무리한다.
- included specs
  - `docs/03-specs/12-release-hardening.md`
- expected outcome
  - 검색 엔진 차단과 최소 운영 안전장치가 적용된다.
  - 첫 배포 가능한 상태가 된다.

## First Release Scope
- `Plan 1`부터 `Plan 11`까지 모두 완료된 상태를 첫 배포 기준으로 한다.
