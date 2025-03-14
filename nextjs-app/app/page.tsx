"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const darkModeEnabled = localStorage.getItem("dark-mode") === "enabled";
    setIsDarkMode(darkModeEnabled);
    if (darkModeEnabled) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("dark-mode", newMode ? "enabled" : "disabled");
      if (newMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return newMode;
    });
  };

  return (
    <div className="container p-5">
      <h1 className="mb-5 text-3xl font-bold text-center text-gray-800 dark:text-white">
        Welcome to Highlight Helper
      </h1>
      <p className="mb-5 font-sans text-center text-gray-800 dark:text-white">
        Please select a company:
      </p>
      <div className="flex justify-center mb-4 space-x-4">
        <Link href="/tackle">
          <button className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-black">
            Tackle Warehouse
          </button>
        </Link>
        <Link href="/tennis">
          <button className="px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-yellow-500">
            Tennis Warehouse
          </button>
        </Link>
        <Link href="/running">
          <button className="px-4 py-2 font-bold text-white bg-green-800 rounded hover:bg-green-600">
            Running Warehouse
          </button>
        </Link>
        <button
          onClick={toggleDarkMode}
          className="px-4 py-2 font-bold text-white bg-gray-700 rounded hover:bg-gray-800"
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      <p className="mb-5 font-sans text-center text-gray-800 dark:text-white">
        View missing items (fulfillment only):
      </p>
      <div className="flex justify-center space-x-4">
        <Link href="/tackle-missing">
          <button className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-black">
            Tackle Missing
          </button>
        </Link>
        <Link href="/tennis-missing">
          <button className="px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-yellow-500">
            Tennis Missing
          </button>
        </Link>
        <Link href="/running-missing">
          <button className="px-4 py-2 font-bold text-white bg-green-800 rounded hover:bg-green-600">
            Running Missing
          </button>
        </Link>
      </div>
      <p className="mt-6 mb-2 font-sans text-center text-gray-800 dark:text-white">
        For Highlight Runners (level 3 Area):
      </p>
      <div className="flex justify-center mt-4 space-x-4">
        <Link href="/report-missing">
          <button className="px-4 py-2 font-bold text-black bg-yellow-300 rounded hover:bg-yellow-400">
            Highlight Searchers
          </button>
        </Link>
        </div>
    </div>
);
}
