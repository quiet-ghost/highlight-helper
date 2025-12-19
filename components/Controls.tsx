// components/Controls.tsx
"use client";
import Link from "next/link";
import { ChangeEvent, KeyboardEvent } from "react";
import { useSnowAnimation } from "../lib/useSnowAnimation";

interface ControlsProps {
  cartInput: string;
  isDarkMode: boolean;
  isSnowfallEnabled: boolean;
  currentPage: "tackle" | "tennis" | "running" | "inline";
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onToggleDarkMode: () => void;
}

export default function Controls({
  cartInput,
  isDarkMode,
  isSnowfallEnabled,
  currentPage,
  onInputChange,
  onKeyDown,
  onReset,
  onToggleDarkMode,
}: ControlsProps) {
  const snowAnimationState = useSnowAnimation(isSnowfallEnabled);

  const buttonStyles = {
    tackle: "bg-red-500 hover:bg-black dark:bg-red-500 dark:hover:bg-black",
    tennis:
      "bg-blue-600 hover:bg-yellow-500 dark:bg-blue-600 dark:hover:bg-yellow-500",
    running:
      "bg-green-800 hover:bg-green-600 dark:bg-green-800 dark:hover:bg-green-600",
    inline: "bg-black hover:bg-red-500 dark:bg-black dark:hover:bg-red-500",
  };

  const currentButtonStyle = buttonStyles[currentPage];
  const snowClass = `btn-snow-accumulation ${snowAnimationState}`;


  return (
    <div className="grid justify-center gap-2 mb-10 input-wrapper">
      <div className="flex space-x-4 controls">
        <input
          type="text"
          id="cartInput"
          placeholder="Enter cart number"
          value={cartInput}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          className="px-2 py-2 text-base border border-gray-300 rounded w-52 dark:bg-inherit dark:text-gray-200 dark:border-red-300"
        />
        <button
          onClick={onReset}
          className={`${currentButtonStyle} ${snowClass} text-white px-4 py-2 rounded font-bold`}
        >
          Reset
          {isSnowfallEnabled && (
            <>
              <span className="snow-corner-right"></span>
              <span className="snow-mount snow-mount-1"></span>
              <span className="snow-mount snow-mount-2"></span>
              <span className="snow-mount snow-mount-3"></span>
            </>
          )}
        </button>
        <button
          onClick={onToggleDarkMode}
          className={`${currentButtonStyle} ${snowClass} text-white px-4 py-2 rounded font-bold`}
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
          {isSnowfallEnabled && (
            <>
              <span className="snow-corner-right"></span>
              <span className="snow-mount snow-mount-1"></span>
              <span className="snow-mount snow-mount-2"></span>
              <span className="snow-mount snow-mount-3"></span>
            </>
          )}
        </button>
      </div>

      <div className="flex justify-center space-x-4 nav-buttons">
        {currentPage === "tackle" ? (
          <button
            disabled
            className="px-4 py-2 font-bold text-gray-700 bg-gray-300 rounded cursor-not-allowed"
          >
            Tackle Warehouse
          </button>
        ) : (
          <Link href="/tackle">
            <button
              className={`${buttonStyles.tackle} ${snowClass} text-white px-4 py-2 rounded font-bold hover:bg-gray-800`}
            >
              Tackle Warehouse
              {isSnowfallEnabled && <span className="snow-corner-right"></span>}
            </button>
          </Link>
        )}
        {currentPage === "tennis" ? (
          <button
            disabled
            className="px-4 py-2 font-bold text-gray-700 bg-gray-300 rounded cursor-not-allowed"
          >
            Tennis Warehouse
          </button>
        ) : (
          <Link href="/tennis">
            <button
              className={`${buttonStyles.tennis} ${snowClass} text-white px-4 py-2 rounded font-bold hover:bg-yellow-500`}
            >
              Tennis Warehouse
              {isSnowfallEnabled && <span className="snow-corner-right"></span>}
            </button>
          </Link>
        )}
        {currentPage === "running" ? (
          <button
            disabled
            className="px-4 py-2 font-bold text-gray-700 bg-gray-300 rounded cursor-not-allowed"
          >
            Running Warehouse
          </button>
        ) : (
          <Link href="/running">
            <button
              className={`${buttonStyles.running} ${snowClass} text-white px-4 py-2 rounded font-bold hover:bg-green-600`}
            >
              Running Warehouse
              {isSnowfallEnabled && <span className="snow-corner-right"></span>}
            </button>
          </Link>
        )}
        {currentPage === "inline" ? (
          <button
            disabled
            className="px-4 py-2 font-bold text-gray-700 bg-gray-300 rounded cursor-not-allowed"
          >
            Inline Warehouse
          </button>
        ) : (
          <Link href="/inline">
            <button
              className={`${buttonStyles.inline} ${snowClass} text-white px-4 py-2 rounded font-bold hover:bg-black`}
            >
              Inline Warehouse
              {isSnowfallEnabled && <span className="snow-corner-right"></span>}
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
