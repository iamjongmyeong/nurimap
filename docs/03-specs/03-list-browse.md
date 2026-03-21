# Spec: List Browse

## Summary
place 목록 표시, 목록 기반 탐색, 목록 영역 전환, canonical detail route 연동 규칙을 정의한다.

## Scope
- 목록 표시 필드
- 목록 선택 동작
- 목록 영역 전환
- 모바일 목록 페이지에서 상세 이동
- canonical detail route 연동
- 목록 로딩/빈 상태

## Functional Requirements
- 목록에는 이름, 평균 별점, 리뷰 수, 장소 유형을 표시한다.
- 목록에는 `zeropay_status = available`인 place에만 제로페이 가능 표시를 노출한다.
- 제로페이 가능 표시는 사용자가 목록 메타 정보를 해치지 않고 인지할 수 있는 위치에 둔다.
- desktop pointer 환경에서는 제로페이 가능 표시의 의미를 보조적으로 설명할 수 있어야 한다.
- `zeropay_status = unavailable | needs_verification`인 place는 목록에서 제로페이 로고를 표시하지 않는다.
- 목록에서 place를 선택하면 상세 화면과 canonical detail URL(`/places/:placeId`)이 함께 연동된다.
- 목록은 place를 빠르게 비교할 수 있어야 한다.
- 목록 row 하단 메타 라인은 평균 별점, 리뷰 수, 장소 유형 순서로 표시한다.
- 모바일 목록 페이지에서 place를 선택하면 전체 화면 상세 페이지로 이동한다.
- 모바일 목록 페이지는 상단 고정 header에서 로고 + `누리맵` 브랜드를 왼쪽에, `로그아웃` control을 오른쪽에 표시한다.
- 모바일 목록 페이지의 목록 row UI는 desktop browse row와 같은 구조를 재사용한다.
- `장소 추가`를 누르면 같은 목록 영역이 등록 화면으로 전환된다.
- 등록 화면을 닫으면 사용자는 직전 목록 상태로 돌아간다.
- `장소 추가` 진입과 닫기 동안 현재 browse/detail URL은 place add 전용 route로 바뀌지 않는다.
- 목록 상태는 `place_list_load = idle | loading | empty | ready | error`로 관리한다.
- 목록 로딩 중에는 진행 중 상태를 표시한다.
- 목록 데이터가 0건이면 empty state를 표시한다.
- 목록 로딩 실패 시 현재 목록 영역에서 에러와 재시도 액션을 표시한다.

## Acceptance Criteria
- 목록에 평균 별점과 리뷰 수, 장소 유형이 보인다.
- `zeropay_status = available`인 place 목록 item에는 제로페이 가능 표시가 보인다.
- desktop pointer 환경에서는 제로페이 가능 표시의 의미를 확인할 수 있다.
- `zeropay_status = unavailable | needs_verification`인 place 목록 item에는 제로페이 로고가 보이지 않는다.
- 목록 선택 시 상세 화면이 열리고 canonical detail URL이 반영된다.
- 모바일 목록 페이지에서 place 선택 시 전체 화면 상세 페이지가 열린다.
- 모바일 목록 페이지에서 상단 고정 brand/logout header를 확인할 수 있다.
- 목록 로딩 중에는 진행 중 상태가 보인다.
- 목록 데이터가 없으면 empty state가 보인다.
- 목록 로딩 실패 시 재시도 액션을 확인할 수 있다.
- 장소 추가 진입 시 목록 영역이 등록 화면으로 바뀌고 URL은 place add 전용 path로 바뀌지 않는다.
- 등록 화면을 닫으면 목록 탐색 맥락으로 복귀한다.

## TDD Implementation Order
1. 목록 표시 필드 테스트를 작성한다.
2. 제로페이 로고 표시 테스트를 작성한다.
3. 상세 연동 + canonical route 테스트를 작성한다.
4. 모바일 목록에서 전체 화면 상세 이동 테스트를 작성한다.
5. 목록 영역 전환 테스트를 작성한다.
6. 목록 로딩 상태 테스트를 작성한다.
7. 빈 목록 상태 테스트를 작성한다.
8. 목록 로딩 실패 상태 테스트를 작성한다.
9. 구현한다.
10. 전체 테스트를 통과시킨다.

## Required Test Cases
- 이름/평균 별점/리뷰 수/장소 유형 표시
- `zeropay_status = available`일 때 제로페이 가능 표시
- desktop pointer 환경에서 제로페이 보조 설명 확인 가능
- `zeropay_status = unavailable | needs_verification`일 때 제로페이 로고 미표시
- 목록 선택 시 상세 연동 + canonical route 반영
- 모바일 목록 페이지에서 place 선택 시 전체 화면 상세 이동
- 목록 영역 전환
- 목록 로딩 상태 표시
- 데이터 없음 상태 처리
- 목록 로딩 실패 시 재시도
- place add 진입/닫기 시 URL 유지

## Manual QA Checklist
- 목록에서 place 비교가 가능하다.
- row 하단 메타 라인에서 장소 유형까지 함께 보인다.
- 제로페이 가능 place에는 제로페이 가능 표시가 보인다.
- desktop pointer 환경에서는 제로페이 보조 설명을 확인할 수 있다.
- 제로페이 미확인 또는 불가 place에는 제로페이 로고가 보이지 않는다.
- 클릭 시 상세가 열리고 URL이 해당 place detail로 바뀐다.
- 모바일 목록 페이지에서 place를 누르면 전체 화면 상세 페이지가 열린다.
- 장소 추가 진입 시 같은 목록 영역이 등록 화면으로 바뀌고 URL은 그대로 유지된다.
- 목록 로딩 중 진행 상태가 보인다.
- 목록 데이터가 없을 때 empty state가 보인다.
- 목록 로딩 실패 시 재시도 액션이 보인다.

## QA Evidence
- 테스트 실행 결과
- 목록 수동 검증 결과
