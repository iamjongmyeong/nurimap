# Spec: Release Hardening

## Summary
첫 배포 전 필요한 운영 안정화와 보안/검색 차단 작업을 정의한다.

## Scope
- 검색 엔진 차단
- 환경변수 분리
- 에러/로그 정책
- 캐시 및 실패 UX 정리

## Out Of Scope
- 신규 사용자 기능 추가

## AI Agent Instructions
- 사용자 기능 추가보다 운영 안전장치 적용을 우선한다.
- 배포 전 검증 항목을 빠짐없이 실행한다.

## Functional Requirements
- `robots.txt`, `noindex`, `nofollow`, `X-Robots-Tag`를 적용한다.
- 공개/비공개 환경변수를 분리한다.
- Naver 조회 실패와 인증 요청 실패를 운영 로그에 남긴다.
- Naver 조회 캐시와 실패 modal/error UX를 정리한다.
- 배포 전 검증 절차를 문서와 구현에 맞춘다.

## Acceptance Criteria
- 검색 엔진 차단이 적용된다.
- 민감한 값이 클라이언트에 노출되지 않는다.
- 주요 실패 상태가 로그와 UI 양쪽에서 확인 가능하다.

## TDD / QA Order
1. robots/noindex 관련 테스트를 작성한다.
2. 환경변수 노출 방지 검증을 작성한다.
3. 실패 로그 기록 검증을 작성한다.
4. 구현 또는 설정 반영 후 검증한다.

## Required Test Cases
- robots 차단 응답
- 메타 noindex 존재
- X-Robots-Tag 존재
- 민감 env 미노출
- 실패 로그 기록

## Manual QA Checklist
- 페이지 소스에서 noindex 확인
- robots 응답 확인
- 실패 상황 후 로그 확인

## QA Evidence
- 설정 검증 결과
- 보안/검색 차단 수동 검증 결과
