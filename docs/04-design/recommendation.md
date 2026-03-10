# Recommendation Design

이 문서는 추천 버튼의 진행 상태와 상세 화면 반영 규칙을 정의한다.

관련 문서:
- [Recommendation User Flow](../01-product/user-flows/recommendation.md)
- [Recommendation Spec](../03-specs/11-recommendation.md)
- [Design Foundations](./foundations.md)

## Interaction Notes
- `recommendation_toggle`은 추천 버튼의 비동기 진행 상태를 표현한다.
- 추천 수와 내 추천 상태는 상세 화면에 최신 상태로 반영돼야 한다.
- 추천 토글 실패 시 추천 수와 내 추천 상태가 중복 반영되지 않아야 한다.
