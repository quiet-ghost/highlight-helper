alter table public.missing_items
  add column if not exists notes text not null default '';
