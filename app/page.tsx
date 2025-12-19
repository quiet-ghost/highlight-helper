"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSnowfall } from "../lib/snowfallContext";

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const { isSnowfallEnabled } = useSnowfall();

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
          <button className={`px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-black btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Tackle Warehouse
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
        <Link href="/tennis">
          <button className={`px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-yellow-500 btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Tennis Warehouse
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
        <Link href="/running">
          <button className={`px-4 py-2 font-bold text-white bg-green-800 rounded hover:bg-green-600 btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Running Warehouse
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
        <Link href="/inline">
          <button className={`px-4 py-2 font-bold text-white bg-black rounded hover:bg-red-800 btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Inline Warehouse
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
        <button
          onClick={toggleDarkMode}
          className={`px-4 py-2 font-bold text-white bg-gray-700 rounded hover:bg-gray-800 btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
          {isSnowfallEnabled && <span className="snow-corner-right"></span>}
        </button>
      </div>
      <p className="mb-5 font-sans text-center text-gray-800 dark:text-white">
        View missing items (fulfillment only):
      </p>
      <div className="flex justify-center space-x-4">
        <Link href="/tackle-missing">
          <button className={`px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-black btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Tackle Missing
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
        <Link href="/tennis-missing">
          <button className={`px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-yellow-500 btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Tennis Missing
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
        <Link href="/running-missing">
          <button className={`px-4 py-2 font-bold text-white bg-green-800 rounded hover:bg-green-600 btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Running Missing
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
        <Link href="/inline-missing">
          <button className={`px-4 py-2 font-bold text-white bg-black rounded hover:bg-red-800 btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Inline Missing
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
      </div>
      <p className="mt-6 mb-2 font-sans text-center text-gray-800 dark:text-white">
        For Highlight Runners (level 3 Area):
      </p>
      <div className="flex justify-center mt-4 space-x-4">
        <Link href="/report-missing">
          <button className={`px-4 py-2 font-bold text-black bg-yellow-300 rounded hover:bg-yellow-400 btn-snow-accumulation ${isSnowfallEnabled ? 'stable' : 'no-snow'}`}>
            Highlight Searchers
            {isSnowfallEnabled && <span className="snow-corner-right"></span>}
          </button>
        </Link>
      </div>
    </div>
  );
}
