"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import Login from "../../../components/Login";
import Modal from "../../../components/Modal";
import {
  AdminMissingItem,
  AdminDashboardView,
  AdminSortDirection,
  AdminSortField,
  AdminStatusFilter,
  AdminWarehouseSummary,
  AdminWorkflowStatus,
  deriveAdminWorkflowStatus,
  getAdminClearedMissingItems,
  getAdminMissingItemsPage,
  getAdminWarehouseSummaries,
} from "../../../lib/adminMissingItems";
import { useAuth } from "../../../lib/authContext";
import {
  clearMissingItems,
  deleteDownloadedMissingItems,
  getCompletedMissingItems,
  markMissingItemsExported,
  PageType,
  restoreMissingItems,
} from "../../../lib/missingItems";
import { downloadMissingItemsCsv } from "../../../lib/missingItemsExport";
import { getAuthorizedWarehouseSet } from "../../../lib/roles";
import { warehouseList, warehouses } from "../../../lib/warehouses";

type WarehouseGroupFilter = "site:1151" | "site:1295";
type WarehouseFilter = "all" | WarehouseGroupFilter | PageType;
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

const pageSizeOptions: readonly number[] = [25, 50, 100];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
  }
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

function getWarehouseFilterPageTypes(
  value: WarehouseFilter,
): readonly PageType[] | undefined {
  if (value === "all") return undefined;
  if (value === "site:1151" || value === "site:1295") {
    return warehouseGroups[value];
  }
  return [value];
}

function parseStatusFilter(value: string): AdminStatusFilter {
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

function parseDashboardView(value: string): AdminDashboardView {
  if (value === "active" || value === "history") return value;
  return "all";
}

function parsePageSize(value: string) {
  const nextPageSize = Number(value);
  if (nextPageSize === 25 || nextPageSize === 50 || nextPageSize === 100) {
    return nextPageSize;
  }
  return 50;
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

export default function AdminMissingItemsPage() {
  const { isAuthenticated, claims } = useAuth();
  const access = getAuthorizedWarehouseSet(claims);
  const [dashboardItems, setDashboardItems] = useState<AdminMissingItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<AdminWarehouseSummary[]>([]);
  const [warehouseFilter, setWarehouseFilter] =
    useState<WarehouseFilter>("all");
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<AdminDashboardView>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<AdminSortField>("timestamp");
  const [sortDirection, setSortDirection] =
    useState<AdminSortDirection>("desc");
  const [isLoading, setIsLoading] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<AdminDialog | null>(null);
  const pageLoadIdRef = useRef(0);
  const summaryLoadIdRef = useRef(0);
  const pageAbortRef = useRef<AbortController | null>(null);
  const summaryAbortRef = useRef<AbortController | null>(null);

  const loadDashboardPage = useCallback(async () => {
    pageAbortRef.current?.abort();
    const controller = new AbortController();
    pageAbortRef.current = controller;
    const loadId = pageLoadIdRef.current + 1;
    pageLoadIdRef.current = loadId;
    setIsLoading(true);
    try {
      const nextPage = await getAdminMissingItemsPage(
        {
          page,
          pageSize,
          view,
          pageTypes: getWarehouseFilterPageTypes(warehouseFilter),
          status: statusFilter,
          search: searchQuery,
          sortField,
          sortDirection,
        },
        controller.signal,
      );

      if (controller.signal.aborted || pageLoadIdRef.current !== loadId) return;

      const totalPages = Math.max(1, Math.ceil(nextPage.totalCount / pageSize));
      if (page > totalPages) {
        setPage(totalPages);
        return;
      }

      setDashboardItems(nextPage.items);
      setTotalCount(nextPage.totalCount);
      setPageError(null);
    } catch (loadError) {
      if (controller.signal.aborted || pageLoadIdRef.current !== loadId) return;
      setPageError(getErrorMessage(loadError));
    } finally {
      if (controller.signal.aborted || pageLoadIdRef.current !== loadId) return;
      setIsLoading(false);
    }
  }, [
    page,
    pageSize,
    view,
    warehouseFilter,
    statusFilter,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  const loadSummary = useCallback(async () => {
    summaryAbortRef.current?.abort();
    const controller = new AbortController();
    summaryAbortRef.current = controller;
    const loadId = summaryLoadIdRef.current + 1;
    summaryLoadIdRef.current = loadId;
    setIsSummaryLoading(true);
    try {
      const nextSummary = await getAdminWarehouseSummaries(controller.signal);
      if (controller.signal.aborted || summaryLoadIdRef.current !== loadId) return;
      setSummary(nextSummary);
      setSummaryError(null);
    } catch (loadError) {
      if (controller.signal.aborted || summaryLoadIdRef.current !== loadId) return;
      setSummaryError(getErrorMessage(loadError));
    } finally {
      if (controller.signal.aborted || summaryLoadIdRef.current !== loadId) return;
      setIsSummaryLoading(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setError(null);
    await Promise.all([loadDashboardPage(), loadSummary()]);
  }, [loadDashboardPage, loadSummary]);

  useEffect(() => {
    if (!isAuthenticated || !access.canAdmin) return;
    void loadDashboardPage();
    return () => pageAbortRef.current?.abort();
  }, [access.canAdmin, isAuthenticated, loadDashboardPage]);

  useEffect(() => {
    if (!isAuthenticated || !access.canAdmin) return;
    void loadSummary();
    return () => summaryAbortRef.current?.abort();
  }, [access.canAdmin, isAuthenticated, loadSummary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  const visibleItems = dashboardItems;
  const selectedWarehouseType = parseSingleWarehouseFilter(warehouseFilter);
  const selectedWarehouse = selectedWarehouseType
    ? warehouses[selectedWarehouseType]
    : null;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstVisibleRow = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastVisibleRow = Math.min(page * pageSize, totalCount);
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
      await refreshDashboard();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    }
  };

  const openRestoreDialog = (item: AdminMissingItem) => {
    setDialog({
      type: "restore",
      pageType: item.page_type,
      itemIds: [item.id],
    });
  };

  const handleSort = (field: AdminSortField) => {
    setPage(1);
    if (sortField === field) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const renderHeader = (label: string, field?: AdminSortField) => {
    if (!field) return <th className="p-2">{label}</th>;

    const isActiveSort = sortField === field;
    const sortMarker = isActiveSort
      ? sortDirection === "asc"
        ? " (asc)"
        : " (desc)"
      : "";

    return (
      <th className="p-2">
        <button
          type="button"
          onClick={() => handleSort(field)}
          className="font-semibold hover:underline"
        >
          {label}
          {sortMarker}
        </button>
      </th>
    );
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
            onClick={() => void refreshDashboard()}
            disabled={isLoading || isSummaryLoading}
            className="rounded bg-gray-700 px-4 py-2 font-bold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {isLoading || isSummaryLoading ? "Refreshing..." : "Refresh"}
          </button>
          <Link href="/">
            <button className="rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-600">
              Home
            </button>
          </Link>
        </div>
      </div>

      {[error, pageError, summaryError]
        .filter((message): message is string => message !== null)
        .map((message) => (
          <div
            key={message}
            className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          >
            {message}
          </div>
        ))}

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
        {isSummaryLoading && summary.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 md:col-span-4">
            Loading warehouse summaries...
          </p>
        )}
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
              onChange={(event) => {
                setView(parseDashboardView(event.target.value));
                setPage(1);
              }}
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
              onChange={(event) => {
                setWarehouseFilter(parseWarehouseFilter(event.target.value));
                setPage(1);
              }}
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
              onChange={(event) => {
                setStatusFilter(parseStatusFilter(event.target.value));
                setPage(1);
              }}
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
              onChange={(event) => {
                pageAbortRef.current?.abort();
                setSearch(event.target.value);
              }}
              placeholder="Order, cart, bin, initials, description..."
              className="rounded border border-gray-300 bg-white p-2 text-black dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Rows
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(parsePageSize(event.target.value));
                setPage(1);
              }}
              className="rounded border border-gray-300 bg-white p-2 text-black dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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

      <div className="mb-3 flex flex-col gap-2 rounded-lg bg-white p-3 text-sm shadow dark:bg-gray-800 md:flex-row md:items-center md:justify-between">
        <p>
          Showing {firstVisibleRow}-{lastVisibleRow} of {totalCount} rows
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page <= 1 || isLoading}
            className="rounded bg-gray-200 px-3 py-1 font-semibold text-black hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() =>
              setPage((currentPage) => Math.min(totalPages, currentPage + 1))
            }
            disabled={page >= totalPages || isLoading}
            className="rounded bg-gray-200 px-3 py-1 font-semibold text-black hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200 text-left dark:bg-gray-700">
              {renderHeader("Warehouse", "page_type")}
              <th className="p-2">Status</th>
              {renderHeader("Reported", "timestamp")}
              {renderHeader("Age")}
              {renderHeader("Initials", "initials")}
              {renderHeader("Description", "description")}
              {renderHeader("Cart", "cart_number")}
              {renderHeader("Order", "order_number")}
              {renderHeader("Bin", "bin_location")}
              {renderHeader("Qty", "qty_missing")}
              {renderHeader("Cleared", "cleared_at")}
              {renderHeader("Downloaded", "exported_at")}
              {renderHeader("Actions")}
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
