alter table public.missing_items
  add column if not exists cleared_at timestamptz,
  add column if not exists cleared_by text,
  add column if not exists clear_batch_id uuid;

create index if not exists missing_items_active_page_type_idx
  on public.missing_items (page_type, completed, cleared_at);
