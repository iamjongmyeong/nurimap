# Browse And Detail Design

## Applies When
- 지도 탐색, 목록 탐색, desktop sidebar detail, mobile full-screen detail, place add surface, `/places/:placeId` direct entry를 다룰 때 적용한다.
- 상세 안의 review / recommendation module placement와 surface 경계도 이 문서의 일부로 해석한다.
- 세부 정책은 아래 source of truth와 함께 해석한다.
  - `docs/01-product/user-flows/browse-and-detail.md`
  - `docs/01-product/user-flows/review.md`
  - `docs/01-product/user-flows/recommendation.md`
  - `docs/03-specs/02-map-rendering.md`
  - `docs/03-specs/03-list-browse.md`
  - `docs/03-specs/04-place-detail.md`
  - `docs/03-specs/10-review.md`
  - `docs/03-specs/11-recommendation.md`
  - 현재 Sprint의 `docs/05-sprints/sprint-XX/planning.md`

## Visual Source Of Truth
- 현재 작업에 제공된 screenshot / Figma / annotated handoff가 browse/detail의 시각 기준이다.
- handoff가 없으면 기존 responsive surface split(desktop sidebar detail, mobile full-screen detail, shared browse container)을 보존한다.
- 이 문서는 세부 시각 토큰, 자산 경로, 상호작용 타이밍, 문구를 고정하지 않는다.

## Surface Contract
- desktop은 전체 지도 + 왼쪽 sidebar를 browse / detail / place add의 공용 container로 사용한다.
- mobile은 전체 지도 surface를 유지하고, detail은 full-screen page로 열린다.
- desktop detail은 별도 floating panel이 아니라 기존 목록 영역 안에서 열린다.
- place add는 desktop/mobile 모두 기존 목록 영역 계열 surface를 재사용한다.
- detail surface는 장소 요약, review list, recommendation/review action처럼 place detail에 종속된 하위 모듈을 함께 품는다.
- map runtime loading / failure도 browse layout 안에서 처리하고, fake-map 같은 별도 surface로 오해되면 안 된다.

## Transition Contract
- 목록 선택과 지도 선택은 같은 place selection을 공유하고 canonical detail URL(`/places/:placeId`)과 동기화된다.
- desktop detail back, mobile back affordance, browser back은 모두 browse context(`/`) 복귀와 호환돼야 한다.
- direct detail entry(`/places/:placeId`)도 현재 breakpoint에 맞는 같은 detail surface로 열려야 한다.
- place add 진입/닫기는 기존 browse container 안에서 처리하고 add 전용 route를 만들지 않는다.
- place submission 성공 후에는 별도 완료 화면이 아니라 결과 place detail로 이어진다.

## Hidden Invariants
- durable/shareable detail state는 route가 관리하고, transient browse/add UI state는 기존 internal state 경계 안에 남아야 한다.
- 사용자는 map ↔ list ↔ detail 전환 중에도 selected place와 지도 맥락을 잃지 않아야 한다.
- review와 recommendation은 detail의 일부이며 별도 design 문서나 별도 navigation surface로 분리하지 않는다.
- review / recommendation 관련 design 해석은 이 문서로 흡수하고, 동작 정책은 selected spec과 user flow가 맡는다.
- detail submodule의 상세 정책(집계, 권한, 비동기 상태, 작성 규칙)은 selected spec이 source of truth다.

## Failure / Context Rule
- map load, list load, detail load 실패는 현재 browse/detail 맥락을 보존한 채 드러나야 한다.
- review / recommendation 같은 detail submodule failure는 detail context 안에 국소화돼야 하며 selection/navigation을 깨면 안 된다.
- loading/failure 문구, retry policy, runtime fallback 구현 세부는 selected spec / user-flow / architecture 문서를 따른다.
- 이 문서는 detail 내부 module의 세부 문구나 async state naming을 고정하지 않는다.

## Out Of Scope
- 구체적인 시각 수치, 자산 경로, 상호작용 타이밍, tooltip 문구 같은 세부 표현
- auth flow 자체와 auth failure surface 규칙
- review / recommendation의 domain rule, API contract, 집계 정책 세부
- place submission form field 구조의 세부 입력 규칙
