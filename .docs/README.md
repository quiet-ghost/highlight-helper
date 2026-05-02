# Planning Docs Index

Planning only. No application code changes should be made from this doc set.

## Docs

- `role-based-clear-download-workflow.md`
- `admin-dashboard-plan.md`
- `supabase-longevity-and-storage.md`
- `ui-library-recommendation.md`
- `future-improvements.md`
- `cloudflare-workers-migration.md`

## Current Baseline

- `lib/authContext.tsx` tracks authentication only.
- `components/Login.tsx` converts a username into `${username}@sw.com`.
- Each `*-missing/page.tsx` page owns its own fetch, realtime subscription, sorting, and clear flow.
- Current clear/download work is warehouse-specific and based on `page_type`.
- Soft-cleared rows stay in `missing_items` through `cleared_at`, `cleared_by`, and `clear_batch_id`.

## Goals

- Add role-based access with Supabase Auth `app_metadata.roles`.
- Let normal warehouse users clear completed rows without forcing a download.
- Let manager/admin users download warehouse-specific CSVs when needed.
- Add one admin dashboard to view all missing items in one place.
- Keep per-warehouse exports scoped to one warehouse unless an explicit all-warehouse export is added later.
- Adopt a UI component library incrementally, preferably `shadcn/ui`.
- Track future cleanup, reliability, UX, and ops improvements separately from immediate role/dashboard plans.
- Plan Cloudflare Workers migration separately from app refactors so hosting changes stay reversible.

## Non-Goals

- Do not change application code as part of these planning docs.
- Do not add broad UI redesign work before workflow and role rules are stable.
- Do not rely on frontend-only role checks for real authorization.
