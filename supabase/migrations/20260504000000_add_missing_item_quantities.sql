alter table public.missing_items
  add column if not exists on_hand_qty integer not null default 0,
  add column if not exists qty_missing integer not null default 0;
