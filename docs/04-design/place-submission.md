# Place Submission Design

이 문서는 장소 등록 화면의 구조, 실패 처리, 저장 후 전환 규칙을 정의한다.

관련 문서:
- [Place Submission User Flow](../01-product/user-flows/place-submission.md)
- [Place Data Extraction Spec](../03-specs/07-place-data-extraction.md)
- [Place Registration Spec](../03-specs/08-place-registration.md)
- [Place Merge Spec](../03-specs/09-place-merge.md)
- [Design Foundations](./foundations.md)

## Surface Structure
- 장소 등록은 기존 목록 영역 안에서 진행한다.
- 데스크톱은 왼쪽 사이드바, 모바일은 목록 화면이 공통 등록 영역 역할을 한다.
- 장소 등록은 별도 단계 전환이 아니라 한 화면의 단일 폼으로 구성한다.
- 등록 화면 상단 헤더 영역에는 뒤로가기 액션만 둔다.
- 뒤로가기 버튼 컨테이너는 `24px x 24px`를 사용한다.
- 뒤로가기 버튼의 left inset은 `24px` 기준으로 맞춘다.
- 뒤로가기 버튼은 hover 시 background와 border를 추가하지 않고 pointer cursor만 보여준다.

## Form Layout
- 등록 폼은 아래 순서로 배치한다.
  1. 이름
  2. 주소
  3. 장소 구분
  4. 제로페이
  5. 평가
  6. 후기(선택)
  7. 등록 버튼
- 이름/주소 입력 필드 높이는 `40px`다.
- 이름/주소 입력 field의 font size는 `16px`다.
- 이름/주소 placeholder color는 `#C9C9C9`다.
- label과 이름/주소 입력 필드 사이는 `8px` 간격을 유지한다.
- 필드 블록 간 기본 세로 간격은 `24px`를 사용한다.
- 이름/주소 입력의 focused 상태는 border color만 `#5862FB`로 변경한다.
- 후기 입력 필드는 multiline field로 사용하고 최소 높이는 `88px`다.
- 후기 입력 줄 수가 최소 높이를 넘기면 field 높이를 내용에 맞춰 반응형으로 늘린다.
- 후기 입력 필드는 가용 너비를 모두 사용하고 사용자가 직접 resize할 수 없다.
- 등록 폼 scroll container의 오른쪽 추가 padding은 두지 않는다.
- 후기 입력에 500자 초과 내용을 붙여넣거나 입력하면 초과분은 버리고 field에는 500자까지만 유지한다.
- 후기 입력 필드의 글자 수 표시는 노출하지 않는다.
- 주요 액션 버튼 높이는 `40px`다.
- 등록 버튼은 후기 입력 필드 아래 `24px` 간격으로 배치한다.
- 필수 입력이 모두 채워지기 전 등록 버튼은 `opacity: 0.5` 상태로 보여준다.
- 필수 입력이 모두 채워지기 전 등록 버튼 cursor는 `not-allowed`로 보여준다.
- 등록 버튼은 클릭/active 상태에서 불필요한 shadow나 눌림 이동 효과를 사용하지 않는다.
- 모든 필드 radius는 `12px`를 기준으로 한다.

## Selection Controls
- 장소 구분과 제로페이는 segmented button 스타일로 표시한다.
- label과 segmented options 사이 간격은 `8px`를 사용한다.
- 장소 구분과 제로페이 버튼의 font size는 `16px`다.
- 선택된 항목은 primary color 계열로 강조한다.
- 선택되지 않은 항목은 `#C9C9C9` text color와 neutral border/background 스타일을 사용한다.
- hover 시 pointer cursor를 보여줘 선택 가능한 버튼임을 인지시킨다.

## Rating Rules
- 평가는 별 아이콘 5개를 사용한다.
- label과 별점 row 사이 간격은 `12px`를 사용한다.
- 아이콘 크기는 `24px x 24px`다.
- 기본값은 5점이다.
- 데스크톱에서는 사용자가 별을 클릭하거나 hover해서 점수를 바꿀 수 있다.
- 예를 들어 5점 상태에서 4번째 별을 hover하거나 클릭하면 4점으로 변경된다.
- 모바일에서는 사용자가 별을 클릭/터치해서만 점수를 바꿀 수 있다.
- 데스크톱 hover 시 pointer cursor와 가벼운 scale 변화로 선택 가능 상태를 인지시킨다.
- 선택된 점수 개수만큼 활성 별을 보여주고, 나머지는 비활성 별로 표시한다.
- 예를 들어 4점이면 활성 별 4개, 비활성 별 1개가 보여야 한다.
- 활성 별은 red 계열, 비활성 별은 light gray 계열을 사용한다.

## Error And Retry Rules
- 필수 입력 누락은 입력 필드 아래 inline error로 표시한다.
- geocoding 실패 시 browser alert으로 `주소를 찾지 못했어요.\n입력한 주소를 다시 확인해 주세요.`를 보여주고, 주소 입력 필드에 inline error를 표시한다.
- geocoding 실패 시 사용자가 입력한 값은 유지한다.
- 장소 등록 저장 실패 시 browser alert으로 `등록하지 못했어요.\n잠시 후 다시 시도해 주세요.`를 보여준다.
- 장소 등록 저장 실패 시 사용자가 입력한 이름, 주소, 장소 구분, 제로페이, 별점, 후기는 유지한다.
- 장소 등록 저장 중에는 제출 버튼을 비활성화한다.
- 저장 중에는 버튼 안의 `등록 중` visible label을 제거하고 spinner 애니메이션만 보여준다.
- 장소 등록 저장 중에는 별도 안내 박스를 추가로 보여주지 않는다.
- dirty state에서 뒤로가기/닫기를 누르면 browser confirm으로 `입력을 그만하시겠어요?\n입력한 내용은 저장되지 않아요.`를 보여준다.

## Duplicate Handling
- 중복 장소가 발견되면 browser confirm 한 번으로 기존 장소에 입력한 내용을 반영할지 묻는다.
- 기본 confirm 문구는 사용자 관점에서 이해 가능해야 하며, 예시는 다음과 같다.
  - 중복 장소 + 내 리뷰 없음: `이미 등록된 장소예요.\n지금 입력한 정보를 이 장소에 반영할까요?`
  - 중복 장소 + 내 리뷰 있음: `이미 내가 리뷰를 남긴 장소예요.\n지금 입력한 정보를 반영할까요?`
- 사용자가 `확인`을 누르면 평가/후기와 장소 구분/제로페이 정보를 함께 반영한다.
- 사용자가 `취소`를 누르면 등록 화면에 그대로 머무르고 입력값을 유지한다.
- 현재 사용자가 이미 같은 장소에 review를 작성한 경우, 후기가 비어 있으면 기존 후기 내용은 유지하고 평가만 변경한다.

## Success Transition
- 장소 등록 성공 시 별도 완료 화면 대신 결과 장소 상세 화면을 연다.
- 장소 등록 성공 시 목록 영역은 다시 목록 상태로 돌아가고 지도/목록이 갱신된다.
