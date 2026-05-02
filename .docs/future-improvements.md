# Future Improvements

Planning only. No application code changes should be made from this document.

## Current Signals

- `lib/authContext.tsx` tracks auth as a boolean only.
- `app/*-missing/page.tsx` repeats fetch, realtime, sort, and clear logic.
- `lib/missingItemsExport.ts` generates CSV in the browser.
- `app/report-missing/page.tsx` converts invalid numeric input with `parseInt(...) || 0`.
- Browser-native `alert` and `confirm` still drive clear/download feedback.

## High Value

| Improvement | Why It Matters | Shape Hint |
| --- | --- | --- |
| Shared warehouse queue shell | One fix can improve all four missing pages. | `WarehouseConfig`, `useMissingQueue`, `WarehouseMissingPage` |
| Server-owned clear/export actions | Roles become enforceable and clear can match exact exported IDs. | `POST /api/warehouses/:warehouse/completed/export` |
| Role-aware auth module | Current auth only knows signed-in vs signed-out. | `RoleClaims`, `AuthorizedWarehouseSet`, `getPostLoginRedirect` |
| Shared queue read model | Admin summary and warehouse pages can share query logic. | `listActiveMissingItems`, `getWarehouseSummary` |
| Admin dashboard | Managers can see all missing items in one place. | `/admin/missing-items` |

```ts
export interface WarehouseConfig {
  warehouse: Warehouse;
  title: string;
  themeClass: string;
  workflow: "inline" | "tennis" | "running" | "tackle";
}

export interface QueueActionResult {
  warehouse: Warehouse;
  rowCount: number;
  clearBatchId: string;
}
```

## Reliability

| Improvement | Risk Reduced | Shape Hint |
| --- | --- | --- |
| Strict numeric parsing on submit | Bad input no longer becomes `0` silently. | `parseRequiredInt` |
| Typed action errors | UI can show useful failure messages. | `QueueActionError`, `LoginResult` |
| Realtime resync on reconnect | Queues recover after channel drops or tab sleep. | `subscribeToQueue` plus `refresh` |
| Boundary row validation | Legacy/null DB data cannot crash render. | `parseMissingItemRow` |
| Small test suite | Protects CSV escaping, exact-ID clears, and role rules. | `vitest` |

```ts
export type QueueActionError =
  | { type: "unauthorized" }
  | { type: "empty_selection" }
  | { type: "stale_row_set"; expected: number; actual: number }
  | { type: "storage_failure"; message: string };
```

## UX

| Improvement | User Benefit | Shape Hint |
| --- | --- | --- |
| Shared dialogs and toasts | Clear, download, login, and success feedback become consistent. | `ConfirmActionDialog`, `ReportSuccessDialog` |
| Queue filters and saved sort | Large queues become easier to work. | `QueueFilterState`, `useQueuePreferences` |
| Explicit loading states | Reduces double-submit and unclear action state. | `isSubmitting`, `isClearing`, `isDownloading` |
| Mobile table handling | Warehouse pages work better on phones/scanners. | horizontal scroll or card rows |
| Status badges | Workflow state becomes obvious at a glance. | `new`, `in_progress`, `completed_ready`, `cleared` |
| Counts on queue pages | Users see open/completed/backlog quickly. | summary strip above table |

```ts
export interface QueueFilterState {
  search: string;
  status: "all" | "open" | "completed_ready";
  sortField: keyof AdminMissingItemRow | "reportedAt";
  sortDirection: "asc" | "desc";
}
```

## Ops

| Improvement | Operational Gain | Shape Hint |
| --- | --- | --- |
| Supabase RLS rollout | Frontend hiding stops being main protection. | warehouse/admin/export policies |
| Clear/export audit trail | Every privileged batch gets stable record. | `missing_item_clear_batches` |
| CI for lint/typecheck/tests | Regressions caught before deploy. | `npm run lint`, `tsc --noEmit`, `vitest` |
| Env validation | Missing Supabase env fails with clear message. | `parsePublicEnv` |
| Package manager cleanup | Build warnings drop and installs become consistent. | pick npm or yarn |
| Structured action logging | Row mismatches become explainable. | log `warehouse`, `rowCount`, `actor`, `clearBatchId` |

Minimum ops bar:

```text
1. Enforce RLS.
2. Audit every clear/export batch.
3. Run lint + typecheck in CI.
4. Log row count mismatches as errors.
```

## Recommended Next Move

Use `inline-missing` as the first cleanup pilot because it has the simplest workflow state.

```text
1. Add shared warehouse config and role helpers.
2. Add server-owned clear/export handlers with audit writes.
3. Migrate app/inline-missing/page.tsx to a shared queue shell.
4. Add tests for CSV escaping, role checks, and exact-ID clear.
5. Port tackle, tennis, and running after the inline slice is stable.
```

| First Slice Outcome | Why It Helps |
| --- | --- |
| One warehouse page uses shared queue logic | Proves abstraction before wider migration. |
| Clear/export no longer depends on browser-only trust | Unlocks real authorization. |
| Tests cover fragile paths | Makes remaining migrations safer. |

## Defer Until Needed

- All-warehouse export.
- Assignment/ownership workflow.
- Role management UI.
- Yearly archive table.
- Saved CSV files in Supabase Storage.
