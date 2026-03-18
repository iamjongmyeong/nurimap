# Sprint Summary

- Sprint 18은 Nurimap auth를 magic link에서 6자리 email OTP로 전면 전환하는 것을 목표로 한다.
- 현재 이 문서는 실행 전 초기화 상태이며, 완료 후 실제 결과와 회고를 반영한다.

# Completed

- 아직 없음

# Not Completed

- 아직 없음

# Carry-over

- 아직 없음

# Change Outcomes
- CHG-01 Auth source-of-truth OTP cutover — pending
- CHG-02 Server auth boundary immediate cutover — pending
- CHG-03 Client auth phase / UI / legacy cleanup — pending

# Risks

- OTP cutover 중 bypass/local auto-login 또는 session restore regression이 생길 수 있다.
- duplicated auth boundary 중 한쪽만 수정돼 Vercel/runtime mismatch가 날 수 있다.
- live deployed email 동작은 local/preview와 다를 수 있다.

# Retrospective

- 실행 후 작성
