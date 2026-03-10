# Review Design

이 문서는 리뷰 작성과 별점 입력 UI의 구조 및 기존 리뷰 사용자 처리 규칙을 정의한다.

관련 문서:
- [Review User Flow](../01-product/user-flows/review.md)
- [Review Spec](../03-specs/10-review.md)
- [Design Foundations](./foundations.md)

## Interaction Notes
- 별점 입력 UI는 숫자 입력 필드가 아니라 별 모양 버튼을 사용한다.
- 현재 사용자가 이미 같은 장소에 review를 작성한 경우 리뷰 작성 UI를 노출하지 않는다.
- 현재 사용자가 이미 같은 장소에 review를 작성한 경우 기존 내 리뷰와 내 별점 상태를 보여준다.
- 장소 상세의 `내 별점 상태`는 현재 사용자의 단일 review `rating_score`를 기준으로 표시한다.
