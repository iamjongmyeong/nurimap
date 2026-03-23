# Autopilot Spec - production auth verify-otp schema fix

## Problem
Production `/api/auth/verify-otp` returns 500 after OTP verification.

## Current evidence
- TLS root-cert deployment is already effective enough to reach DB query execution.
- Latest production runtime error: `relation "public.user_profiles" does not exist`.
- `verifyLoginOtp` inserts into `public.user_profiles` before issuing app session.
- Required schema is defined in `supabase/migrations/20260322065245_phase1_place_auth_real_data_foundation.sql`.

## Goal
Apply the required production schema to the exact Supabase production DB used by Vercel runtime, without touching unrelated UI work.

## Constraints
- No unrelated UI file changes or staging.
- Use the actual production DB target.
- Prefer official Supabase CLI workflow.
- Verify with fresh production logs after rollout.

## Acceptance criteria
1. Production DB contains `public.user_profiles` and dependent tables from the phase1 foundation migration.
2. `/api/auth/verify-otp` no longer fails with `SELF_SIGNED_CERT_IN_CHAIN`.
3. `/api/auth/verify-otp` no longer fails with `relation \"public.user_profiles\" does not exist`.
4. Latest production OTP verification reaches post-DB transaction path successfully or fails for a different, narrower app-level reason.
