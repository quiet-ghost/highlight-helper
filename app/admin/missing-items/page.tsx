"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Login from "../../../components/Login";
import Modal from "../../../components/Modal";
import {
  AdminWorkflowStatus,
  deriveAdminWorkflowStatus,
  getAdminClearedMissingItems,
  getAdminMissingItems,
  summarizeAdminMissingItems,
} from "../../../lib/adminMissingItems";
import { useAuth } from "../../../lib/authContext";
import {
  clearMissingItems,
  deleteDownloadedMissingItems,
  getCompletedMissingItems,
  markMissingItemsExported,
  MissingItem,
  PageType,
  restoreMissingItems,
} from "../../../lib/missingItems";
import { downloadMissingItemsCsv } from "../../../lib/missingItemsExport";
import { getAuthorizedWarehouseSet } from "../../../lib/roles";
import { warehouseList, warehouses } from "../../../lib/warehouses";

type WarehouseGroupFilter = "site:1151" | "site:1295";
type WarehouseFilter = "all" | WarehouseGroupFilter | PageType;
type StatusFilter = "all" | AdminWorkflowStatus;
type DashboardView = "all" | "active" | "history";
type AdminDialog =
  | {
      type: "clear";
      pageType: PageType;
      itemIds: number[];
    }
  | {
      type: "restore";
      pageType: PageType;
      itemIds: number[];
    }
  | {
      type: "delete";
      pageType: PageType;
      itemIds: number[];
    }
  | {
      type: "mark_exported";
      pageType: PageType;
      itemIds: number[];
      exportedAt: string;
      exportBatchId: string;
    };

const statusLabels: Record<AdminWorkflowStatus, string> = {
  new: "New",
  in_progress: "In Progress",
  completed_ready: "Completed",
  cleared: "Cleared",
  downloaded: "Downloaded",
};

const warehouseGroups: Record<WarehouseGroupFilter, PageType[]> = {
  "site:1151": ["tackle", "inline"],
  "site:1295": ["running", "tennis"],
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unexpected dashboard error";
}

function parseWarehouseFilter(value: string): WarehouseFilter {
  if (value === "all") return "all";
  if (value === "site:1151" || value === "site:1295") return value;
  return PageType.parse(value) ?? "all";
}

function parseSingleWarehouseFilter(value: WarehouseFilter): PageType | null {
  if (value === "all" || value === "site:1151" || value === "site:1295") {
    return null;
  }
  return value;
}

function matchesWarehouseFilter(pageType: PageType, filter: WarehouseFilter) {
  if (filter === "all") return true;
  if (filter === "site:1151" || filter === "site:1295") {
    return warehouseGroups[filter].includes(pageType);
  }
  return pageType === filter;
}

function parseStatusFilter(value: string): StatusFilter {
  if (
    value === "new" ||
    value === "in_progress" ||
    value === "completed_ready" ||
    value === "cleared" ||
    value === "downloaded"
  ) {
    return value;
  }
  return "all";
}

function parseDashboardView(value: string): DashboardView {
  if (value === "active" || value === "history") return value;
  return "all";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatAge(value: string | null) {
  if (!value) return "-";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "-";

  const elapsedMs = Date.now() - timestamp;
  const elapsedHours = Math.max(0, Math.floor(elapsedMs / 3_600_000));
  const days = Math.floor(elapsedHours / 24);
  const hours = elapsedHours % 24;

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function matchesSearch(item: MissingItem, search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return true;

  return [
    item.initials,
    item.cart_number,
    item.order_number,
    item.cart_location,
    item.bin_location,
    item.description ?? "",
    item.cleared_by ?? "",
    item.clear_batch_id ?? "",
    item.exported_by ?? "",
    item.export_batch_id ?? "",
    warehouses[item.page_type].label,
  ].some((value) => value.toLowerCase().includes(normalizedSearch));
}

export default function AdminMissingItemsPage() {
  const { isAuthenticated, claims } = useAuth();
  const access = getAuthorizedWarehouseSet(claims);
  const [activeItems, setActiveItems] = useState<MissingItem[]>([]);
  const [clearedItems, setClearedItems] = useState<MissingItem[]>([]);
  const [warehouseFilter, setWarehouseFilter] =
    useState<WarehouseFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<DashboardView>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<AdminDialog | null>(null);

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [nextActiveItems, nextClearedItems] = await Promise.all([
        getAdminMissingItems(),
        getAdminClearedMissingItems(),
      ]);
      setActiveItems(nextActiveItems);
      setClearedItems(nextClearedItems);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !access.canAdmin) return;
    loadDashboard();
  }, [access.canAdmin, isAuthenticated]);

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (!access.canAdmin) {
    return (
      <div className="container p-5 text-center text-black dark:text-white">
        You do not have admin access.
      </div>
    );
  }

  const itemsForView =
    view === "all"
      ? [...activeItems, ...clearedItems]
      : view === "active"
        ? activeItems
        : clearedItems;
  const visibleItems = itemsForView
    .filter((item) => {
      const status = deriveAdminWorkflowStatus(item);
      return (
        matchesWarehouseFilter(item.page_type, warehouseFilter) &&
        (statusFilter === "all" || status === statusFilter) &&
        matchesSearch(item, search)
      );
    })
    .sort((a, b) => {
      const aDate = a.cleared_at ?? a.timestamp;
      const bDate = b.cleared_at ?? b.timestamp;
      return bDate.localeCompare(aDate);
    });
  const summary = summarizeAdminMissingItems(activeItems, clearedItems);
  const selectedWarehouseType = parseSingleWarehouseFilter(warehouseFilter);
  const selectedWarehouse = selectedWarehouseType
    ? warehouses[selectedWarehouseType]
    : null;
  const totalOpen = summary.reduce((count, row) => count + row.openCount, 0);
  const totalCompletedReady = summary.reduce(
    (count, row) => count + row.completedReadyCount,
    0,
  );
  const totalCleared = summary.reduce((count, row) => count + row.clearedCount, 0);
  const totalDownloaded = summary.reduce(
    (count, row) => count + row.downloadedCount,
    0,
  );

  const handleDownloadCompleted = async () => {
    if (!selectedWarehouse) {
      setError("Select one warehouse before downloading completed CSV data.");
      return;
    }

    try {
      const completedItems = await getCompletedMissingItems(
        selectedWarehouse.pageType,
      );
      if (completedItems.length === 0) {
        setError(
          `No active completed ${selectedWarehouse.label} items to download.`,
        );
        return;
      }
      downloadMissingItemsCsv(selectedWarehouse.pageType, completedItems, {
        filenameLabel: "active-completed",
      });
      setError(null);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    }
  };

  const handleDownloadClearedHistory = async () => {
    if (!selectedWarehouse) {
      setError("Select one warehouse before downloading cleared history.");
      return;
    }

    try {
      const selectedClearedItems = await getAdminClearedMissingItems({
        pageType: selectedWarehouse.pageType,
        exported: "not_downloaded",
        limit: 5_000,
      });

      if (selectedClearedItems.length === 0) {
        setError(
          `No cleared ${selectedWarehouse.label} history waiting to download.`,
        );
        return;
      }

      const exportedAt = new Date().toISOString();
      const exportBatchId = crypto.randomUUID();
      downloadMissingItemsCsv(selectedWarehouse.pageType, selectedClearedItems, {
        exportedAt,
        exportBatchId,
        filenameLabel: "cleared-history",
      });
      setDialog({
        type: "mark_exported",
        pageType: selectedWarehouse.pageType,
        itemIds: selectedClearedItems.map((item) => item.id),
        exportedAt,
        exportBatchId,
      });
      setError(null);
    } catch (downloadError) {
      setError(getErrorMessage(downloadError));
    }
  };

  const handleDeleteDownloadedHistory = async () => {
    if (!selectedWarehouse) {
      setError("Select one warehouse before deleting downloaded history.");
      return;
    }

    try {
      const downloadedItems = await getAdminClearedMissingItems({
        pageType: selectedWarehouse.pageType,
        exported: "downloaded",
        limit: 5_000,
      });

      if (downloadedItems.length === 0) {
        setError(`No downloaded ${selectedWarehouse.label} history to delete.`);
        return;
      }

      setDialog({
        type: "delete",
        pageType: selectedWarehouse.pageType,
        itemIds: downloadedItems.map((item) => item.id),
      });
      setError(null);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  };

  const handleClearCompleted = async () => {
    if (!selectedWarehouse) {
      setError("Select one warehouse before clearing completed items.");
      return;
    }

    try {
      const completedItems = await getCompletedMissingItems(
        selectedWarehouse.pageType,
      );
      if (completedItems.length === 0) {
        setError(`No completed ${selectedWarehouse.label} items to clear.`);
        return;
      }
      setDialog({
        type: "clear",
        pageType: selectedWarehouse.pageType,
        itemIds: completedItems.map((item) => item.id),
      });
      setError(null);
    } catch (clearError) {
      setError(getErrorMessage(clearError));
    }
  };

  const confirmAction = async (actionDialog: AdminDialog) => {
    try {
      if (actionDialog.type === "clear") {
        await clearMissingItems(
          actionDialog.pageType,
          crypto.randomUUID(),
          actionDialog.itemIds,
        );
      } else if (actionDialog.type === "restore") {
        await restoreMissingItems(actionDialog.pageType, actionDialog.itemIds);
      } else if (actionDialog.type === "mark_exported") {
        await markMissingItemsExported(
          actionDialog.pageType,
          actionDialog.exportBatchId,
          actionDialog.exportedAt,
          actionDialog.itemIds,
        );
      } else {
        await deleteDownloadedMissingItems(
          actionDialog.pageType,
          actionDialog.itemIds,
        );
      }
      setDialog(null);
      await loadDashboard();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const openRestoreDialog = (item: MissingItem) => {
    setDialog({
      type: "restore",
      pageType: item.page_type,
      itemIds: [item.id],
    });
  };

  return (
    <div className="container p-5 pt-20 text-black dark:text-white">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Admin
          </p>
          <h1 className="text-3xl font-bold">Missing Items Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            Overview plus warehouse-scoped active CSV, cleared-history CSV,
            clear, restore, and delete-downloaded actions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={isLoading}
            className="rounded bg-gray-700 px-4 py-2 font-bold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <Link href="/">
            <button className="rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-600">
              Home
            </button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Open Items</p>
          <p className="text-3xl font-bold">{totalOpen}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-3xl font-bold">{totalCompletedReady}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cleared History Rows
          </p>
          <p className="text-3xl font-bold">{totalCleared}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Downloaded Rows
          </p>
          <p className="text-3xl font-bold">{totalDownloaded}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        {summary.map((row) => (
          <div
            key={row.pageType}
            className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800"
          >
            <p className="font-bold">{warehouses[row.pageType].label}</p>
            <p className="mt-2 text-sm">Open: {row.openCount}</p>
            <p className="text-sm">Completed: {row.completedReadyCount}</p>
            <p className="text-sm">Cleared: {row.clearedCount}</p>
            <p className="text-sm">Downloaded: {row.downloadedCount}</p>
            <p className="text-sm">Oldest open: {formatAge(row.oldestOpenAt)}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            View
            <select
              value={view}
              onChange={(event) => setView(parseDashboardView(event.target.value))}
              className="rounded border border-gray-300 bg-white p-2 text-black dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Rows</option>
              <option value="active">Active Rows</option>
              <option value="history">Cleared History</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Warehouse
            <select
              value={warehouseFilter}
              onChange={(event) =>
                setWarehouseFilter(parseWarehouseFilter(event.target.value))
              }
              className="rounded border border-gray-300 bg-white p-2 text-black dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Warehouses</option>
              <option value="site:1151">1151 - Tackle + Inline</option>
              <option value="site:1295">1295 - Running + Tennis</option>
              {warehouseList.map((warehouse) => (
                <option key={warehouse.pageType} value={warehouse.pageType}>
                  {warehouse.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Status
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(parseStatusFilter(event.target.value))
              }
              className="rounded border border-gray-300 bg-white p-2 text-black dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="completed_ready">Completed</option>
              <option value="cleared">Cleared</option>
              <option value="downloaded">Downloaded</option>
            </select>
          </label>

          <label className="flex flex-1 flex-col gap-1 text-sm font-semibold">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order, cart, bin, initials, description..."
              className="rounded border border-gray-300 bg-white p-2 text-black dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 md:flex-row">
          <button
            type="button"
            onClick={handleDownloadCompleted}
            disabled={!selectedWarehouse}
            className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            Download Active Completed CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadClearedHistory}
            disabled={!selectedWarehouse}
            className="rounded bg-indigo-500 px-4 py-2 font-bold text-white hover:bg-indigo-600 disabled:opacity-50"
          >
            Download Cleared History CSV
          </button>
          <button
            type="button"
            onClick={handleClearCompleted}
            disabled={!selectedWarehouse}
            className="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-600 disabled:opacity-50"
          >
            Clear Selected Warehouse Completed
          </button>
          <button
            type="button"
            onClick={handleDeleteDownloadedHistory}
            disabled={!selectedWarehouse}
            className="rounded bg-red-900 px-4 py-2 font-bold text-white hover:bg-red-950 disabled:opacity-50"
          >
            Delete Downloaded History
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200 text-left dark:bg-gray-700">
              <th className="p-2">Warehouse</th>
              <th className="p-2">Status</th>
              <th className="p-2">Reported</th>
              <th className="p-2">Age</th>
              <th className="p-2">Initials</th>
              <th className="p-2">Description</th>
              <th className="p-2">Cart</th>
              <th className="p-2">Order</th>
              <th className="p-2">Bin</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Cleared</th>
              <th className="p-2">Downloaded</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-6 text-center text-gray-500">
                  No rows match the current filters.
                </td>
              </tr>
            ) : (
              visibleItems.map((item) => {
                const status = deriveAdminWorkflowStatus(item);
                return (
                  <tr key={item.id} className="border-t dark:border-gray-700">
                    <td className="p-2">{warehouses[item.page_type].shortLabel}</td>
                    <td className="p-2">{statusLabels[status]}</td>
                    <td className="p-2">{formatDate(item.timestamp)}</td>
                    <td className="p-2">{formatAge(item.timestamp)}</td>
                    <td className="p-2 uppercase">{item.initials}</td>
                    <td className="max-w-xs truncate p-2">
                      {item.description ?? ""}
                    </td>
                    <td className="p-2">{item.cart_number}</td>
                    <td className="p-2">{item.order_number}</td>
                    <td className="p-2 uppercase">{item.bin_location}</td>
                    <td className="p-2">{item.qty_missing}</td>
                    <td className="p-2">
                      {item.cleared_at ? formatDate(item.cleared_at) : "-"}
                    </td>
                    <td className="p-2">
                      {item.exported_at ? formatDate(item.exported_at) : "-"}
                    </td>
                    <td className="p-2">
                      {item.cleared_at ? (
                        <button
                          type="button"
                          onClick={() => openRestoreDialog(item)}
                          className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Restore
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={dialog !== null}
        title={
          dialog?.type === "restore"
            ? "Restore Cleared Item"
            : dialog?.type === "delete"
              ? "Delete Downloaded History"
              : dialog?.type === "mark_exported"
                ? "Confirm CSV Download"
                : "Clear Completed Items"
        }
        onClose={() => setDialog(null)}
        footer={
          dialog ? (
            <>
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmAction(dialog)}
                className={`rounded px-4 py-2 font-bold text-white ${
                  dialog.type === "restore"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : dialog.type === "delete"
                      ? "bg-red-900 hover:bg-red-950"
                      : dialog.type === "mark_exported"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {dialog.type === "restore"
                  ? "Restore"
                  : dialog.type === "delete"
                    ? "Delete Permanently"
                    : dialog.type === "mark_exported"
                      ? "Mark Downloaded"
                      : "Clear Completed"}
              </button>
            </>
          ) : undefined
        }
      >
        {dialog
          ? dialog.type === "restore"
            ? `Restore ${dialog.itemIds.length} cleared ${warehouses[dialog.pageType].label} item(s) to the active table?`
            : dialog.type === "delete"
              ? `Permanently delete ${dialog.itemIds.length} downloaded ${warehouses[dialog.pageType].label} history item(s)? Only rows marked as cleared and downloaded will be deleted.`
              : dialog.type === "mark_exported"
                ? `If the CSV downloaded successfully, mark ${dialog.itemIds.length} cleared ${warehouses[dialog.pageType].label} item(s) as downloaded. Only downloaded rows can be permanently deleted.`
              : `Clear ${dialog.itemIds.length} completed ${warehouses[dialog.pageType].label} item(s)? Records remain in history.`
          : ""}
      </Modal>
    </div>
  );
}
