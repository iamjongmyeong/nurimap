# Browse And Detail Design

이 문서는 지도 탐색, 목록 탐색, 데스크톱 상세 패널, 모바일 상세 화면의 UI 구조와 상호작용 규칙을 정의한다.

관련 문서:
- [Browse And Detail User Flow](../01-product/user-flows/browse-and-detail.md)
- [Map Rendering Spec](../03-specs/02-map-rendering.md)
- [List Browse Spec](../03-specs/03-list-browse.md)
- [Place Detail Spec](../03-specs/04-place-detail.md)
- [Design Foundations](./foundations.md)

## Desktop Layout `>= 768px`

### Base State
- 지도를 전체 화면으로 표시한다.
- 왼쪽에 목록 정보 사이드바를 띄운다.
  - 너비: `390px`
  - 높이: 전체 높이
  - 배경색: `#fff`
  - 폰트: `Pretendard`
- 사이드바에는 접기/펼치기 버튼이 있다.
- 사이드바 최상단에는 compact top bar를 배치한다.
  - wrapper card 없이 header처럼 동작해야 한다.
  - sidebar 상단 padding에 밀리지 않고 top edge에 바로 붙어야 한다.
  - 장소 목록이 scroll되어도 고정된 header처럼 유지되어야 한다.
  - 왼쪽: 36px 정사각 로고와 `누리맵` wordmark
  - 오른쪽: `추가` 라벨의 compact CTA button
  - floating button은 사용하지 않는다.
- browse title 텍스트는 별도 row로 두지 않는다.
- `추가` button은 shadow 없이 pointer cursor로 동작한다.
- `추가` button label weight는 `600`으로 유지한다.
- `추가` button height는 `36px`로 유지한다.
- `로그아웃`은 장소 목록 최하단의 작은 text action으로 footer처럼 계속 접근 가능해야 하며, sidebar bottom edge에 바로 붙어 vertical center 정렬을 유지해야 한다.
- `로그아웃` text action은 hover 시 `#E52E30`로 변하고 pointer cursor를 보여주며, 클릭 시 browser confirm으로 로그아웃 여부를 먼저 확인해야 한다.
- 기본 상태에서는 장소 목록을 보여준다.
- `장소 추가`를 누르면 별도 panel을 띄우지 않고, **같은 사이드바 내용이 등록 화면으로 전환**된다.

### Detail State
- 목록 또는 지도에서 장소 선택 시 목록 영역 안의 내용이 상세 화면으로 전환된다.
- 데스크톱 상세는 별도 floating panel을 띄우지 않는다.
- 상세 화면 상단에는 뒤로 가기 affordance를 두고, 뒤로 가기 시 목록 상태로 복귀한다.
- 지도는 상세와 병렬로 계속 보이지만, 상세 UI는 사이드바 내부에서만 전환된다.

## Mobile Layout `< 768px`

### Base State
- 지도를 전체 화면으로 표시한다.
- 화면 하단에 floating button UI를 배치한다.
  - 버튼 구성: `목록 보기`, `장소 추가`
  - 위치: 화면 하단
- `목록 보기` 버튼을 누르면 장소 목록 페이지로 이동한다.
- `장소 추가` 버튼을 누르면 **별도 전용 등록 페이지가 아니라 모바일 목록 화면이 등록 화면으로 바뀐다.**

### Detail State
- 장소 목록 페이지 또는 지도에서 장소 선택 시 장소 상세 화면을 연다.
- 모바일 장소 상세 화면은 전체 화면 페이지로 표시한다.
- 왼쪽 화살표 모양 뒤로 가기 버튼을 누르면 지도 화면으로 이동한다.
- 브라우저 기본 뒤로 가기도 화면의 뒤로 가기 버튼과 같은 동작을 해야 한다.
- 지도 화면으로 돌아갈 때 선택한 장소를 유지한다.
- 지도 화면으로 돌아갈 때 지도는 선택한 장소 위치를 기준으로 보여준다.

## 목록 영역 전환
- 목록 영역은 기본적으로 장소 목록을 보여준다.
- 장소 추가를 누르면 같은 영역이 등록 화면으로 바뀐다.
- 등록 화면을 닫으면 이전 목록 상태로 돌아간다.

## Interaction Notes
- 장소 목록 item 상단 row에는 이름을 왼쪽에, `zeropay_status = available`인 경우에만 blue QR icon을 오른쪽에 배치한다.
- Sprint 15 목록 row는 Figma 기준으로 road address를 카드 본문에 직접 노출하지 않는다.
- 장소 목록 item 하단 row에는 평균 별점, 리뷰 수, 회색 place type icon + label을 같은 메타 라인에 배치한다.
- 평균 별점 아이콘은 `public/assets/icons/icon-rating-star-red-16.svg` asset을 사용한다.
- 목록 QR icon은 `public/assets/icons/icon-payment-zeropay-accent.svg` asset을 사용한다.
- 목록 place type icon은 `public/assets/icons/icon-place-type-restaurant-muted.svg`, `public/assets/icons/icon-place-type-cafe-muted.svg` asset을 사용한다.
- 목록의 제로페이 QR icon은 desktop pointer hover가 `1초` 이상 유지되면 `제로페이 가능` 텍스트를 tooltip으로 표시한다.
- 목록 row는 sidebar 안에서 full-bleed white row처럼 보이도록 배치하고, place 사이에는 `#F0F0F0` divider line을 둔다.
- 목록 row는 hover 시 background color를 바꾸지 않고 pointer cursor만 보여준다.
- divider line은 위아래 `4px` margin을 유지한다.
- `zeropay_status = available`인 경우에만 이름 row 우측에 blue QR icon을 표시한다.
- `zeropay_status = unavailable | needs_verification`이면 목록 이름 row 우측에 QR icon을 표시하지 않는다.
- 데스크톱 상세는 사이드바 내부 전환 방식으로 표시한다.
- 모바일 장소 상세 화면은 전체 화면 페이지로 표시한다.
- 데스크톱과 모바일 detail은 같은 visual language를 우선 사용하되, 데스크톱에서는 지도 + 왼쪽 sidebar surface를 유지한다.
- 상세 상단 header는 단순한 back affordance 중심 구조를 사용하고, 브랜드/타이틀 chrome을 과하게 추가하지 않는다.
- 상세 back affordance는 `public/assets/icons/icon-navigation-back-24.svg` asset을 사용한다.
- 상세 back affordance hit area는 시각적으로 `24px x 24px` 기준을 사용하고, hover 시 pointer cursor를 보여준다.
- 상세 정보 블록은 장소명, 주소, 장소 추가자 이름, 장소 유형, 제로페이 가능 여부, 평점/리뷰 수 순서의 flat row 구조를 사용한다.
- 상세 정보 블록의 하단 spacing은 `24px`를 유지한다.
- 모바일 장소 상세 화면의 뒤로 가기 버튼과 브라우저 기본 뒤로 가기는 같은 동작을 해야 한다.
- 모바일 장소 상세 화면에서 지도 화면으로 복귀할 때 선택한 장소는 유지한다.
- 모바일 장소 상세 화면에서 지도 화면으로 복귀할 때 지도는 선택한 장소 위치를 기준으로 보여준다.
- 이번 1차 상세 UI는 리뷰 읽기 중심 구조이며, 네이버 이동 / 추천 / 내 리뷰 / 리뷰 작성 UI는 포함하지 않는다.
- 상세의 리뷰/평가 리스트는 최신 항목이 위에서 아래로 오도록 정렬한다.
- 리뷰 항목은 작성자, 날짜, 별점 row를 기본으로 하고, 본문이 비어 있으면 본문 줄을 표시하지 않는다.
- 리뷰 item은 flat list로 보이고, 리뷰가 0건이면 `평가 및 리뷰` 섹션은 유지하되 empty-state용 별도 문구나 카드는 노출하지 않는다.
- 지도 라벨은 기본적으로 `level 1-5`에서 표시하고 `level 6`부터 숨긴다.
- 모바일에서 지도 화면, 장소 목록 페이지, 상세 화면의 전환은 사용자가 맥락을 잃지 않도록 유지해야 한다.
