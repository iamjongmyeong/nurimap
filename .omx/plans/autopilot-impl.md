# Autopilot Implementation Plan - production auth verify-otp schema fix

1. Verify exact production deployment alias and current runtime error.
2. Verify exact Supabase production project/DB target used by runtime.
3. Link local Supabase CLI to the production project using runtime env-backed DB credentials.
4. Run `supabase migration list` and `supabase db push --dry-run` against the production target.
5. If dry-run is clean and pending migration matches the expected phase1 foundation migration, apply it.
6. Re-check production `/api/auth/verify-otp` logs.
7. Run multi-perspective validation and summarize next steps.
