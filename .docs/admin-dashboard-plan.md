# Admin Dashboard Plan

Planning only. No application code changes should be made from this document.

## Goal

Create one admin dashboard where authorized users can see all missing items across warehouses, track queue health, and export warehouse-specific CSVs when needed.

## Primary Route

```text
/admin/missing-items
```

## Core User Stories

- Admin sees active missing items across all warehouses in one table.
- Admin filters by warehouse, completion state, age, and search text.
- Admin downloads completed items for one warehouse from the same screen.
- Admin can open a row detail view without leaving the dashboard.
- Admin can spot backlog risk without opening four separate pages.

## Page Layout

```text
summary cards
warehouse filter tabs
search and status filters
global missing-items table
row detail drawer
warehouse-specific export actions
shared clear/download dialogs
```

## Summary Cards

| Card | Meaning |
| --- | --- |
| Open Items | `cleared_at is null` |
| Completed Ready To Clear | `completed = true and cleared_at is null` |
| Oldest Open Age | oldest active row by `timestamp` |
| Warehouse Backlog | active counts grouped by `page_type` |

## Global Table Fields

| Column | Source |
| --- | --- |
| Warehouse | `page_type` |
| Reported At | `timestamp` |
| Initials | `initials` |
| Description | `description` |
| Cart # | `cart_number` |
| Order # | `order_number` |
| Cart Position | `cart_location` |
| Bin | `bin_location` |
| Qty Missing | `qty_missing` |
| Status | derived from workflow fields |
| Age | derived from `timestamp` |
| Clear Batch | `clear_batch_id` when present |

## Warehouse-Specific Status Mapping

```ts
export type AdminWorkflowStatus =
  | "new"
  | "in_progress"
  | "completed_ready"
  | "cleared";

export function deriveAdminWorkflowStatus(item: MissingItem): AdminWorkflowStatus;
```

Suggested mapping:

| Warehouse | In-Progress Signals |
| --- | --- |
| `tackle` | `fulf_1` or `fulf_2` |
| `tennis` | `on_cart` or `looked_for` |
| `running` | `on_cart` or `looked_for` |
| `inline` | no extra state, only completed vs open |

## DTO Shapes

```ts
export interface AdminMissingItemRow {
  id: number;
  warehouse: Warehouse;
  initials: string;
  description: string | null;
  cartNumber: string;
  orderNumber: string;
  cartLocation: string;
  binLocation: string;
  onHandQty: number;
  qtyMissing: number;
  reportedAt: string;
  completed: boolean;
  workflowStatus: AdminWorkflowStatus;
  clearBatchId: string | null;
  clearedAt: string | null;
}

export interface AdminWarehouseSummary {
  warehouse: Warehouse;
  openCount: number;
  completedReadyCount: number;
  oldestOpenAt: string | null;
}
```

## Query Shape

```ts
export interface AdminMissingItemsQuery {
  warehouse?: Warehouse | "all";
  status?: AdminWorkflowStatus | "all";
  search?: string;
  limit?: number;
  cursor?: string | null;
}
```

## Route And API Shapes

Prefer server-owned reads for admin pages.

```text
GET  /admin/missing-items
GET  /api/admin/missing-items
GET  /api/admin/missing-summary
POST /api/admin/downloads/:warehouse
POST /api/admin/clear/:warehouse
```

## Example Response Shape

```json
{
  "summary": [
    {
      "warehouse": "tackle",
      "openCount": 12,
      "completedReadyCount": 4,
      "oldestOpenAt": "2026-05-01T10:00:00Z"
    }
  ],
  "rows": [
    {
      "id": 101,
      "warehouse": "running",
      "initials": "AB",
      "description": "Shoe lace pack",
      "workflowStatus": "in_progress",
      "completed": false,
      "clearBatchId": null
    }
  ]
}
```

## Dashboard Actions

Admin actions should stay warehouse-scoped by default.

| Action | Scope | Role |
| --- | --- | --- |
| View all active missing items | all warehouses | `admin` |
| Download completed CSV | one selected warehouse | `admin` or `exporter` |
| Clear completed | one selected warehouse | `admin` or assigned warehouse role |
| Download and clear | one selected warehouse | `admin` or `exporter` with clear access |

## Additional Login Experience

Add role-aware landing behavior after login:

```text
admin -> dashboard
exporter -> dashboard or assigned warehouse page
warehouse user -> assigned warehouse page
operator -> report missing page
```

Add unauthorized state:

```text
authenticated but no recognized role -> /unauthorized
```

## Shared Auth And Dialog Components

The admin dashboard should reuse the same auth and dialog primitives planned for warehouse pages.

```ts
export interface AdminLoginGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export interface AdminActionDialogState {
  type: "clear" | "download" | "download_and_clear";
  warehouse: Warehouse;
  rowCount: number;
}
```

Recommended behavior:

- Use full-page login for direct admin route visits.
- Use shared `LoginForm` rather than duplicating login state.
- Use `ConfirmActionDialog` for dashboard clear/download actions.
- Use `Sheet` or drawer for row details, not the same modal used for login/confirm actions.

## Not In Phase 1

- No assignment system.
- No role management UI.
- No all-warehouse bulk clear.
- No analytics beyond counts and age.

## Delivery Phases

1. Add admin route shell and role guard.
2. Add read-only summary cards.
3. Add global active-items table.
4. Add warehouse/status/search filters.
5. Add warehouse-specific download button.
6. Add row detail drawer.
7. Add history/batch views if useful.

## Acceptance Checklist

- Admin can see all active rows in one place.
- Counts match warehouse-specific pages.
- Export remains warehouse-specific unless explicitly selecting all warehouses.
- Non-admin users cannot open admin routes.
- Dashboard UI works on desktop and mobile.
