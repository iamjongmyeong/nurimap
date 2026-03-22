# PRD - Docs Writing Durability

## Problem
`docs/` 하위 장기 문서들에 현재 구조, 현재 파일명, 현재 구현 상태, 현재 copy 같은 변경-취약 표현이 섞이면 AI Agent가 장기 규칙과 단기 상태를 구분하기 어려워진다.

## Goal
문서가 현재 결과보다 역할, 판단 기준, 변경 트리거를 먼저 설명하도록 정리해, 구조가 바뀌어도 재작성 비용이 적고 AI Agent가 문서 역할을 더 쉽게 구분하게 한다.

## In Scope
- governance writing rules
- user-flow durable rewrite
- architecture durable rewrite
- selected spec deduplication/clarification
- quick verification scans

## Out Of Scope
- 기능 구현 변경
- history 문서의 의미 변경
- archive 문서 대규모 재작성

## Success Signals
- 장기 문서에서 current-shape 표현 감소
- 문서 역할 경계 명확화
- 중복 설명 감소
- 검증 스캔 기준 통과
