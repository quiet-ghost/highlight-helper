"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Login from "../../components/Login";
import { useAuth } from "../../lib/authContext";
import {
  clearMissingItems,
  getMissingItems,
  MissingItem,
  updateMissingItem,
} from "../../lib/missingItems";
import { supabase } from "../../lib/supabaseClient";

export default function RunningMissing() {
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sortField, setSortField] = useState<keyof MissingItem | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const darkModeEnabled = localStorage.getItem("dark-mode") === "enabled";
    setIsDarkMode(darkModeEnabled);
    if (darkModeEnabled) {
      document.documentElement.classList.add("dark");
    }

    if (!isAuthenticated) return;

    // Initial fetch
    getMissingItems("running").then((items) => setMissingItems(items || []));

    // Real-time subscription
    const channel = supabase
      .channel("running-missing")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "missing_items",
          filter: "page_type=eq.running",
        },
        (payload) => {
          console.log("INSERT:", payload);
          setMissingItems((prev) => [...prev, payload.new as MissingItem]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "missing_items",
          filter: "page_type=eq.running",
        },
        (payload) => {
          console.log("UPDATE:", payload);
          setMissingItems((prev) =>
            prev.map((item) =>
              item.id === payload.new.id ? (payload.new as MissingItem) : item,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "missing_items",
          filter: "page_type=eq.running",
        },
        (payload) => {
          console.log("DELETE:", payload);
          setMissingItems((prev) => {
            const newItems = prev.filter((item) => item.id !== payload.old.id);
            console.log("After DELETE, new items:", newItems);
            return newItems;
          });
        },
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const handleCompleteChange = async (id: number, completed: boolean) => {
    await updateMissingItem("running", id, { completed });
  };

  const handleChecked1Change = async (id: number, checked: boolean) => {
    await updateMissingItem("running", id, { on_cart: checked });
  };

  const handleChecked2Change = async (id: number, checked: boolean) => {
    await updateMissingItem("running", id, { looked_for: checked });
  };

  const handleClearAll = async () => {
    if (
      confirm(
        "Are you sure you want to clear the completed missing items? There is no coming back from this...",
      )
    ) {
      console.log("Clearing completed items...");
      await clearMissingItems("running");
    }
  };

  const handleSort = (field: keyof MissingItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedItems = () => {
    if (!sortField) return missingItems;

    return [...missingItems].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else {
        comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className={`running-theme container p-5 ${isDarkMode ? "dark" : ""}`}>
      <h1 className="mb-5 text-3xl font-bold text-center text-black dark:text-white">
        Running Warehouse Missing Items
      </h1>
      <div className="flex justify-between mb-4">
        <Link href="/running">
          <button className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600">
            Back to Running
          </button>
        </Link>
        <div className="space-x-2">
          <button
            onClick={handleClearAll}
            className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600"
          >
            Clear Completed
          </button>
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
              {[
                { key: "initials", label: "Initials" },
                { key: "description", label: "Item Description" },
                { key: "cart_number", label: "Cart #" },
                { key: "order_number", label: "Order #" },
                { key: "cart_location", label: "Cart Pos" },
                { key: "bin_location", label: "Bin" },
                { key: "on_hand_qty", label: "On Hand" },
                { key: "qty_missing", label: "Qty Missing" },
                { key: "timestamp", label: "Timestamp" },
                { key: "completed", label: "Complete" },
                { key: "on_cart", label: "On Cart" },
                { key: "looked_for", label: "Looked For" },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() =>
                    key !== "completed" && handleSort(key as keyof MissingItem)
                  }
                  className={`p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600 ${
                    key !== "completed"
                      ? "cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600"
                      : ""
                  }`}
                >
                  {label}
                  {sortField === key && (
                    <span className="ml-2">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {getSortedItems().map((item) => (
              <tr
                key={item.id}
                className={`${
                  item.completed
                    ? "bg-gray-300 dark:bg-gray-600 opacity-10"
                    : item.on_cart
                      ? "bg-blue-100 dark:bg-green-900"
                      : item.looked_for
                        ? "bg-green-100 dark:bg-blue-900"
                        : "even:bg-gray-100 dark:even:bg-gray-800"
                }`}
              >
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {item.initials.toUpperCase()}
                </td>
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {item.description}
                </td>
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {item.cart_number}
                </td>
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {item.order_number}
                </td>
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {item.cart_location}
                </td>
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {item.bin_location.toUpperCase()}
                </td>
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {item.on_hand_qty}
                </td>
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {item.qty_missing}
                </td>
                <td className="p-2 text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
                <td className="p-2 text-center text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={item.completed || false}
                    onChange={(e) =>
                      handleCompleteChange(item.id, e.target.checked)
                    }
                  />
                </td>
                <td className="p-2 text-center text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={item.on_cart || false}
                    onChange={(e) =>
                      handleChecked1Change(item.id, e.target.checked)
                    }
                  />
                </td>
                <td className="p-2 text-center text-black border border-gray-300 dark:text-white dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={item.looked_for || false}
                    onChange={(e) =>
                      handleChecked2Change(item.id, e.target.checked)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
