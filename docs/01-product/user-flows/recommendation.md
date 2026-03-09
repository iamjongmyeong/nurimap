# Recommendation

## Scope
- 추천 추가
- 추천 취소
- 추천 수 반영

## Recommendation Flow
1. 로그인 사용자가 상세 화면의 추천 버튼을 누른다.
2. 기존 추천이 없으면 추천을 추가한다.
3. 기존 추천이 있으면 추천을 취소한다.
4. 추천 수가 갱신된다.

## Rules
- 로그인 사용자만 추천할 수 있다.
- 한 사용자는 place마다 하나의 recommendation 상태만 가진다.
- 추천 수는 상세 화면에 최신 상태로 반영돼야 한다.

## Failure Expectations
- 추천 토글 실패 시 추천 수와 내 추천 상태가 중복 반영되지 않아야 한다.
