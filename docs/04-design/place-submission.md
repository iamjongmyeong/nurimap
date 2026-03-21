# Place Submission Design

## Applies When
- 장소 추가 진입, 등록 form surface, geocoding/duplicate/save failure, 성공 후 detail 전환을 다룰 때 적용한다.
- place registration과 merge, 초기 review capture는 같은 submission contract 안에서 해석한다.
- 세부 정책은 아래 source of truth와 함께 해석한다.
  - `docs/01-product/user-flows/place-submission.md`
  - `docs/03-specs/08-place-registration.md`
  - `docs/03-specs/09-place-merge.md`
  - `docs/03-specs/10-review.md`
  - `docs/02-architecture/domain-model.md`
  - 현재 Sprint의 `docs/05-sprints/sprint-XX/planning.md`

## Visual Source Of Truth
- 현재 작업에 제공된 screenshot / Figma / annotated handoff가 place submission surface의 시각 기준이다.
- handoff가 없으면 기존 browse container 안에서 열리는 single-surface form 구조를 보존한다.
- current Sprint가 mobile add surface를 새로 정리하더라도, 이 문서는 시각 토큰이 아니라 surface contract만 고정한다.
- 이 문서는 세부 레이아웃 수치, 필드 스타일, 아이콘 처리, 문구를 고정하지 않는다.

## Surface Contract
- place submission은 별도 페이지나 detached modal이 아니라 기존 browse container 안에서 열린다.
- desktop은 sidebar, mobile은 목록 영역 계열 surface가 submission container 역할을 한다.
- submission은 이름, 주소, place metadata, rating, optional review를 한 흐름으로 다루는 단일 form surface다.
- 등록 전 lookup/geocode/merge 판단이 필요해도 사용자는 같은 form surface 안에서 계속 맥락을 유지해야 한다.
- 상단에는 browse context로 돌아가는 back/close affordance가 있고, 성공 시에는 별도 완료 화면 대신 결과 detail surface로 전환된다.

## Transition Contract
- `장소 추가` 진입은 browse context에서 시작하고 URL을 add 전용 route로 바꾸지 않는다.
- 닫기/뒤로 가기는 직전 browse context로 돌아가야 하며, dirty draft 처리 방식은 selected spec을 따른다.
- 제출 후에는 validate -> geocode -> dedupe/merge decision -> persist 흐름으로 진행하고, 각 단계 실패 시 사용자는 같은 submission context에 남는다.
- duplicate place 경로에서 기존 place에 반영하기로 선택한 경우에도 별도 flow로 이탈하지 않고 같은 submission contract 안에서 완료된다.

## Hidden Invariants
- geocoding은 저장 전 내부 처리 단계이며 사용자가 별도 지도/검색 flow로 이동하지 않아야 한다.
- duplicate handling, merge, initial review capture는 submission의 일부이지 별도 feature detour가 아니다.
- 실패나 confirm 이후에도 사용자가 입력한 draft와 browse 맥락은 불필요하게 소실되면 안 된다.
- submission은 auth를 우회하거나 browse/detail routing contract를 바꾸면 안 된다.

## Failure / Context Rule
- validation, geocoding, duplicate confirm, save failure는 submission surface 안에서 해석돼야 한다.
- 실패 시 입력 유지, merge policy, review overwrite rule, 저장 결과 반영 규칙은 selected spec / user-flow / architecture 문서가 source of truth다.
- geocoding fallback 순서, merge 기준, overwrite 세부는 이 문서가 아니라 selected spec과 architecture에서 고정한다.
- 이 문서는 alert/confirm 문구, field-level error 문구, spinner 표현을 고정하지 않는다.
- submission 실패가 browse/detail 전체 맥락 상실로 이어지면 안 된다.

## Out Of Scope
- field order의 시각 수치, component styling, icon/star interaction 세부
- geocoding provider / persistence implementation / API shape
- 별도 add-place route, multi-step wizard, detached success screen
- browse/detail 또는 auth surface의 세부 visual rule
