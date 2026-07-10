create or replace function public.get_admin_missing_item_summaries()
returns table (
  page_type text,
  open_count bigint,
  completed_ready_count bigint,
  cleared_count bigint,
  downloaded_count bigint,
  oldest_open_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with warehouses(page_type, ordinal) as (
    values
      ('tackle'::text, 1),
      ('tennis'::text, 2),
      ('running'::text, 3),
      ('inline'::text, 4)
  )
  select
    warehouse.page_type,
    count(item.id) filter (
      where item.cleared_at is null and item.completed is false
    ) as open_count,
    count(item.id) filter (
      where item.cleared_at is null and item.completed is true
    ) as completed_ready_count,
    count(item.id) filter (
      where item.cleared_at is not null
    ) as cleared_count,
    count(item.id) filter (
      where item.cleared_at is not null and item.exported_at is not null
    ) as downloaded_count,
    min(item.timestamp) filter (
      where item.cleared_at is null and item.completed is false
    ) as oldest_open_at
  from warehouses as warehouse
  left join public.missing_items as item
    on item.page_type::text = warehouse.page_type
  group by warehouse.page_type, warehouse.ordinal
  order by warehouse.ordinal;
$$;

revoke all
  on function public.get_admin_missing_item_summaries()
  from public, anon;

grant execute
  on function public.get_admin_missing_item_summaries()
  to authenticated;
