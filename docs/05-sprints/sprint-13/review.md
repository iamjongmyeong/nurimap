# Sprint Summary

- Sprint 13에서는 지도 탐색 런타임 회귀와 Naver URL ingestion 누락을 함께 정리했다.
- 지도 surface는 hero copy를 제거하고 compact status HUD + 공식 Kakao zoom control 계약으로 정리했다.
- 장소 추가는 `naver.me`, `favorite`, `search` URL을 동일 canonical place 기준으로 lookup 할 수 있게 만들었다.
- auth bootstrap은 refresh 시 stale verify query와 예외가 있어도 terminal auth state로 수렴하도록 보강했다.

# Completed

- `src/app-shell/MapPane.tsx`
  - visible hero copy 제거
  - compact map status HUD 유지
  - fallback zoom buttons 추가
  - Kakao runtime `ZoomControl` + `addControl` 연결
- `src/app-shell/NurimapAppShell.tsx`
  - 데스크톱 detail panel layer 강화(`z-20`, `isolate`)
- `src/app-shell/PlaceAddPanels.tsx`
  - place lookup URL validation을 서버 authoritative 응답 기반으로 전환
- `src/auth/AuthProvider.tsx`
  - verify bootstrap 예외 처리 추가
  - stale verify query보다 기존 세션 복원을 우선 적용
- `src/auth/AuthFlow.test.tsx`
  - refresh-time verify rejection / stale verify query + 기존 세션 복원 회귀 테스트 추가
- `src/app-shell/naverUrl.ts`, `api/_lib/_naverUrl.ts`
  - `favorite/.../place/{id}` 포함 direct place URL 정규화 범위 확장
- `src/server/placeLookupService.ts`, `api/_lib/_placeLookupService.ts`
  - `naver.me` short-link redirect 해석 후 canonical lookup 수행
- fixture / test 업데이트
  - placeId `1648359924` lookup success fixture 추가
  - Sprint 13 URL 3종 회귀 테스트 추가
- spec / architecture / decision / QA 문서 동기화

# Not Completed

- 실제 브라우저에서 live Kakao SDK를 띄운 상태의 최종 수동 spot-check

# Carry-over

- 실제 Kakao SDK가 완전히 초기화되는 로컬/preview 환경에서 runtime spot-check 1회 수행 후 review를 최종 닫는다.

# Risks

- 자동화는 mocked Kakao runtime + fallback renderer를 함께 커버하지만, 브라우저/OS 조합에 따라 실제 Kakao tile layer 위 repaint 문제가 재발할 가능성은 완전히 0은 아니다.
- 이번 세션의 headless spot-check에서는 Kakao SDK script 삽입까지만 확인됐고 `window.kakao?.maps` 초기화 완료는 관찰하지 못했다.

# Retrospective

- `naver.me`처럼 네트워크 해석이 필요한 URL은 브라우저 prevalidation보다 서버 authoritative boundary가 더 안전했다.
- runtime-only 지도 문제는 fallback 테스트만으로는 부족하므로, mocked runtime 테스트와 실제 브라우저 spot-check를 둘 다 유지하는 방향이 유효했다.
