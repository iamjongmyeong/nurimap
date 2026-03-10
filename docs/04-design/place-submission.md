# Place Submission Design

이 문서는 장소 추가 UI의 단계 구성, 조회/실패/중복 처리, 저장 후 전환 규칙을 정의한다.

관련 문서:
- [Place Submission User Flow](../01-product/user-flows/place-submission.md)
- [Naver URL Normalization Spec](../03-specs/06-naver-url-normalization.md)
- [Place Data Extraction Spec](../03-specs/07-place-data-extraction.md)
- [Place Registration Spec](../03-specs/08-place-registration.md)
- [Place Merge Spec](../03-specs/09-place-merge.md)
- [Design Foundations](./foundations.md)

## Surface Structure
- 장소 추가 UI는 같은 화면 안에서 2단계 progressive disclosure로 구성한다.
- 장소 추가 UI의 1단계는 Naver Map URL 입력과 조회만 우선 보여준다.
- 조회 성공 후 같은 장소 추가 UI의 2단계에서 조회된 장소명과 대표 주소 요약, 등록 입력 UI를 함께 보여준다.

## Input And Summary Rules
- 2단계의 장소명과 대표 주소는 편집 가능한 input이 아니라 display-only summary UI로 보여준다.
- 2단계의 대표 주소는 `road_address`를 우선 사용하고, 없으면 `land_lot_address`를 사용한다.
- 장소 등록의 초기 별점과 리뷰 입력 UI는 현재 사용자가 해당 장소에 review가 없을 때만 표시한다.
- 장소 추가 화면에서는 5번째 별이 기본 선택 상태여야 한다.

## Error And Retry Rules
- Naver Map URL이 아니면 URL 입력 필드 아래에 `네이버 지도 URL을 입력해주세요.` inline error를 표시한다.
- 장소 조회 실패와 좌표 확보 실패는 브라우저 기본 `alert`가 아니라 modal로 표시한다.
- 장소 조회 실패와 좌표 확보 실패 시 사용자가 입력한 URL은 유지한다.
- 장소 등록 저장 실패 시 사용자가 입력한 `place_type`, `zeropay_status`, 별점, 리뷰는 유지한다.
- 장소 등록 저장 중에는 제출 버튼을 비활성화한다.

## Duplicate Review Modal
- 장소 등록에서 현재 사용자가 해당 장소에 이미 review를 작성한 경우 제목이 `이미 리뷰를 남긴 장소예요`인 modal을 표시한다.
- 이 modal은 본문 없이 제목만 사용한다.
- 이 modal의 CTA는 `장소 상세 보기`, `닫기`를 사용한다.
- `장소 상세 보기`를 누르면 기존 장소 상세 화면으로 이동한다.
- `닫기`를 누르면 장소 등록 화면을 닫고 지도 탐색 상태로 돌아간다.

## Success Transition
- 장소 등록 성공 시 별도 완료 화면 대신 결과 장소 상세 화면을 연다.
