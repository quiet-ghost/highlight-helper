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
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-5 text-center">
        Welcome to Highlight Helper
      </h1>
      <p className="font-sans text-gray-800 dark:text-white mb-5 text-center">
        Please select a company:
      </p>
      <div className="flex justify-center space-x-4 mb-4">
        <Link href="/tackle">
          <button className="bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-black">
            Tackle Warehouse
          </button>
        </Link>
        <Link href="/tennis">
          <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-yellow-500">
            Tennis Warehouse
          </button>
        </Link>
        <Link href="/running">
          <button className="bg-green-800 text-white px-4 py-2 rounded font-bold hover:bg-green-600">
            Running Warehouse
          </button>
        </Link>
        <button
          onClick={toggleDarkMode}
          className="bg-gray-700 text-white px-4 py-2 rounded font-bold hover:bg-gray-800"
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
      <p className="font-sans text-gray-800 dark:text-white mb-5 text-center">
        View missing items (fulfillment only):
      </p>
      <div className="flex justify-center space-x-4">
        <Link href="/tackle-missing">
          <button className="bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-black">
            Tackle Missing
          </button>
        </Link>
        <Link href="/tennis-missing">
          <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-yellow-500">
            Tennis Missing
          </button>
        </Link>
        <Link href="/running-missing">
          <button className="bg-green-800 text-white px-4 py-2 rounded font-bold hover:bg-green-600">
            Running Missing
          </button>
        </Link>
      </div>
    </div>
  );
}