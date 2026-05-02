"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import Login from "./Login";
import Modal from "./Modal";
import { useAuth } from "../lib/authContext";
import {
  clearMissingItems,
  getCompletedMissingItems,
  getMissingItems,
  MissingItem,
  PageType,
  parseMissingItemRow,
  updateMissingItem,
} from "../lib/missingItems";
import { downloadMissingItemsCsv } from "../lib/missingItemsExport";
import { canAccessWarehouse, canExportWarehouse } from "../lib/roles";
import { supabase } from "../lib/supabaseClient";
import { useDarkMode } from "../lib/useDarkMode";

type SortDirection = "asc" | "desc";
type CheckboxKey = "completed" | "on_cart" | "looked_for" | "fulf_1" | "fulf_2";
type FieldKey = Exclude<keyof MissingItem, CheckboxKey>;
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

function checkboxUpdate(key: CheckboxKey, checked: boolean): Partial<MissingItem> {
  switch (key) {
    case "completed":
      return { completed: checked };
    case "on_cart":
      return { on_cart: checked };
    case "looked_for":
      return { looked_for: checked };
    case "fulf_1":
      return { fulf_1: checked };
    case "fulf_2":
      return { fulf_2: checked };
  }
}

function compareValues(aValue: MissingItem[keyof MissingItem], bValue: MissingItem[keyof MissingItem]) {
  if (aValue === null || aValue === undefined) return 1;
  if (bValue === null || bValue === undefined) return -1;

  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }

  if (typeof aValue === "boolean" && typeof bValue === "boolean") {
    return Number(aValue) - Number(bValue);
  }

  return String(aValue).localeCompare(String(bValue));
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
  const { isDarkMode } = useDarkMode();
  const [sortField, setSortField] = useState<keyof MissingItem | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [dialog, setDialog] = useState<MissingItemsDialog | null>(null);
  const { isAuthenticated, claims, logout } = useAuth();
  const canAccess = canAccessWarehouse(claims, pageType);
  const canExport = canExportWarehouse(claims, pageType);

  useEffect(() => {
    if (!isAuthenticated || !canAccess) return;

    getMissingItems(pageType).then((items) => setMissingItems(items));

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
          if (!item) return;
          setMissingItems((prev) => [...prev, item]);
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
          if (!updatedItem) return;

          setMissingItems((prev) => {
            if (updatedItem.cleared_at) {
              return prev.filter((item) => item.id !== updatedItem.id);
            }
            return prev.map((item) =>
              item.id === updatedItem.id ? updatedItem : item,
            );
          });
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
          setMissingItems((prev) => prev.filter((item) => item.id !== id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canAccess, isAuthenticated, pageType]);

  const handleCheckboxChange = async (
    id: number,
    key: CheckboxKey,
    checked: boolean,
  ) => {
    await updateMissingItem(pageType, id, checkboxUpdate(key, checked));
  };

  const handleClearAll = async () => {
    const completedItems = await getCompletedMissingItems(pageType);
    if (completedItems.length === 0) {
      setDialog({ type: "empty-clear" });
      return;
    }

    setDialog({
      type: "confirm-clear",
      itemIds: completedItems.map((item) => item.id),
    });
  };

  const confirmClearCompleted = async (itemIds: number[]) => {
    await clearMissingItems(pageType, crypto.randomUUID(), itemIds);
    const items = await getMissingItems(pageType);
    setMissingItems(items);
    setDialog(null);
  };

  const handleDownloadCompleted = async () => {
    const completedItems = await getCompletedMissingItems(pageType);
    if (completedItems.length === 0) {
      setDialog({ type: "empty-download" });
      return;
    }

    downloadMissingItemsCsv(pageType, completedItems);
  };

  const handleSort = (field: keyof MissingItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedItems = sortField
    ? [...missingItems].sort((a, b) => {
        const comparison = compareValues(a[sortField], b[sortField]);
        return sortDirection === "asc" ? comparison : -comparison;
      })
    : missingItems;

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
      {missingItems.length === 0 ? (
        <p className="text-center text-black dark:text-white">
          No missing items reported yet.
        </p>
      ) : (
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
            {sortedItems.map((item) => (
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
