begin;

do $$
begin
  if exists (
    select 1
    from public.missing_items
    where
      case
        when on_hand_qty is null then true
        when btrim(on_hand_qty::text) !~ '^[+-]?[0-9]+$' then true
        else btrim(on_hand_qty::text)::numeric
          not between -2147483648 and 2147483647
      end
      or
      case
        when qty_missing is null then true
        when btrim(qty_missing::text) !~ '^[+-]?[0-9]+$' then true
        else btrim(qty_missing::text)::numeric
          not between 1 and 2147483647
      end
  ) then
    raise exception 'Cannot convert missing-item quantities: invalid values remain.'
      using hint = 'Run the quantity audit and correct invalid rows. No rows were changed.';
  end if;
end
$$;

alter table public.missing_items
  drop constraint if exists missing_items_qty_missing_positive;

alter table public.missing_items
  alter column on_hand_qty type integer
    using btrim(on_hand_qty::text)::integer,
  alter column qty_missing type integer
    using btrim(qty_missing::text)::integer,
  alter column on_hand_qty drop default,
  alter column qty_missing drop default;

alter table public.missing_items
  add constraint missing_items_qty_missing_positive
  check (qty_missing > 0);

commit;
