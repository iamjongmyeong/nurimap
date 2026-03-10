> Status: Archived
> Archived on: 2026-03-09
> Reason: Historical QA report from the legacy Plan workflow.
> Replaced by: No direct replacement. Future Sprint verification records belong in `docs/05-sprints/sprint-XX/qa.md` and `review.md`.
>
> 이 문서는 더 이상 현재 기준 문서가 아니다.

# Plan 11 Manual QA Report

- Date: 2026-03-09
- Plan: Plan 11 배포 전 운영 안정화
- Source spec: `docs/03-specs/12-release-hardening.md`

## Environment
- Local verification: Vitest + file/config inspection
- Runtime scope: Vite app shell, Vercel headers config, server logging helpers

## Automated Evidence
- `npm run test:run -- src/server/releaseHardening.test.ts src/server/placeLookupService.test.ts src/app-shell/placeRepository.test.ts src/app-shell/NurimapDetail.test.tsx src/app-shell/PlaceRegistrationFlow.test.tsx src/auth/AuthFlow.test.tsx src/server/apiImportBoundary.test.ts`
  - 결과: **67 tests passed**
- `npm run lint` → 통과
- `npm run build` → 통과

## Required Test Cases Coverage
- [pass] robots 차단 응답 설정 (`public/robots.txt`)
- [pass] 메타 noindex 존재 (`index.html`)
- [pass] X-Robots-Tag 존재 (`vercel.json`)
- [pass] 민감 env 미노출 (client source scan)
- [pass] 실패 로그 기록 (`requestLoginLink`, `lookupPlaceFromRawUrl`)

## Manual QA Checklist
- [pass] 페이지 소스에서 noindex 확인 가능 (`index.html`)
- [pass] robots 응답 설정 확인 (`public/robots.txt`)
- [pass] 실패 상황 후 로그 출력 경로 확인 (`opsLogger` + service tests)

## Notes
- Naver lookup 결과는 canonical URL 단위 in-memory cache를 적용했다.
- lookup 실패와 로그인 링크 요청 실패는 운영 로그 포맷 `[ops] <event>`로 남긴다.
- 민감 env는 client 코드에서 직접 참조하지 않고, 공개 env만 `PUBLIC_` prefix를 사용한다.

## QA Evidence
- `src/server/releaseHardening.test.ts`
- `src/server/placeLookupService.test.ts`
- `public/robots.txt`
- `vercel.json`
- `index.html`
- `git log -1 --stat`
