alter table public.missing_items
  add column if not exists exported_at timestamptz,
  add column if not exists exported_by text,
  add column if not exists export_batch_id uuid;

create index if not exists missing_items_exported_page_type_idx
  on public.missing_items (page_type, cleared_at, exported_at);
