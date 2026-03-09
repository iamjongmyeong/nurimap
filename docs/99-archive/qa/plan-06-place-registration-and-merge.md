> Status: Archived
> Archived on: 2026-03-09
> Reason: Historical QA report from the legacy Plan workflow.
> Replaced by: No direct replacement. Future Sprint verification records belong in `docs/04-sprints/sprint-XX/qa.md` and `review.md`.
>
> 이 문서는 더 이상 현재 기준 문서가 아니다.

# Plan 06 Manual QA Report

- Date: 2026-03-08
- Plan: Plan 06 place 등록과 병합
- Source specs:
  - `docs/03-specs/08-place-registration.md`
  - `docs/03-specs/09-place-merge.md`

## Environment
- Local dev server: `npm run dev -- --host 127.0.0.1`
- Desktop viewport: `1440x960`
- Visual QA method: Playwright runtime screenshots + AI visual inspection

## Runtime Evidence
```json
{
  "defaultStarClass": "btn btn-circle btn-sm btn-warning",
  "duplicateModalVisible": true,
  "retainedReviewValue": "저장 실패 테스트 입력",
  "createMessage": "장소를 추가했어요.",
  "createdListVisible": true,
  "mergeMessage": "기존 장소에 정보를 합쳤어요.",
  "mergeDetailHasName": "Floating Detail Panel선택된 장소 상세 영역...양화로 카페 리프레시..."
}
```

## Manual QA Checklist
- [pass] place 추가 UI가 같은 화면 안에서 URL 입력 단계와 등록 입력 단계로 이어진다.
- [pass] 조회 성공 후 place 이름과 대표 주소가 읽기 전용 요약으로 보인다.
- [pass] place 추가 화면에서 5번째 별이 기본 선택이다.
- [pass] 잘못된 입력(리뷰 500자 초과, 좌표 없음) 시 에러가 보인다.
- [pass] review가 없는 경우에만 초기 리뷰 입력 UI가 보인다.
- [pass] place 등록 후 초기 리뷰와 별점이 첫 review로 반영된다.
- [pass] 같은 place에 이미 review가 있으면 `이미 리뷰를 남긴 장소예요` modal이 보인다.
- [pass] 중복 리뷰 modal의 `장소 상세 보기`로 기존 상세 화면으로 이동한다.
- [pass] 저장 중 제출 버튼이 비활성화된다.
- [pass] 저장 중 진행 상태가 보인다.
- [pass] 저장 실패 시 입력한 값이 유지된다.
- [pass] 등록 성공 후 지도와 목록에 새 place가 반영된다.
- [pass] 등록 성공 시 별도 완료 화면 없이 상세 화면으로 이동한다.
- [pass] 병합 성공 시 기존 place 상세 화면이 열리고 별도 merge 메시지가 보인다.

## Visual Notes
- `step-two-registration.png`에서 같은 화면 안에서 URL 확인 후 등록 입력 단계로 전환되는 것을 확인했다.
- `duplicate-review-modal.png`에서 기존 review 존재 시 제목만 있는 modal과 `장소 상세 보기`, `닫기` CTA를 확인했다.
- `save-failure-retain.png`에서 저장 실패 후 입력한 리뷰 내용과 enum 선택이 유지되는 것을 확인했다.
- `create-success.png`에서 새 place 생성 후 목록/상세/등록 성공 메시지가 함께 반영되는 것을 확인했다.
- `merge-success.png`에서 기존 place 병합 후 상세 내용이 갱신되고 `기존 장소에 정보를 합쳤어요.` 메시지가 보이는 것을 확인했다.

## Supporting Files
- `artifacts/qa/plan-06/step-two-registration.png`
- `artifacts/qa/plan-06/duplicate-review-modal.png`
- `artifacts/qa/plan-06/save-failure-retain.png`
- `artifacts/qa/plan-06/create-success.png`
- `artifacts/qa/plan-06/merge-success.png`
- `artifacts/qa/plan-06/run-playwright.mjs`

## Conclusion
Plan 06의 등록/병합 흐름은 spec, 자동 테스트, 수동 QA evidence 기준으로 검증되었다.
