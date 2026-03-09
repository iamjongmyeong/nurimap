# Spec: App Shell And Layout

## Summary
Nurimap의 기본 앱 셸, 데스크톱/모바일 레이아웃, 탐색용 화면 골격을 정의한다.

## Scope
- 앱 기본 레이아웃
- 데스크톱 사이드바
- 데스크톱 floating detail panel
- 모바일 floating button UI
- 기본 빈 상태/로딩 상태
- 선택 상태 공유 골격

## Out Of Scope
- 로그인 구현
- place 저장
- 실제 외부 API 연동

## AI Agent Instructions
- 초기 단계에서는 목업 데이터 사용을 허용한다.
- 프론트엔드 구현 스택은 Vite + React를 기준으로 한다.
- 스타일링은 Tailwind CSS + daisyUI를 기준으로 한다.
- 상태 관리가 필요하면 Zustand 같은 React 라이브러리를 사용할 수 있다.
- 레이아웃 구조를 먼저 고정하고 세부 데이터 연동은 이후 spec에서 붙인다.
- 데스크톱과 모바일을 별도 상태로 테스트한다.

## Functional Requirements
- 데스크톱에서는 지도 전체 화면 + 왼쪽 사이드바 구조를 사용한다.
- 데스크톱 상세는 지도 위에 떠 있는 floating panel 구조를 사용한다.
- 데스크톱 상세 패널은 사이드바 오른쪽에 배치하고 너비 `390px`, 상단 inset `24px`, 하단 inset `24px`, 사이드바와 간격 `24px`를 사용한다.
- 데스크톱 상세 패널의 높이 `calc(100vh - 48px)`는 상단 bar가 아니라 상단/하단 inset 합을 의미한다.
- 데스크톱 상세 패널은 둥근 모서리와 그림자를 가진 카드처럼 보이고, 지도는 패널 뒤에서 계속 보여야 한다.
- 모바일에서는 지도 전체 화면 + 하단 floating button UI 구조를 사용한다.
- 모바일 floating button UI는 `목록 보기`, `장소 추가` 두 버튼으로 구성한다.
- `목록 보기` 버튼은 모바일 장소 목록 페이지로 이동한다.
- place 추가 버튼은 데스크톱 사이드바 상단에 `342px x 48px` 버튼으로 배치한다.
- 데스크톱에서는 floating button을 사용하지 않는다.
- 목록, 상세, 선택 상태를 수용할 수 있는 레이아웃 골격을 제공한다.

## Acceptance Criteria
- 데스크톱과 모바일 기본 구조가 문서 정의와 일치한다.
- place 데이터가 없어도 레이아웃이 깨지지 않는다.
- place 추가 버튼이 데스크톱 사이드바 상단에 보인다.
- 데스크톱 상세 패널이 지도 위에 floating panel로 보인다.
- 데스크톱 상세 패널 뒤에 지도가 계속 보인다.
- 모바일에서 `목록 보기`, `장소 추가` floating button이 보인다.

## TDD Implementation Order
1. 데스크톱 레이아웃 테스트를 작성한다.
2. 데스크톱 floating detail panel 레이아웃 테스트를 작성한다.
3. 모바일 floating button 레이아웃 테스트를 작성한다.
4. 모바일 `목록 보기` 버튼 이동 테스트를 작성한다.
5. place 추가 버튼 위치와 크기 테스트를 작성한다.
6. 빈 상태 렌더링 테스트를 작성한다.
7. 구현한다.
8. 전체 테스트를 통과시킨다.

## Required Test Cases
- 데스크톱 사이드바 렌더링
- 데스크톱 floating detail panel 렌더링
- 데스크톱 상세 패널 뒤 지도 노출
- 모바일 floating button 렌더링
- 모바일 `목록 보기` 버튼 이동
- place 추가 버튼 위치/크기
- 빈 상태 화면 표시

## Manual QA Checklist
- 데스크톱에서 사이드바가 정상 배치된다.
- 데스크톱에서 상세가 지도 위에 떠 있는 카드처럼 보인다.
- 데스크톱에서 상세 패널 뒤에 지도가 계속 보인다.
- 모바일에서 floating button UI가 정상 표시된다.
- 모바일에서 `목록 보기` 버튼이 목록 페이지로 이동한다.
- place 추가 버튼이 floating이 아닌 상단 버튼으로 보인다.

## QA Evidence
- 테스트 실행 결과
- 데스크톱/모바일 레이아웃 수동 검증 결과
