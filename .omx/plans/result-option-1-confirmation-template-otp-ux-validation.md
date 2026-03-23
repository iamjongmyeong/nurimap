# Result: Option 1 validation — confirmation template as OTP UX

## Scope
- Validation target: `.omx/plans/plan-option-1-confirmation-template-otp-ux-validation.md`
- Current auth code anchors:
  - `src/server/authService.ts:347-385`
  - `src/server/authService.ts:458-526`
  - `src/server/authService.ts:552-586`
- Source-of-truth auth constraints:
  - `docs/03-specs/05-auth-email-login-link.md:24-27,73-84,95-105`
  - `docs/02-architecture/security-and-ops.md:33-43`

## Why local repro was needed
- Repo default local Supabase config is **not** confirmation-enabled:
  - `supabase/config.toml:201-216` shows `enable_confirmations = false`
- To answer the real production-like question, the experiment used **disposable local Supabase stacks** with:
  - `enable_confirmations = true`
  - Mailpit capture
  - template Variant A and Variant B

## Official-doc constraints used
- `signInWithOtp()` can auto-sign up missing users unless `shouldCreateUser: false` is used:
  - https://supabase.com/docs/reference/javascript/auth-signinwithotp
- `{{ .Token }}` can be used instead of `{{ .ConfirmationURL }}` in auth email templates:
  - https://supabase.com/docs/guides/auth/auth-email-templates
- The docs explicitly show OTP-style confirm-signup flow using:
  - `verifyOtp({ email, token, type: 'email' })`
  - https://supabase.com/docs/guides/auth/auth-email-templates
- Email OTP verify reference:
  - https://supabase.com/docs/reference/javascript/auth-verifyotp

## Template variants tested
- **Variant A (control):** confirmation template uses `{{ .ConfirmationURL }}`
- **Variant B (candidate Option 1):** confirmation template uses `{{ .Token }}` and the same OTP-style subject/body shape as the magic-link template

## Behavior matrix

| Variant | Case | Mail UX | Current verify contract (`type: 'email'`) | Result |
|---|---|---|---|---|
| A / link | missing user + `shouldCreateUser:true` | `Confirm your signup` link mail | not applicable (no OTP token in body) | signup-link UX remains |
| A / link | existing unconfirmed user + `shouldCreateUser:false` | `Confirm your signup` link mail | not applicable | signup-link UX remains |
| A / link | existing confirmed user + `shouldCreateUser:false` | `Magic OTP` mail with token | succeeds | normal OTP control passes |
| B / token | missing user + `shouldCreateUser:true` | `Magic OTP` mail with token | succeeds | **passes** |
| B / token | existing unconfirmed user + `shouldCreateUser:false` | `Magic OTP` mail with token | succeeds | **passes** |
| B / token | existing confirmed user + `shouldCreateUser:false` | `Magic OTP` mail with token | succeeds | control passes |

## Raw experimental findings

### Variant A — confirmation template with link
- missing user + `shouldCreateUser:true`
  - mail subject: `Confirm your signup`
  - body contains confirmation link
  - no OTP-style token in body
- existing unconfirmed user + `shouldCreateUser:false`
  - mail subject: `Confirm your signup`
  - body contains confirmation link
  - no OTP-style token in body
- existing confirmed user + `shouldCreateUser:false`
  - mail subject: `Magic OTP`
  - OTP token present
  - `verifyOtp({ email, token, type: 'email' })` succeeded

### Variant B — confirmation template with token
- missing user + `shouldCreateUser:true`
  - mail subject: `Magic OTP`
  - OTP token present
  - `verifyOtp({ email, token, type: 'email' })` succeeded
- existing unconfirmed user + `shouldCreateUser:false`
  - mail subject: `Magic OTP`
  - OTP token present
  - `verifyOtp({ email, token, type: 'email' })` succeeded
- existing confirmed user + `shouldCreateUser:false`
  - mail subject: `Magic OTP`
  - OTP token present
  - `verifyOtp({ email, token, type: 'email' })` succeeded

## Answer to the plan’s decision gate
- **Can Option 1 preserve the current Nurimap verify contract unchanged?**
  - **Yes, based on local confirmation-enabled reproduction.**
- **Does confirmation-template OTP require a new app auth branch?**
  - **No, not in the reproduced cases.**

## Recommendation
- **Option 1 passes local validation.**
- The most practical rollout path is:
  1. Update the hosted Supabase **confirmation template** to OTP-style (`{{ .Token }}`) with the same user-facing subject/body shape as the normal OTP email.
  2. Verify on a real non-local mailbox that first-login and unconfirmed-user flows now send OTP-style mail.
  3. In a separate implementation slice, change first-login provisioning from:
     - `createUser({ email_confirm: true })`
     to
     - `createUser({ email_confirm: false })`
     while keeping the current `verifyOtp({ email, token, type: 'email' })` contract.

## Operational interpretation
- This means Option 1 is not merely a cosmetic disguise in local reproduction.
- With the confirmation template switched to `{{ .Token }}`, the flow behaved like standard OTP **and** the existing Nurimap verify contract still worked.
- Therefore Option 1 is currently the best next move before considering a heavier custom first-login auth flow.
