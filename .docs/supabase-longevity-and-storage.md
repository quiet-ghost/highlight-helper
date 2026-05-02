# Supabase Longevity And Storage

Planning only. No application code changes should be made from this document.

## Key Point

Soft-cleared missing-item rows live in Supabase Postgres, not Supabase Storage. Browser-generated CSV downloads do not use Supabase Storage at all.

Supabase Storage matters only if exported CSV files are saved into a Storage bucket.

## Data Retention Model

Current soft-clear model:

```text
missing item reported -> active row
completed -> still active row
clear completed -> same row gets cleared_at/cleared_by/clear_batch_id
history -> query cleared rows
```

No data is deleted by normal clear.

## Longevity Estimate

Rough table-size estimates:

| Rows | Estimated Postgres Footprint |
| --- | --- |
| 100,000 | 100-300 MB |
| 1,000,000 | 1-3 GB |
| 5,000,000 | 5-15 GB |

Actual size depends on description length, indexes, row overhead, WAL, and Supabase plan limits.

## Storage Estimate If Saving CSVs

If the app saves CSV files to Supabase Storage later:

| Export Volume | Rough Storage Use |
| --- | --- |
| 1,000 rows per CSV | 100 KB-500 KB |
| daily CSV per warehouse | likely under 2 MB/day total |
| 1 year daily exports | roughly 365 MB-750 MB |

5 GB is likely enough for CSV exports for years unless row volume is much higher than expected.

## Recommended Persistence Strategy

Use Postgres as the record of truth. Add private Storage only for retained CSV artifacts.

| Layer | Purpose |
| --- | --- |
| `missing_items` | source records and soft-clear history |
| `missing_item_clear_batches` | audit each clear/export batch |
| private Storage bucket | optional saved CSV files |

## Recommended Batch Audit Table

```sql
create table public.missing_item_clear_batches (
  id uuid primary key,
  warehouse text not null,
  cleared_by_user_id uuid not null,
  cleared_by_email text,
  row_count integer not null,
  storage_path text,
  cleared_at timestamptz not null default now()
);
```

## Optional Export File Table

Add only if one clear batch can have multiple files.

```sql
create table public.missing_item_export_files (
  id uuid primary key,
  clear_batch_id uuid not null references public.missing_item_clear_batches(id),
  storage_path text not null,
  content_type text not null,
  byte_size bigint not null,
  created_at timestamptz not null default now()
);
```

## Suggested Storage Bucket

```text
missing-item-exports
```

Bucket should be private. Downloads should use signed URLs generated after role checks.

## Suggested Retention Policy

| Data | Retention |
| --- | --- |
| Active rows | until cleared |
| Cleared rows in `missing_items` | 12-24 months, or indefinite if table remains small |
| Batch audit rows | long-term |
| Saved CSV files | 90-180 days unless business needs longer |

## Index Plan

```sql
create index if not exists missing_items_active_idx
  on public.missing_items (page_type, completed, timestamp desc)
  where cleared_at is null;

create index if not exists missing_items_clear_batch_idx
  on public.missing_items (clear_batch_id)
  where clear_batch_id is not null;

create index if not exists missing_items_cleared_history_idx
  on public.missing_items (page_type, cleared_at desc)
  where cleared_at is not null;
```

## RLS Direction

Use Supabase RLS for table protection and server-owned routes/RPCs for privileged exports.

| Operation | Enforcement |
| --- | --- |
| Report missing item | authenticated insert policy |
| View warehouse queue | warehouse role or admin |
| Update workflow flags | warehouse role or admin |
| Download CSV | exporter/admin role |
| Clear completed | warehouse role/admin, optionally exporter/admin |
| View all dashboard | admin only |

## Security Notes

- Never expose Supabase service role key to browser code.
- Do not treat hidden buttons as authorization.
- Use `app_metadata.roles` for trusted role claims.
- Refresh sessions after role changes because JWT claims can be stale.
- Formula-harden CSV output before spreadsheet download.

## When To Archive

Archive only when query speed or storage cost becomes real.

Possible archival path:

```text
keep active + recent cleared rows in missing_items
move older cleared rows to missing_items_archive yearly
keep batch audit rows long-term
```

## Operational Checks

- Track rows cleared per batch.
- Alert/log when downloaded row count differs from cleared row count.
- Periodically inspect table size and index size in Supabase.
- Review Storage usage only if CSV artifacts are saved.

## Open Questions

- Should CSV artifacts be stored in Supabase Storage, or is database history enough?
- Should normal warehouse users be allowed to clear, or only managers?
- Should `exporter` be global or warehouse-specific?
- How long does operations need CSV files retained?
