"use client";

import Link from "next/link";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Login from "./Login";
import Modal from "./Modal";
import { useAuth } from "../lib/authContext";
import {
  clearMissingItems,
  getCompletedMissingItems,
  getMissingItemsPage,
  MissingItem,
  MissingItemCheckboxKey,
  PageType,
  parseMissingItemRow,
  updateMissingItem,
} from "../lib/missingItems";
import {
  MissingItemQueueChange,
  reconcileMissingItemQueue,
} from "../lib/missingItemQueue";
import { downloadMissingItemsCsv } from "../lib/missingItemsExport";
import { canAccessWarehouse, canExportWarehouse } from "../lib/roles";
import { supabase } from "../lib/supabaseClient";
import { useDarkMode } from "../lib/useDarkMode";

type SortDirection = "asc" | "desc";
type CheckboxKey = MissingItemCheckboxKey;
type FieldKey = Exclude<keyof MissingItem, CheckboxKey>;
type QueueLoadState = "loading" | "ready" | "error";
type RealtimeState = "connecting" | "live" | "degraded";
type MissingItemsDialog =
  | { type: "empty-clear" }
  | { type: "empty-download" }
  | { type: "confirm-clear"; itemIds: number[] };

export type MissingItemsColumn =
  | {
      type: "field";
      key: FieldKey;
      label: string;
      format?: "upper" | "timestamp";
      sortable?: boolean;
    }
  | {
      type: "checkbox";
      key: CheckboxKey;
      label: string;
      sortable?: boolean;
    };

export interface MissingItemsPageProps {
  pageType: PageType;
  title: string;
  backHref: string;
  backLabel: string;
  themeClass: string;
  columns: MissingItemsColumn[];
  getRowClassName: (item: MissingItem) => string;
}

const queuePageSize = 50;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string") return message;
  }
  return "An unexpected queue error occurred.";
}

function renderFieldValue(item: MissingItem, column: Extract<MissingItemsColumn, { type: "field" }>) {
  const value = item[column.key];

  if (column.format === "timestamp") {
    const timestamp = typeof value === "string" ? value : "";
    return timestamp ? new Date(timestamp).toLocaleString() : "";
  }

  if (column.format === "upper") {
    return String(value ?? "").toUpperCase();
  }

  return value ?? "";
}

function renderAccessDenied(title: string) {
  return (
    <div className="container p-5 text-center text-black dark:text-white">
      You do not have access to {title}.
    </div>
  );
}

export default function MissingItemsPage({
  pageType,
  title,
  backHref,
  backLabel,
  themeClass,
  columns,
  getRowClassName,
}: MissingItemsPageProps) {
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [queuePage, setQueuePage] = useState(1);
  const [loadState, setLoadState] = useState<QueueLoadState>("loading");
  const [realtimeState, setRealtimeState] =
    useState<RealtimeState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingCheckboxes, setPendingCheckboxes] = useState<Set<string>>(
    () => new Set(),
  );
  const { isDarkMode } = useDarkMode();
  const [sortField, setSortField] = useState<keyof MissingItem | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dialog, setDialog] = useState<MissingItemsDialog | null>(null);
  const { isAuthenticated, claims, logout } = useAuth();
  const canAccess = canAccessWarehouse(claims, pageType);
  const canExport = canExportWarehouse(claims, pageType);
  const queuePageRef = useRef(queuePage);
  const queueRequestIdRef = useRef(0);
  const eventVersionRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);

  const loadQueue = useCallback(
    async (page: number, showLoading: boolean) => {
      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;
      const requestId = queueRequestIdRef.current + 1;
      const eventVersion = eventVersionRef.current;
      queueRequestIdRef.current = requestId;

      if (showLoading) {
        setLoadState("loading");
        setLoadError(null);
        setMissingItems([]);
      }
      try {
        const result = await getMissingItemsPage(
          pageType,
          page,
          queuePageSize,
          sortField ?? "timestamp",
          sortField ? sortDirection : "desc",
          controller.signal,
        );
        if (
          controller.signal.aborted ||
          queueRequestIdRef.current !== requestId ||
          eventVersionRef.current !== eventVersion
        ) {
          return;
        }

        const totalPages = Math.max(
          1,
          Math.ceil(result.totalCount / queuePageSize),
        );
        if (page > totalPages) {
          queuePageRef.current = totalPages;
          setQueuePage(totalPages);
          return;
        }

        setMissingItems(result.items);
        setTotalCount(result.totalCount);
        setLoadState("ready");
        setLoadError(null);
      } catch (loadError) {
        if (
          controller.signal.aborted ||
          queueRequestIdRef.current !== requestId
        ) {
          return;
        }
        setLoadState("error");
        setLoadError(
          `Could not load missing items: ${getErrorMessage(loadError)}`,
        );
      }
    },
    [pageType, sortDirection, sortField],
  );

  useEffect(() => {
    if (!isAuthenticated || !canAccess) {
      loadAbortRef.current?.abort();
      queueRequestIdRef.current += 1;
      setMissingItems([]);
      setTotalCount(0);
      return;
    }

    queuePageRef.current = queuePage;
    void loadQueue(queuePage, true);
    return () => loadAbortRef.current?.abort();
  }, [canAccess, isAuthenticated, loadQueue, queuePage]);

  useEffect(() => {
    if (!isAuthenticated || !canAccess) return;

    let active = true;
    let resyncTimer: ReturnType<typeof setTimeout> | null = null;
    queuePageRef.current = 1;
    setQueuePage(1);
    setRealtimeState("connecting");

    const scheduleResync = (delay = 150) => {
      if (resyncTimer) clearTimeout(resyncTimer);
      resyncTimer = setTimeout(() => {
        if (active) void loadQueue(queuePageRef.current, false);
      }, delay);
    };

    const applyRealtimeChange = (change: MissingItemQueueChange) => {
      eventVersionRef.current += 1;
      setMissingItems((items) => {
        const changedId = change.type === "remove" ? change.id : change.item.id;
        const isVisible = items.some((item) => item.id === changedId);
        if (queuePageRef.current !== 1 && !isVisible) return items;
        if (sortField !== null) {
          if (!isVisible) return items;
          if (change.type === "remove" || change.item.cleared_at) {
            return items.filter((item) => item.id !== changedId);
          }
          return items.map((item) =>
            item.id === changedId ? change.item : item,
          );
        }
        return reconcileMissingItemQueue(items, change, queuePageSize);
      });
      scheduleResync();
    };

    const channel = supabase
      .channel(`${pageType}-missing`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "missing_items",
          filter: `page_type=eq.${pageType}`,
        },
        (payload) => {
          const item = parseMissingItemRow(payload.new);
          if (!item || item.page_type !== pageType) return;
          applyRealtimeChange({ type: "upsert", item });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "missing_items",
          filter: `page_type=eq.${pageType}`,
        },
        (payload) => {
          const updatedItem = parseMissingItemRow(payload.new);
          if (!updatedItem || updatedItem.page_type !== pageType) return;
          applyRealtimeChange({ type: "upsert", item: updatedItem });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "missing_items",
          filter: `page_type=eq.${pageType}`,
        },
        (payload) => {
          const id = typeof payload.old.id === "number" ? payload.old.id : null;
          if (id === null) return;
          applyRealtimeChange({ type: "remove", id });
        },
      )
      .subscribe((status) => {
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setRealtimeState("live");
          scheduleResync(0);
          return;
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeState("degraded");
        }
      });

    const handleOnline = () => scheduleResync(0);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleResync(0);
    };
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      if (resyncTimer) clearTimeout(resyncTimer);
      loadAbortRef.current?.abort();
      queueRequestIdRef.current += 1;
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [canAccess, isAuthenticated, loadQueue, pageType]);

  const handleCheckboxChange = async (
    id: number,
    key: CheckboxKey,
    checked: boolean,
  ) => {
    const pendingKey = `${id}:${key}`;
    const previousValue = Boolean(
      missingItems.find((item) => item.id === id)?.[key],
    );
    setPendingCheckboxes((current) => new Set(current).add(pendingKey));
    setMissingItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, [key]: checked } : item,
      ),
    );

    try {
      const updatedItem = await updateMissingItem(pageType, id, key, checked);
      setMissingItems((items) =>
        items.map((item) => (item.id === id ? updatedItem : item)),
      );
      setError(null);
    } catch (updateError) {
      setMissingItems((items) =>
        items.map((item) =>
          item.id === id ? { ...item, [key]: previousValue } : item,
        ),
      );
      setError(
        `Could not update item ${id}: ${getErrorMessage(updateError)} The checkbox was restored to its saved value.`,
      );
      void loadQueue(queuePageRef.current, false);
    } finally {
      setPendingCheckboxes((current) => {
        const next = new Set(current);
        next.delete(pendingKey);
        return next;
      });
    }
  };

  const handleClearAll = async () => {
    try {
      const completedItems = await getCompletedMissingItems(pageType);
      if (completedItems.length === 0) {
        setDialog({ type: "empty-clear" });
        return;
      }

      setDialog({
        type: "confirm-clear",
        itemIds: completedItems.map((item) => item.id),
      });
    } catch (clearError) {
      setError(`Could not load completed items: ${getErrorMessage(clearError)}`);
    }
  };

  const confirmClearCompleted = async (itemIds: number[]) => {
    try {
      await clearMissingItems(pageType, crypto.randomUUID(), itemIds);
      setDialog(null);
      await loadQueue(queuePageRef.current, false);
    } catch (clearError) {
      setError(`Could not clear completed items: ${getErrorMessage(clearError)}`);
    }
  };

  const handleDownloadCompleted = async () => {
    try {
      const completedItems = await getCompletedMissingItems(pageType);
      if (completedItems.length === 0) {
        setDialog({ type: "empty-download" });
        return;
      }

      downloadMissingItemsCsv(pageType, completedItems);
    } catch (downloadError) {
      setError(
        `Could not download completed items: ${getErrorMessage(downloadError)}`,
      );
    }
  };

  const handleSort = (field: keyof MissingItem) => {
    setQueuePage(1);
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / queuePageSize));
  const firstVisibleRow = totalCount === 0 ? 0 : (queuePage - 1) * queuePageSize + 1;
  const lastVisibleRow = Math.min(
    (queuePage - 1) * queuePageSize + missingItems.length,
    totalCount,
  );

  const dialogTitle =
    dialog?.type === "confirm-clear"
      ? "Clear Completed Items"
      : dialog?.type === "empty-download"
        ? "Nothing to Download"
        : "Nothing to Clear";

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {}} />;
  }

  if (!canAccess) return renderAccessDenied(title);

  return (
    <div className={`${themeClass} container p-5 ${isDarkMode ? "dark" : ""}`}>
      <h1 className="mb-5 text-3xl font-bold text-center text-black dark:text-white">
        {title}
      </h1>
      <div className="flex justify-between mb-4">
        <Link href={backHref}>
          <button className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600">
            {backLabel}
          </button>
        </Link>
        <div className="space-x-2">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600"
          >
            Clear Completed
          </button>
          {canExport && (
            <button
              onClick={handleDownloadCompleted}
              className="px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-600"
            >
              Download Completed CSV
            </button>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 font-bold text-white bg-gray-500 rounded hover:bg-gray-600"
          >
            Logout
          </button>
        </div>
      </div>
      {(error || loadError) && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <span>{error ?? loadError}</span>
          <button
            type="button"
            onClick={() => void loadQueue(queuePageRef.current, true)}
            className="shrink-0 rounded bg-red-700 px-3 py-1 font-bold text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}
      {realtimeState !== "live" && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {realtimeState === "connecting"
            ? "Connecting to live updates..."
            : "Live updates are temporarily unavailable. Existing rows remain visible and will resync when the connection returns."}
        </div>
      )}
      {loadState === "loading" && missingItems.length === 0 ? (
        <p className="text-center text-black dark:text-white">
          Loading missing items...
        </p>
      ) : loadState === "ready" && missingItems.length === 0 ? (
        <p className="text-center text-black dark:text-white">
          No missing items reported yet.
        </p>
      ) : missingItems.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                {columns.map((column) => {
                  const sortable = column.sortable ?? column.key !== "completed";
                  return (
                    <th
                      key={column.key}
                      onClick={() => sortable && handleSort(column.key)}
                      className={`p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600 ${
                        sortable
                          ? "cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                          : ""
                      }`}
                    >
                      {column.label}
                      {sortField === column.key && (
                        <span className="ml-2">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {missingItems.map((item) => (
                <tr key={item.id} className={getRowClassName(item)}>
                  {columns.map((column): ReactNode => {
                    if (column.type === "checkbox") {
                      return (
                        <td
                          key={column.key}
                          className="p-2 text-center text-black border border-gray-300 dark:text-white dark:border-gray-600"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(item[column.key])}
                            disabled={pendingCheckboxes.has(
                              `${item.id}:${column.key}`,
                            )}
                            onChange={(event) =>
                              handleCheckboxChange(
                                item.id,
                                column.key,
                                event.target.checked,
                              )
                            }
                          />
                        </td>
                      );
                    }

                    return (
                      <td
                        key={column.key}
                        className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600"
                      >
                        {renderFieldValue(item, column)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {missingItems.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-2 text-sm text-black dark:text-white sm:flex-row">
          <span>
            Showing {firstVisibleRow}-{lastVisibleRow} of {totalCount} active items
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQueuePage((current) => Math.max(1, current - 1))}
              disabled={queuePage <= 1 || loadState === "loading"}
              className="rounded bg-gray-700 px-4 py-2 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {queuePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                setQueuePage((current) => Math.min(totalPages, current + 1))
              }
              disabled={queuePage >= totalPages || loadState === "loading"}
              className="rounded bg-gray-700 px-4 py-2 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
      <Modal
        isOpen={dialog !== null}
        title={dialogTitle}
        onClose={() => setDialog(null)}
        footer={
          dialog?.type === "confirm-clear" ? (
            <>
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="px-4 py-2 font-bold text-white bg-gray-500 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmClearCompleted(dialog.itemIds)}
                className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600"
              >
                Clear Completed
              </button>
            </>
          ) : undefined
        }
      >
        {dialog?.type === "confirm-clear" ? (
          `Clear ${dialog.itemIds.length} completed missing item(s)? Records remain in history.`
        ) : dialog?.type === "empty-download" ? (
          "No completed missing items to download."
        ) : (
          "No completed missing items to clear."
        )}
      </Modal>
    </div>
  );
}
