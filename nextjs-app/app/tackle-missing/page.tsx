"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Login from "../../components/Login";
import { useAuth } from "../../lib/authContext";
import { clearMissingItems, getMissingItems, MissingItem, updateMissingItem } from "../../lib/missingItems";
import { supabase } from "../../lib/supabaseClient";

export default function TackleMissing() {
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const darkModeEnabled = localStorage.getItem("dark-mode") === "enabled";
    setIsDarkMode(darkModeEnabled);

    if (isAuthenticated) {
      getMissingItems("tackle").then(setMissingItems);

      const channel = supabase
        .channel("tackle-missing")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "missing_items", filter: "page_type=eq.tackle" },
          () => getMissingItems("tackle").then(setMissingItems)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]);

  const handleCompleteChange = async (id: number, completed: boolean) => {
    await updateMissingItem("tackle", id, completed);
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all missing items?")) {
      await clearMissingItems("tackle");
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <div className={`tackle-theme container p-5 ${isDarkMode ? "dark" : ""}`}>
      <h1 className="text-3xl font-bold text-black dark:text-white mb-5 text-center">
        Tackle Warehouse Missing Items
      </h1>
      <div className="flex justify-between mb-4">
        <Link href="/tackle">
          <button className="bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-red-600">
            Back to Tackle
          </button>
        </Link>
        <div className="space-x-2">
          <button
            onClick={handleClearAll}
            className="bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-red-600"
          >
            Clear All
          </button>
          <button
            onClick={logout}
            className="bg-gray-500 text-white px-4 py-2 rounded font-bold hover:bg-gray-600"
          >
            Logout
          </button>
        </div>
      </div>
      {missingItems.length === 0 ? (
        <p className="text-black dark:text-white text-center">No missing items reported yet.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700">
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Initials</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Item Description</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Cart #</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Order #</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Cart Pos</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Bin</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">On Hand</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Qty Missing</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Timestamp</th>
              <th className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">Complete</th>
            </tr>
          </thead>
          <tbody>
            {missingItems.map((item) => (
              <tr
                key={item.id}
                className={`even:bg-gray-100 dark:even:bg-gray-800 ${
                  item.completed ? "bg-gray-300 dark:bg-gray-600 opacity-50" : ""
                }`}
              >
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">{item.initials}</td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">{item.description}</td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">{item.cart_number}</td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">{item.order_number}</td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">{item.cart_location}</td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">{item.bin_location}</td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">{item.on_hand_qty}</td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">{item.qty_missing}</td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600">
                  {new Date(item.timestamp).toLocaleString()}
                </td>
                <td className="p-2 text-black dark:text-white border border-gray-300 dark:border-gray-600 text-center">
                  <input
                    type="checkbox"
                    checked={item.completed || false}
                    onChange={(e) => handleCompleteChange(item.id, e.target.checked)}
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