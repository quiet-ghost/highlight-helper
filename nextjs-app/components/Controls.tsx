// components/Controls.tsx
"use client";
import Link from "next/link";
import { ChangeEvent, KeyboardEvent } from "react";

interface ControlsProps {
  cartInput: string;
  isDarkMode: boolean;
  currentPage: "tackle" | "tennis" | "running";
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onToggleDarkMode: () => void;
}

export default function Controls({
  cartInput,
  isDarkMode,
  currentPage,
  onInputChange,
  onKeyDown,
  onReset,
  onToggleDarkMode,
}: ControlsProps) {
  const buttonStyles = {
    tackle: "bg-red-500 hover:bg-black dark:bg-red-500 dark:hover:bg-black", // updated tackle hover style
    tennis: "bg-blue-600 hover:bg-yellow-500 dark:bg-blue-600 dark:hover:bg-yellow-500",
    running: "bg-green-800 hover:bg-green-600 dark:bg-green-800 dark:hover:bg-green-600",
  };

  const currentButtonStyle = buttonStyles[currentPage];

  return (
    <div className="input-wrapper mb-10 grid gap-2 justify-center">
      <div className="controls flex space-x-4">
        <input
          type="text"
          id="cartInput"
          placeholder="Enter cart number"
          value={cartInput}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          className="w-52 px-2 py-2 text-base border border-gray-300 rounded dark:bg-inherit dark:text-gray-200 dark:border-red-300"
        />
        <button
          onClick={onReset}
          className={`${currentButtonStyle} text-white px-4 py-2 rounded font-bold`}
        >
          Reset
        </button>
        <button
          onClick={onToggleDarkMode}
          className={`${currentButtonStyle} text-white px-4 py-2 rounded font-bold`}
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <div className="nav-buttons flex justify-center space-x-4">
        {currentPage === "tackle" ? (
          <button
            disabled
            className="bg-gray-300 text-gray-700 cursor-not-allowed px-4 py-2 rounded font-bold"
          >
            Tackle Warehouse
          </button>
        ) : (
          <Link href="/tackle">
            <button className={`${buttonStyles.tackle} text-white px-4 py-2 rounded font-bold hover:bg-gray-800`}>
              Tackle Warehouse
            </button>
          </Link>
        )}
        {currentPage === "tennis" ? (
          <button
            disabled
            className="bg-gray-300 text-gray-700 cursor-not-allowed px-4 py-2 rounded font-bold"
          >
            Tennis Warehouse
          </button>
        ) : (
          <Link href="/tennis">
            <button className={`${buttonStyles.tennis} text-white px-4 py-2 rounded font-bold hover:bg-yellow-500`}>
              Tennis Warehouse
            </button>
          </Link>
        )}
        {currentPage === "running" ? (
          <button
            disabled
            className="bg-gray-300 text-gray-700 cursor-not-allowed px-4 py-2 rounded font-bold"
          >
            Running Warehouse
          </button>
        ) : (
          <Link href="/running">
            <button className={`${buttonStyles.running} text-white px-4 py-2 rounded font-bold hover:bg-green-600`}>
              Running Warehouse
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}