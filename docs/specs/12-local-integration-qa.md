# Spec: Local Integration QA

## Summary
로그인 전 핵심 사용자 기능을 로컬 환경에서 통합 검증하는 절차를 정의한다.

## Scope
- place 추가 흐름 검증
- 지도/목록/상세 연동 검증
- 반응형 검증
- 주요 실패 상태 수동 검증

## Out Of Scope
- 실제 배포
- 운영 모니터링

## AI Agent Instructions
- 이 spec은 구현 spec이 아니라 검증 spec이다.
- 실패 시 원인을 기록하고 관련 spec 또는 코드 수정으로 되돌아간다.
- 검증 결과는 pass/fail로 남긴다.

## Functional Requirements
- 로컬에서 place 추가 전체 흐름이 동작해야 한다.
- 지도, 목록, 상세 상태가 서로 연결되어야 한다.
- 데스크톱/모바일 반응형이 문서 정의와 일치해야 한다.
- 네이버 응답 실패, 좌표 확보 실패, 잘못된 URL 등 주요 오류 상태를 확인해야 한다.

## Acceptance Criteria
- place 추가부터 탐색까지 로컬에서 한 흐름으로 검증된다.
- 데스크톱/모바일 공통 시나리오가 통과한다.
- 주요 실패 상태가 사용자에게 이해 가능한 방식으로 보인다.

## TDD / QA Order
1. 관련 자동화 테스트를 모두 실행한다.
2. 실패 테스트를 정리한다.
3. 데스크톱 수동 QA를 수행한다.
4. 모바일 수동 QA를 수행한다.
5. 실패 상태 QA를 수행한다.
6. 결과를 기록한다.

## Required Test Cases
- place 추가 성공
- place 상세 이동
- 지도/목록 선택 상태 연동
- 잘못된 URL 실패
- 네이버 응답 실패
- 좌표 확보 실패

## Manual QA Checklist
- 데스크톱에서 place 추가 -> 목록 반영 -> 상세 확인
- 모바일에서 같은 흐름 확인
- 실패 시 alert 또는 에러 메시지 확인

## QA Evidence
- 자동화 테스트 결과
- 데스크톱/모바일 수동 QA 결과
- 실패 상태 검증 결과
