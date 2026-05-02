# Role-Based Clear And Download Workflow

Planning only. No application code changes should be made from this document.

## Purpose

Split clearing from downloading so normal users can clear completed work quickly, while managers/admins can download CSVs only when needed.

## Current Baseline

- Login only confirms a Supabase session exists.
- There is no role-based UI or authorization model in the app.
- Completed rows are currently soft-cleared in `missing_items`.
- Downloads are generated client-side as CSV.
- Downloads are warehouse-specific because each missing page calls `getCompletedMissingItems(pageType)`.

## Target Role Model

Use Supabase Auth `app_metadata.roles` as the source of truth. Prefer `app_metadata` over `user_metadata` because users cannot edit it themselves.

| Role | Purpose | Warehouse Scope |
| --- | --- | --- |
| `admin` | Full dashboard, all warehouse queues, all exports, all clear actions | all |
| `exporter` | Download CSV exports for assigned warehouses | assigned warehouses |
| `operator` | Submit missing-item reports | all or assigned warehouses |
| `warehouse:tackle` | View/manage Tackle queue | tackle |
| `warehouse:tennis` | View/manage Tennis queue | tennis |
| `warehouse:running` | View/manage Running queue | running |
| `warehouse:inline` | View/manage Inline queue | inline |

## Example Auth Metadata

```json
{
  "roles": ["exporter", "warehouse:tackle", "warehouse:running"]
}
```

## Login Workflow

```text
username/password -> Supabase sign-in -> parse app_metadata.roles -> derive permissions -> redirect
```

## Login Component Shape

Use a shared `LoginForm` so full-page login and optional modal login share behavior without coupling auth state to modal layout.

```ts
export interface LoginFormProps {
  onLoginSuccess: () => void;
  submitLabel?: string;
}

export interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}
```

Default recommendation:

- Keep missing-page login as a full-page gate while content is protected.
- Use `LoginDialog` only if a later UX requires login without leaving the current page.
- Keep role parsing in auth helpers, not in dialog components.

## Redirect Rules

| Role State | Redirect |
| --- | --- |
| `admin` | `/admin/missing-items` |
| one `warehouse:*` role | corresponding `/{warehouse}-missing` |
| `operator` only | `/report-missing` |
| authenticated but no supported role | `/unauthorized` |

## Button Rules

Normal warehouse users see:

```text
Clear Completed
```

Exporter/admin users see:

```text
Clear Completed
Download Completed CSV
```

Optional admin shortcut:

```text
Download & Clear Completed
```

## Confirmation Dialog Rules

Replace browser `confirm` and `alert` with a shared action dialog.

```ts
export interface ConfirmActionDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}
```

Use cases:

- Clear completed confirmation for normal warehouse users.
- Download completed CSV confirmation for exporters/admins.
- Optional download-and-clear confirmation for admins.

Dialog copy should include warehouse and row count so users know the scope before clearing or downloading.

## Clear Flow

```text
click Clear Completed
fetch completed active rows for this warehouse
confirm row count
soft-clear exact fetched IDs
refetch active list
```

Clear updates:

```text
cleared_at
cleared_by
clear_batch_id
```

Clear does not delete rows.

## Download Flow

```text
click Download Completed CSV
authorize export role
fetch completed active rows for this warehouse
generate CSV
download file
do not clear rows
```

Download remains warehouse-specific:

- Tackle page downloads Tackle only.
- Tennis page downloads Tennis only.
- Running page downloads Running only.
- Inline page downloads Inline only.

## Download And Clear Flow

Optional admin/exporter shortcut:

```text
authorize export + clear access
fetch completed active rows for this warehouse
download CSV
soft-clear exact downloaded IDs
refetch active list
```

This flow must never clear rows that were not included in the downloaded CSV.

## Type Shapes

```ts
export type Warehouse = "tackle" | "tennis" | "running" | "inline";

export type AppRole =
  | "admin"
  | "exporter"
  | "operator"
  | `warehouse:${Warehouse}`;

export interface RoleClaims {
  userId: string;
  email: string | null;
  roles: AppRole[];
}

export interface AuthorizedWarehouseSet {
  canAdmin: boolean;
  canReport: boolean;
  canExport: boolean;
  warehouses: Warehouse[];
}
```

## Auth Helper Shapes

```ts
export function normalizeLoginIdentifier(username: string): string;

export function parseRoleClaims(session: {
  user: {
    id: string;
    email?: string | null;
    app_metadata?: { roles?: unknown };
  };
} | null): RoleClaims | null;

export function getAuthorizedWarehouseSet(
  claims: RoleClaims | null,
): AuthorizedWarehouseSet;

export function canAccessWarehouse(
  claims: RoleClaims | null,
  warehouse: Warehouse,
): boolean;

export function canExportWarehouse(
  claims: RoleClaims | null,
  warehouse: Warehouse,
): boolean;
```

## Login Result Shape

```ts
export type LoginStatus =
  | "authenticated"
  | "invalid_credentials"
  | "unauthorized";

export interface LoginResult {
  status: LoginStatus;
  claims: RoleClaims | null;
  redirectTo: string | null;
}
```

## Clear And Download Function Shapes

```ts
export interface CompletedItemsRequest {
  warehouse: Warehouse;
}

export interface DownloadCompletedCsvResult {
  warehouse: Warehouse;
  rowCount: number;
  filename: string;
  downloadedAt: string;
}

export interface ClearCompletedResult {
  warehouse: Warehouse;
  clearBatchId: string;
  clearedCount: number;
  clearedAt: string;
}

export async function listCompletedItemsForWarehouse(
  input: CompletedItemsRequest,
  actor: RoleClaims,
): Promise<MissingItem[]>;

export async function downloadWarehouseCompletedCsv(
  input: CompletedItemsRequest,
  actor: RoleClaims,
): Promise<DownloadCompletedCsvResult>;

export async function clearWarehouseCompletedItems(
  input: CompletedItemsRequest,
  actor: RoleClaims,
): Promise<ClearCompletedResult>;

export async function downloadAndClearWarehouseCompletedItems(
  input: CompletedItemsRequest,
  actor: RoleClaims,
): Promise<DownloadCompletedCsvResult & ClearCompletedResult>;
```

## Supabase RPC Shape

Use an RPC for clear if/when the flow moves server-side.

```sql
create or replace function clear_missing_items_batch(
  p_warehouse text,
  p_item_ids bigint[],
  p_clear_batch_id uuid,
  p_cleared_by_user_id uuid,
  p_cleared_by_email text
) returns table (cleared_count integer)
```

## Delivery Phases

1. Parse `app_metadata.roles` after login.
2. Extract `LoginForm` so page login and optional modal login share one implementation.
3. Add role-derived button visibility.
4. Split `Clear Completed` from `Download Completed CSV`.
5. Replace browser confirms with shared action dialogs.
6. Gate downloads to `admin` or `exporter` roles.
7. Move sensitive clear/export actions to server-owned routes or RPCs.
8. Add admin dashboard after role rules are stable.

## Acceptance Checklist

- Normal users can clear without downloading.
- Exporter/admin users can download CSVs.
- Downloads are warehouse-specific by default.
- Clear action soft-clears exact fetched IDs only.
- No frontend-only role check is treated as final authorization.
