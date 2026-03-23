# Plan: Validate Option 1 — make Supabase confirmation email look and behave like OTP UX

## Requirements Summary
- Validate whether Nurimap can keep Supabase first-login/signup semantics but make the **user-facing email UX** match the normal OTP experience by customizing the **confirmation template**.
- The current auth runtime depends on:
  - first-login provisioning at `src/server/authService.ts:347-385`
  - canonical OTP request contract at `src/server/authService.ts:402-526`
  - canonical OTP verify path at `src/server/authService.ts:529-610`
- Source-of-truth constraints that must remain true:
  - OTP-only login contract and `POST /api/auth/request-otp` / `POST /api/auth/verify-otp` runtime in `docs/03-specs/05-auth-email-login-link.md:24-27,73-84,95-105`
  - publishable auth client for normal `signInWithOtp` / `verifyOtp`, admin only for `auth.admin.*` in `docs/02-architecture/security-and-ops.md:33-43`

## Goal Of This Validation
- Determine whether **template-only customization** can make “unconfirmed first-login” users receive an email that is operationally and visually equivalent enough to the standard OTP mail **without** immediately redesigning the auth flow.

## Key Unknown To Resolve
- Supabase docs confirm that email templates can use `{{ .Token }}` instead of `{{ .ConfirmationURL }}` for OTP-style emails, including confirmation templates:
  - https://supabase.com/docs/guides/auth/auth-email-templates
- But our earlier matrix already showed that with confirmations enabled:
  - missing user + `shouldCreateUser:true` sends **confirmation** semantics
  - existing unconfirmed user + `shouldCreateUser:false` still sends **confirmation** semantics
- What remains unknown is:
  - if the **confirmation template** is switched to a `{{ .Token }}` OTP body, can Nurimap’s current verify path (`verifyOtp({ email, token, type: 'email' })`) still complete successfully, or does confirmation/signup semantics still require a different verify contract?

## Acceptance Criteria
- We produce a behavior table for the confirmation-template-as-OTP experiment covering at least:
  1. missing user + `signInWithOtp({ shouldCreateUser: true })`
  2. existing unconfirmed user + `signInWithOtp({ shouldCreateUser: false })`
  3. existing confirmed user + `signInWithOtp({ shouldCreateUser: false })` as control
- For each case, we capture:
  - request result
  - email subject
  - email body shape (`{{ .Token }}` OTP vs link)
  - whether current Nurimap verify semantics succeed:
    - `verifyOtp({ email, token, type: 'email' })`
  - if needed, whether alternate Supabase verify semantics are required:
    - `verifyOtp({ email, token, type: 'signup' })` or `token_hash` flow
- The final recommendation must clearly answer:
  - **Can Option 1 preserve the current Nurimap verify contract unchanged?**
  - **If not, is Option 1 still acceptable as a UX-only improvement or should it be rejected?**

## Implementation / Validation Steps
1. **Prepare an isolated confirmation-enabled local Supabase stack**
   - Do not mutate the repo’s default local runtime permanently.
   - Use a disposable workdir derived from `supabase/config.toml:201-216,228-230`.
   - Enable confirmations and override only the auth email templates needed for the experiment.

2. **Create two template variants**
   - Variant A: current-style confirmation template using `{{ .ConfirmationURL }}`
   - Variant B: OTP-style confirmation template using `{{ .Token }}`
   - Keep the magic-link template OTP-style as a control so we can compare confirmation vs normal OTP paths using the same mailbox capture.

3. **Run the auth behavior matrix**
   - Execute the same three user states under Variant B:
     - missing user + autocreate
     - existing unconfirmed user
     - existing confirmed user
   - Capture Mailpit evidence:
     - subject
     - text/html body
     - whether the message is UX-equivalent to Nurimap OTP mail
   - Then test verification:
     - first with current Nurimap semantics: `type: 'email'`
     - only if needed, compare with Supabase signup semantics to see whether the email merely *looks* like OTP while still requiring different verification.

4. **Evaluate compatibility with current Nurimap code**
   - Compare results against the current verify implementation at `src/server/authService.ts:552-586`.
   - Decision gate:
     - **PASS** if confirmation-template OTP works with current verify contract and does not require app-side semantic branching.
     - **CONDITIONAL** if UX becomes uniform but verify semantics diverge and would require new code paths.
     - **FAIL** if confirmation-template OTP still cannot deliver a safe, supportable first-login UX.

5. **Produce a go / no-go recommendation**
   - If PASS:
     - open a small implementation slice to apply hosted Supabase template changes and minimal docs/QA updates
   - If CONDITIONAL or FAIL:
     - keep current `email_confirm: true` workaround and treat Option 1 as rejected or deferred

## Risks And Mitigations
- **Risk:** confirmation template can be made to look like OTP, but actual verify semantics may still be signup-specific.
  **Mitigation:** explicitly test both current `type: 'email'` verification and any alternate Supabase-required verification before recommending rollout.
- **Risk:** a UX-only solution can hide semantic divergence and create future maintenance confusion.
  **Mitigation:** require a decision gate on “current verify contract unchanged” before approving Option 1 as a production direction.
- **Risk:** hosted project templates can differ from local templates.
  **Mitigation:** if local proof is promising, include one hosted-config inspection step before rollout.

## Verification Steps
- Confirm current app contract anchors:
  - `src/server/authService.ts:347-385`
  - `src/server/authService.ts:402-526`
  - `src/server/authService.ts:552-586`
- Confirm source-of-truth auth requirements:
  - `docs/03-specs/05-auth-email-login-link.md:24-27,73-84,95-105`
  - `docs/02-architecture/security-and-ops.md:33-43`
- Capture email evidence from Mailpit for both confirmation-template variants.
- Save a final behavior matrix with:
  - case
  - template variant
  - email subject/body shape
  - verify method tried
  - result

## Decision Rule
- **Recommended to proceed with Option 1 only if**:
  - confirmation-template OTP yields a user-visible OTP email,
  - current Nurimap verify contract (`type: 'email'`) still works,
  - no new app auth branch is required.
- Otherwise, Option 1 should be treated as a partial UX disguise, not a clean operational fix.
