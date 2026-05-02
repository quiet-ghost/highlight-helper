# UI Library Recommendation

Planning only. No application code changes should be made from this document.

## Recommendation

Use `shadcn/ui` as the default UI component library.

## Why It Fits

The app already uses Tailwind. `shadcn/ui` keeps Tailwind as the styling layer and adds accessible primitives without forcing a full design-system rewrite.

| Reason | Benefit |
| --- | --- |
| Tailwind-native | low friction with current styles |
| Accessible primitives | better dialogs, menus, forms, tables |
| Copy-into-repo model | easy customization for internal tool needs |
| Strong admin UI patterns | cards, tables, badges, dialogs, tabs |

## First Components To Adopt

| Component | Use |
| --- | --- |
| `Button` | consistent clear/download actions |
| `Card` | dashboard summary cards |
| `Table` | warehouse queues and admin dashboard |
| `Badge` | warehouse labels and statuses |
| `Dialog` | clear/download confirmations |
| `Sheet` | row detail drawer on admin page |
| `Tabs` | warehouse filters |
| `Input` | search and login |
| `Select` | warehouse/status filters |
| `Toast` | clear/download success and error feedback |

## Shared Dialog Strategy

Replace the stale `components/Modal.tsx` pattern with a shared dialog shell plus specific dialog components.

Use one reusable shell for layout and accessibility:

```ts
export interface ModalShellProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
}
```

Then build focused components on top:

```ts
export interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export interface ReportSuccessDialogProps {
  isOpen: boolean;
  onAddMore: () => void;
}

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

Recommended component split:

- `LoginForm` owns username/password form behavior.
- `LoginDialog` wraps `LoginForm` in `ModalShell`.
- Existing full-page `Login` can also render `LoginForm`.
- `ReportSuccessDialog` replaces the inline portal in `report-missing`.
- `ConfirmActionDialog` replaces `window.confirm` and `alert` for clear/download flows.

If using `shadcn/ui`, map this shell to `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, and `DialogFooter`.

## Dashboard UI Shape

```text
AdminShell
  SummaryCards
  WarehouseTabs
  FilterBar
  MissingItemsTable
  MissingItemDetailSheet
  ConfirmClearDialog
  ConfirmDownloadDialog
  ToastProvider
```

## Function And Component Shapes

```ts
export interface AdminDashboardProps {
  initialSummary: AdminWarehouseSummary[];
  initialRows: AdminMissingItemRow[];
  actor: RoleClaims;
}

export interface MissingItemsTableProps {
  rows: AdminMissingItemRow[];
  onRowSelect: (row: AdminMissingItemRow) => void;
}

export interface WarehouseActionBarProps {
  warehouse: Warehouse;
  canClear: boolean;
  canExport: boolean;
  completedReadyCount: number;
  onClearCompleted: () => Promise<void>;
  onDownloadCompletedCsv: () => Promise<void>;
}
```

## Suggested Visual Direction

Keep internal-tool clarity first:

- high-contrast status badges
- compact rows for warehouse screens
- larger summary cards for admin dashboard
- mobile overflow handling for tables
- clear distinction between clear and download actions

## Alternative Libraries

| Option | When To Choose |
| --- | --- |
| `shadcn/ui` | best default for this project |
| Radix primitives + custom Tailwind wrappers | if team wants tighter control |
| MUI | if team wants a complete batteries-included system |
| Ant Design | if heavy admin data-grid features become primary |

## Why Not Heavy Library First

Heavy component libraries add visual churn and override work. This app needs reliable internal workflows more than a broad enterprise UI suite.

## Adoption Path

1. Add `shadcn/ui` config and base components.
2. Build new admin dashboard with `shadcn/ui` first.
3. Replace stale `components/Modal.tsx` with a shared dialog shell.
4. Extract `LoginForm`, then optionally add `LoginDialog`.
5. Replace report success inline portal with `ReportSuccessDialog`.
6. Replace confirmation dialogs and toasts.
7. Standardize buttons and badges.
8. Refactor existing warehouse tables only when touched.

## Acceptance Checklist

- Dashboard uses one consistent UI component set.
- Clear and download actions are visually distinct.
- Tables work on desktop and mobile.
- Forms and dialogs are keyboard-accessible.
- Login and report success can share the same dialog shell without sharing unrelated state.
- Existing warehouse pages do not require a broad redesign before dashboard work starts.
