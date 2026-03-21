# Spec: App Shell And Layout

## Summary
Nurimap의 기본 앱 셸, 데스크톱/모바일 browse 레이아웃, map/list/detail/add/add-rating surface 배치를 정의한다.

## Scope
- 앱 기본 레이아웃
- 데스크톱 sidebar browse container
- 모바일 map/list/detail/add/add-rating surface split
- 모바일 browse 하단 고정 탭 바
- 목록 영역 전환
- 기본 빈 상태/로딩 상태
- 선택 상태와 browse context 공유 골격

## Out Of Scope
- 로그인 구현
- place 저장
- 실제 외부 API 연동
- review domain rule과 집계 정책 세부

## AI Agent Instructions
- 초기 단계에서는 목업 데이터 사용을 허용한다.
- 프론트엔드 구현 스택은 Vite + React를 기준으로 한다.
- 스타일링은 Tailwind CSS를 기준으로 하고, 시각 디테일은 현재 Sprint의 external handoff를 따른다.
- 상태 관리가 필요하면 Zustand 같은 React 라이브러리를 사용할 수 있다.
- 레이아웃 구조와 surface/state ownership을 먼저 고정하고 세부 데이터 연동은 이후 spec에서 붙인다.
- 데스크톱과 모바일을 별도 상태로 테스트한다.

## Functional Requirements
- 데스크톱에서는 지도 전체 화면 + 왼쪽 sidebar browse container 구조를 사용한다.
- 데스크톱의 목록, 상세, 장소 추가는 별도 floating panel이 아니라 같은 sidebar browse container 안에서 전환된다.
- 모바일 browse에서는 지도 전체 화면 + 하단 고정 3탭 바 구조를 사용한다.
- 모바일 하단 탭 바는 `지도`, `추가`, `목록` 세 탭으로 구성한다.
- 모바일 하단 탭 바는 map/list primary surface에서 유지되고 active 탭은 현재 surface와 동기화된다.
- 모바일 `지도` 탭은 기본 active browse state이며 현재 지도 surface를 유지한다.
- 모바일 `목록` 탭은 list-family full-screen surface로 이동한다.
- 모바일 `추가` 탭은 별도 durable route를 만들지 않고 같은 list-family surface 계열을 재사용한다.
- 모바일 place add surface가 열리면 하단 탭 바는 보이지 않는다.
- 모바일 detail은 canonical detail route와 연결된 full-screen page로 표시한다.
- 모바일 add-rating은 detail-owned transient child surface이며, durable/shareable route는 계속 `/places/:placeId`를 유지한다.
- list/detail/add/add-rating 전환은 selected spec이 바꾸라고 명시하지 않는 한 selected place와 browse context를 보존한다.
- 데스크톱에서는 하단 floating action 대신 sidebar 상단의 place add CTA를 사용한다.
- 레이아웃 골격은 empty/loading/error 상태에서도 현재 map/list/detail 맥락을 잃지 않아야 한다.

## Acceptance Criteria
- 데스크톱과 모바일 기본 구조가 문서 정의와 일치한다.
- place 데이터가 없어도 레이아웃이 깨지지 않는다.
- 데스크톱의 detail/add가 지도 위 overlay가 아니라 sidebar browse container 안에서 전환된다.
- 모바일에서 하단 고정 3탭 바와 active `지도` 탭이 보인다.
- 모바일에서 map/list 전환 시 active 탭이 현재 surface와 함께 바뀐다.
- 모바일 목록/등록 전환이 같은 list-family surface 계열 안에서 이뤄진다.
- 모바일 detail은 전체 화면으로 열리고, add-rating은 standalone route 없이 detail context 안에서 열린다.
- loading/error 상태에서도 사용자는 현재 browse context를 이해할 수 있다.

## TDD Implementation Order
1. 데스크톱 sidebar browse container 레이아웃 테스트를 작성한다.
2. 데스크톱 list/detail/add 전환 테스트를 작성한다.
3. 모바일 하단 고정 3탭 바 레이아웃 테스트를 작성한다.
4. 모바일 `목록` 탭 이동 테스트를 작성한다.
5. 모바일 detail full-screen 레이아웃 테스트를 작성한다.
6. 모바일 add-rating child surface 상태 전환 테스트를 작성한다.
7. 빈 상태/로딩 상태 테스트를 작성한다.
8. 구현한다.
9. 전체 테스트를 통과시킨다.

## Required Test Cases
- 데스크톱 sidebar browse container 렌더링
- 데스크톱 list/detail/add 전환 렌더링
- 모바일 하단 고정 3탭 바 렌더링
- 모바일 `목록` 탭 이동
- 모바일 detail full-screen 렌더링
- 모바일 add-rating child surface 진입/복귀
- 선택 상태와 browse context 유지
- 빈 상태/로딩 상태 화면 표시

## Manual QA Checklist
- 데스크톱에서 지도 + sidebar browse container가 정상 배치된다.
- 데스크톱에서 상세와 장소 추가가 같은 browse container 안에서 전환된다.
- 모바일에서 하단 고정 3탭 바가 정상 표시된다.
- 모바일에서 `목록` 탭이 목록 surface로 이동한다.
- 모바일 상세가 전체 화면으로 열린다.
- 모바일 add-rating이 detail 안의 child surface로 동작한다.
- loading/error 상태가 현재 browse context를 잃지 않는다.

## QA Evidence
- 테스트 실행 결과
- 데스크톱/모바일 레이아웃 수동 검증 결과
