# Next Session Prompt Guide

Use this prompt at the start of the next session:

---
I am resuming the Nurimap mock -> Supabase real-data migration work.

Implementation SSOT:
- `.omx/plans/plan-supabase-place-auth-real-data-migration-consensus.md`
- `.omx/plans/prd-supabase-place-auth-real-data-migration.md`
- `.omx/plans/test-spec-supabase-place-auth-real-data-migration.md`

Continuation plan for this session:
- `.omx/plans/plan-next-session-supabase-rollout-and-qa.md`

Current known-good local state from the previous session:
- local Supabase started successfully
- local migration applied successfully
- `vercel dev` worked when local env vars were injected explicitly
- bypass login worked
- name save worked
- map and place list rendered
- place registration succeeded and showed detail

Recent commits already created:
- `7c0ff96` feat: move auth and place flows behind backend supabase boundary
- `5ae6095` fix: stabilize local supabase runtime and persistence flow

Important notes:
- `docs/05-sprints/sprint-20/planning.md` is for humans; `.omx` plans are implementation SSOT.
- Start by running `git status --short`.
- If `supabase/snippets/Untitled query 848.sql` still exists, do not commit it unless its purpose is explicitly confirmed.
- Recommendation must stay removed.
- Do not reintroduce frontend direct Supabase usage.
- If remote rollout is considered, do not choose a target project implicitly; require explicit target confirmation/checklist.

Please continue from the next-session plan, not from scratch.
---
