# Sprint 17 Post-release Fix Plan

## Requirements Summary
- Fix fresh login links being reported as already used in deployed environments, especially when links are opened outside the original browser/session.
- Fix deployed `/api/place-entry` so place registration returns valid JSON instead of a generic server error page.
- Investigate slow mailbox arrival despite fast app response, implement only low-risk observability or code-path improvements that materially help diagnosis without broadening scope.
- After implementation, run code review and address blocking findings.

## Acceptance Criteria
1. A newly issued auth link is not marked as used merely because verify-link was called before session adoption completes.
2. Opening a fresh auth link in a different browser/session does not immediately fail with `used` unless the link was genuinely consumed.
3. `/api/place-entry` in deployed/Vercel environments returns JSON success/error payloads rather than HTML server-error output for valid authenticated requests.
4. Existing auth failure copy, resend policy, canonical `/auth/verify`, and `/places/:placeId` behavior remain intact.
5. Tests, lint, and build pass after fixes.
6. Code review is run on the final diff and any HIGH/CRITICAL issues are fixed.

## Implementation Steps
1. Trace the auth link consumption boundary and change nonce lifecycle so `verify-link` validation does not permanently consume a link before login completion is confirmed.
2. Reproduce and fix the deployed `place-entry` server error path, prioritizing Vercel/api-boundary compatibility issues.
3. Add minimal delivery-path observability or instrumentation for request-link latency/delivery diagnosis without redesigning the auth system.
4. Update tests and sprint QA/review docs with new evidence.
5. Run code review and fix any blocking findings.

## Risks and Mitigations
- Risk: auth nonce changes could weaken single-use guarantees.
  - Mitigation: preserve one-time use at finalize/consumption time and add regression tests for used/invalidated/expired paths.
- Risk: fixing place-entry could diverge dev and Vercel behavior.
  - Mitigation: keep shared api/_lib boundary aligned with production imports and verify via build + tests.
- Risk: mail delay may be external to the app.
  - Mitigation: limit code changes to observability and keep non-code deliverability actions as explicit follow-ups.

## Verification Steps
- `pnpm exec vitest run src/auth/AuthFlow.test.tsx src/auth/authVerification.test.ts src/server/authPolicy.test.ts src/server/authService.test.ts src/server/placeEntryService.test.ts src/app-shell/PlaceRegistrationFlow.test.tsx`
- `pnpm lint`
- `pnpm build`
- Browser verification for auth link in fresh browser context and deployed place-entry flow if reproducible.
