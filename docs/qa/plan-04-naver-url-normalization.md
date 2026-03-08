# Plan 04 Manual QA Report

- Date: 2026-03-08
- Plan: Plan 04 네이버 URL 입력과 정규화
- Source spec: `docs/specs/02-naver-url-normalization.md`

## Environment
- Local dev server: `npm run dev -- --host 127.0.0.1`
- Desktop viewport: `1440x960`
- Visual QA method: Playwright runtime screenshots + AI visual inspection

## Runtime Evidence
```json
{
  "invalidErrorVisible": true,
  "inputValueAfterError": "https://example.com/p/entry/place/123",
  "normalizedResultVisible": true,
  "normalizedResultText": "정규화 결과placeId: 123456789canonical URL: https://map.naver.com/p/entry/place/123456789"
}
```

## Manual QA Checklist
- [pass] 지원 URL을 붙여넣으면 canonical URL로 정규화된다.
- [pass] 잘못된 URL을 붙여넣으면 `네이버 지도 URL을 입력해주세요.` inline error가 보인다.
- [pass] 잘못된 URL을 붙여넣어도 input 값이 유지된다.

## Visual Notes
- `invalid-url.png`에서 잘못된 호스트 URL 입력 시 inline error가 input 아래에 표시되는 것을 확인했다.
- `invalid-url.png`에서 잘못된 URL 입력값이 그대로 유지되는 것을 확인했다.
- `normalized-url.png`에서 지원 URL 입력 후 `placeId: 123456789`과 canonical URL `https://map.naver.com/p/entry/place/123456789`가 표시되는 것을 확인했다.

## Supporting Files
- `artifacts/qa/plan-04/invalid-url.png`
- `artifacts/qa/plan-04/normalized-url.png`
- `artifacts/qa/plan-04/run-playwright.mjs`

## Conclusion
Plan 04의 지원 URL 정규화, invalid URL inline error, input 유지 동작은 spec과 자동 테스트, 수동 QA evidence 기준으로 검증되었다.
