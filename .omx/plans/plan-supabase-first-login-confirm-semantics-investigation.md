# Plan: Investigate whether `email_confirm: true` can be removed from first-login OTP provisioning

## Requirements Summary
- Determine whether Nurimap can stop pre-marking first-login users as `email_confirm: true` while still preserving the canonical OTP-first contract required by:
  - `docs/03-specs/05-auth-email-login-link.md:24-27,73-84,95-105`
  - `docs/02-architecture/security-and-ops.md:33-43`
- Focus on the current auth flow at:
  - `src/server/authService.ts:347-385,458-526,529-586`
  - mirrored serverless copy `api/_lib/_authService.ts`
- Current local Supabase config is not production-like for this question because `supabase/config.toml:201-216` sets `enable_confirmations = false`.

## What We Know Already
- Current production fix provisions a missing first-login user with `auth.admin.createUser({ email, email_confirm: true })` before sending OTP with `signInWithOtp({ shouldCreateUser: false })` (`src/server/authService.ts:352-385`).
- This removed the unwanted signup-confirmation mail path, but it also creates the design risk that Supabase sees the user as confirmed before mailbox proof (`src/server/authService.ts:352-356`).
- Official Supabase docs confirm:
  - `signInWithOtp()` auto-signs up missing users unless `shouldCreateUser: false` is set: https://supabase.com/docs/reference/javascript/auth-signinwithotp
  - email OTP vs link behavior depends on email template variables such as `{{ .Token }}` vs `{{ .ConfirmationURL }}`: https://supabase.com/docs/guides/auth/auth-email-templates
  - `verifyOtp({ email, token, type: 'email' })` is the canonical email OTP verify path: https://supabase.com/docs/reference/javascript/auth-verifyotp
- What the docs do **not** make explicit enough: how Supabase behaves for an **existing but unconfirmed** user when we call `signInWithOtp({ shouldCreateUser: false })`.

## Acceptance Criteria
- We produce an evidence-backed answer to this specific design question:
  - Can Nurimap switch first-login provisioning from `email_confirm: true` to a safer alternative without reintroducing signup-confirmation email behavior?
- The answer includes a behavior matrix for at least these cases:
  1. missing user + `signInWithOtp({ shouldCreateUser: false })`
  2. admin-created user with `email_confirm: false` + `signInWithOtp({ shouldCreateUser: false })`
  3. admin-created user with `email_confirm: true` + `signInWithOtp({ shouldCreateUser: false })`
  4. effect of confirmation-enabled environment vs current local config
- The final recommendation clearly says one of:
  - keep current `email_confirm: true`
  - switch to `email_confirm: false`
  - use another provisioning pattern
- The recommendation includes exact follow-up code/doc changes if action is warranted.

## Investigation Steps
1. **Doc-grounded hypothesis pass**
   - Re-read the official Supabase docs that govern the current path:
     - `auth-signinwithotp`
     - `auth-verifyotp`
     - `auth-email-templates`
     - admin create-user reference
   - Extract only the parts that constrain missing user signup, confirmed/unconfirmed user semantics, template behavior, and OTP verification.
   - Output: a short “known vs unknown” matrix so we do not over-interpret docs.

2. **Make local reproduction environment match the hosted question**
   - Create an isolated investigation setup because `supabase/config.toml:207-208` currently disables confirmations locally.
   - Run a local Supabase stack variant (or temporary config change on a disposable local run) with `enable_confirmations = true`.
   - Preserve current repo default config after the experiment; this step is for investigation only, not a product change.

3. **Run the behavior matrix empirically**
   - For each scenario, record:
     - request API response
     - resulting email subject/body in Mailpit or equivalent local mail capture
     - whether OTP code or confirmation link is sent
     - whether `verifyOtp({ email, token, type: 'email' })` succeeds
   - The minimum matrix is:
     - A. missing user + `signInWithOtp({ shouldCreateUser: false })`
     - B. `admin.createUser({ email_confirm: false })` then `signInWithOtp({ shouldCreateUser: false })`
     - C. `admin.createUser({ email_confirm: true })` then `signInWithOtp({ shouldCreateUser: false })`
   - If needed, include a fourth case with current app email templates to distinguish Supabase behavior from template wording.

4. **Decide the safest viable pattern**
   - If case B preserves OTP mail and verify semantics, propose replacing `email_confirm: true` in `src/server/authService.ts:352-356` / `api/_lib/_authService.ts`.
   - If case B fails or falls back to signup-confirmation semantics, document that the current design is a deliberate Supabase workaround and keep the current code.
   - In either direction, define required compensating controls:
     - app-session boundary already re-checks allowed email (`src/server/authService.ts:571-586`)
     - additional notes if Supabase `email_confirmed` must never be trusted by downstream logic

5. **Produce a decision artifact before any code change**
   - Write a short recommendation note or decision entry summarizing:
     - evidence matrix
     - chosen direction
     - tradeoffs
     - whether a follow-up implementation slice is justified

## Risks And Mitigations
- **Risk:** local test results may be misleading because current repo config disables confirmations.
  **Mitigation:** run the experiment only in a disposable local stack where confirmations are explicitly enabled.
- **Risk:** email template wording may hide the true auth-path semantics.
  **Mitigation:** capture both provider behavior (request/verify outcome) and raw email content.
- **Risk:** changing code before the matrix is complete could reintroduce “Confirm your signup” mail in production.
  **Mitigation:** keep this slice investigation-only until the behavior matrix is complete.

## Verification Steps
- Confirm current code anchor:
  - `src/server/authService.ts:352-385`
  - `src/server/authService.ts:571-586`
- Confirm local auth confirmation setting:
  - `supabase/config.toml:201-216`
- Collect official-doc citations:
  - https://supabase.com/docs/reference/javascript/auth-signinwithotp
  - https://supabase.com/docs/reference/javascript/auth-verifyotp
  - https://supabase.com/docs/guides/auth/auth-email-templates
- Record empirical results for each scenario in a single comparison table before recommending any code change.

## Expected Output
- A yes/no answer on whether `email_confirm: true` can be removed safely
- The exact scenario matrix proving it
- A concrete next action: keep current workaround or open a small implementation slice
