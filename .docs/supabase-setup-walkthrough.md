# Supabase Setup Walkthrough

Use this later in the Supabase dashboard or SQL editor. It matches the current app code: soft-clear history in `public.missing_items`, roles in `auth.users` app metadata, and browser Supabase reads/writes.

## Current App Expectations

| Area | Expected Setup |
| --- | --- |
| Env vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Main table | `public.missing_items` |
| Soft-clear columns | `cleared_at`, `cleared_by`, `clear_batch_id` |
| Role source | `session.user.app_metadata.roles` |
| Supported roles | `admin`, `exporter`, `operator`, `warehouse:tackle`, `warehouse:tennis`, `warehouse:running`, `warehouse:inline` |

The app treats `cleared_at is null` as active. Clear actions update rows in place instead of deleting them.

```text
reported row -> active row -> completed row -> cleared history row
```

## 1. Inspect Production First

Check whether the table already has RLS enabled.

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'missing_items';
```

Check existing policies before adding new ones.

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'missing_items'
order by policyname;
```

Check the current columns.

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'missing_items'
order by ordinal_position;
```

## 2. Apply Soft-Clear Migration

This is the same change as `supabase/migrations/20260501000000_add_missing_item_soft_clear.sql`.

```sql
begin;

alter table public.missing_items
  add column if not exists cleared_at timestamptz,
  add column if not exists cleared_by text,
  add column if not exists clear_batch_id uuid;

create index if not exists missing_items_active_page_type_idx
  on public.missing_items (page_type, completed, cleared_at);

commit;
```

Verify it.

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'missing_items'
  and column_name in ('cleared_at', 'cleared_by', 'clear_batch_id')
order by column_name;
```

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'missing_items'
order by indexname;
```

Expected:

| Column | Expected |
| --- | --- |
| `cleared_at` | `timestamp with time zone`, nullable |
| `cleared_by` | `text`, nullable |
| `clear_batch_id` | `uuid`, nullable |

## 3. Apply Export Tracking Migration

This is the same change as `supabase/migrations/20260501000001_add_missing_item_export_tracking.sql`.

```sql
begin;

alter table public.missing_items
  add column if not exists exported_at timestamptz,
  add column if not exists exported_by text,
  add column if not exists export_batch_id uuid;

create index if not exists missing_items_exported_page_type_idx
  on public.missing_items (page_type, cleared_at, exported_at);

commit;
```

Verify export tracking columns and index.

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'missing_items'
  and column_name in ('exported_at', 'exported_by', 'export_batch_id')
order by column_name;
```

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'missing_items'
  and indexname = 'missing_items_exported_page_type_idx';
```

## 4. Export Tracking And Delete Safety

Admin delete is only safe after a cleared row has been downloaded. The app tracks that with export metadata.

```text
reported -> active -> completed -> cleared -> downloaded -> deleted
```

Delete must only target rows matching both conditions:

```sql
cleared_at is not null
and exported_at is not null
```

Check cleared vs downloaded history by warehouse.

```sql
select
  page_type,
  count(*) filter (where cleared_at is not null and exported_at is null) as cleared_not_downloaded_rows,
  count(*) filter (where cleared_at is not null and exported_at is not null) as downloaded_rows
from public.missing_items
group by page_type
order by page_type;
```

## 5. Assign App Roles

The app reads `app_metadata.roles`. In SQL this is `auth.users.raw_app_meta_data -> 'roles'`.

Inspect users and existing roles.

```sql
select
  id,
  email,
  raw_app_meta_data -> 'roles' as roles
from auth.users
order by email;
```

Assign roles from the Supabase dashboard under **Authentication -> Users -> App Metadata**, or use SQL.

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('roles', '["admin"]'::jsonb)
where email = 'admin@example.com';
```

Warehouse exporter example:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('roles', '["exporter","warehouse:tackle"]'::jsonb)
where email = 'tackle-exporter@example.com';
```

Operator example:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('roles', '["operator"]'::jsonb)
where email = 'runner@example.com';
```

Remove a bad assignment without deleting the user.

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'roles'
where email = 'user@example.com';
```

After changing roles, the user must sign out and back in so the JWT has fresh claims.

## 6. Optional RLS Starter Model

Frontend role checks are not a security boundary. Supabase RLS is the real enforcement layer if the app keeps using the browser client directly.

Only run this after inspecting existing policies. If policies already exist, adapt them instead of blindly adding duplicates.

```sql
create or replace function public.request_roles()
returns text[]
language sql
stable
as $$
  select array(
    select jsonb_array_elements_text(
      coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)
    )
  );
$$;

create or replace function public.has_role(role_name text)
returns boolean
language sql
stable
as $$
  select role_name = any(public.request_roles());
$$;

create or replace function public.has_warehouse_access(warehouse_name text)
returns boolean
language sql
stable
as $$
  select
    public.has_role('admin')
    or format('warehouse:%s', warehouse_name) = any(public.request_roles());
$$;
```

Starter policies for the current browser flows:

```sql
alter table public.missing_items enable row level security;

drop policy if exists missing_items_select_by_role on public.missing_items;
create policy missing_items_select_by_role
on public.missing_items
for select
to authenticated
using (
  public.has_role('admin')
  or public.has_warehouse_access(page_type)
);

drop policy if exists missing_items_insert_by_role on public.missing_items;
create policy missing_items_insert_by_role
on public.missing_items
for insert
to authenticated
with check (
  public.has_role('admin')
  or public.has_role('operator')
  or public.has_warehouse_access(page_type)
);

drop policy if exists missing_items_update_by_role on public.missing_items;
create policy missing_items_update_by_role
on public.missing_items
for update
to authenticated
using (
  public.has_role('admin')
  or public.has_warehouse_access(page_type)
)
with check (
  public.has_role('admin')
  or public.has_warehouse_access(page_type)
);

drop policy if exists missing_items_delete_downloaded_by_admin on public.missing_items;
create policy missing_items_delete_downloaded_by_admin
on public.missing_items
for delete
to authenticated
using (
  public.has_role('admin')
  and cleared_at is not null
  and exported_at is not null
);
```

Delete is intentionally admin-only and limited to rows that are both cleared and downloaded.

## 7. Verify App Data

Check active vs cleared counts.

```sql
select
  page_type,
  completed,
  count(*) filter (where cleared_at is null) as active_rows,
  count(*) filter (where cleared_at is not null) as cleared_rows
from public.missing_items
group by page_type, completed
order by page_type, completed;
```

Check recent clear history.

```sql
select
  id,
  page_type,
  completed,
  cleared_at,
  cleared_by,
  clear_batch_id,
  exported_at,
  exported_by,
  export_batch_id
from public.missing_items
where cleared_at is not null
order by cleared_at desc
limit 50;
```

Smoke-test with real users:

| User Roles | Expected App Result |
| --- | --- |
| `['admin']` | admin dashboard and all warehouses |
| `['warehouse:tackle']` | Tackle queue access |
| `['exporter','warehouse:tackle']` | Tackle queue + Tackle CSV export |
| `['operator']` | report-missing workflow |

## 8. Rollback Notes

Only roll back the schema if the app code is also rolled back. Current code queries `cleared_at`.

```sql
begin;

drop index if exists public.missing_items_active_page_type_idx;
drop index if exists public.missing_items_exported_page_type_idx;

alter table public.missing_items
  drop column if exists export_batch_id,
  drop column if exists exported_by,
  drop column if exists exported_at,
  drop column if exists clear_batch_id,
  drop column if exists cleared_by,
  drop column if exists cleared_at;

commit;
```

Rollback the starter RLS model if needed:

```sql
drop policy if exists missing_items_select_by_role on public.missing_items;
drop policy if exists missing_items_insert_by_role on public.missing_items;
drop policy if exists missing_items_update_by_role on public.missing_items;

alter table public.missing_items disable row level security;

drop function if exists public.has_warehouse_access(text);
drop function if exists public.has_role(text);
drop function if exists public.request_roles();
```

## 9. Deploy Env Vars

Set these in the deployment host and redeploy.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` as `NEXT_PUBLIC_*`. The current app does not need the service role key.

## Recommended Order

1. Apply the soft-clear migration.
2. Apply the export tracking migration.
3. Verify columns and indexes.
4. Assign explicit roles to real users.
5. Have users sign out and back in.
6. Smoke-test report, update, download, clear, restore, and delete-downloaded flows.
7. Enable/adapt RLS only after the app works with roles.
8. Retest realtime updates after RLS.
