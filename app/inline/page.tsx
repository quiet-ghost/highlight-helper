"use client";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Controls from "../../components/Controls";
import {
  CartItem,
  inlineCarts as initialInlineList,
} from "../../lib/inlineCarts";

export default function Inline() {
  const [cartInput, setCartInput] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [inlineCarts, setInlineList] = useState<CartItem[]>(initialInlineList);

  useEffect(() => {
    const darkModeEnabled = localStorage.getItem("dark-mode") === "enabled";
    setIsDarkMode(darkModeEnabled);
    if (darkModeEnabled) {
      document.documentElement.classList.add("dark");
    }
    setMounted(true);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = cartInput.trim();
      if (query) {
        setInlineList((prevList) =>
          prevList.map((item) =>
            item.id === query || item.number === query
              ? { ...item, count: item.count + 1 }
              : item,
          ),
        );
        setCartInput("");
      }
    }
  };

  const handleItemClick = (itemId: string) => {
    setInlineList((prevList) =>
      prevList.map((item) =>
        item.id === itemId ? { ...item, count: item.count + 1 } : item,
      ),
    );
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLLIElement>,
    itemId: string,
  ) => {
    e.preventDefault();
    setInlineList((prevList) =>
      prevList.map((item) =>
        item.id === itemId ? { ...item, count: 0 } : item,
      ),
    );
  };

  const handleReset = () => {
    setCartInput("");
    setInlineList((prevList) =>
      prevList.map((item) => ({ ...item, count: 0 })),
    );
  };

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

  const renderItemText = (item: CartItem) =>
    item.count > 1 ? `${item.originalText} x${item.count}` : item.originalText;

  if (!mounted) return null;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Highlight Helper - Inline Warehouse</title>
      </Head>
      <div
        className={`running-theme container p-5 ${isDarkMode ? "dark" : ""}`}
      >
        <header className="mb-5 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Highlight Helper for Inline Warehouse
          </h1>
        </header>

        <div className="flex justify-end mb-4">
          <Link href="/report-missing?pageType=inline">
            <button className="bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-red-600">
              Report Missing
            </button>
          </Link>
        </div>

        <Controls
          cartInput={cartInput}
          isDarkMode={isDarkMode}
          currentPage="inline"
          onInputChange={(e) => setCartInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onReset={handleReset}
          onToggleDarkMode={toggleDarkMode}
        />
        <h4 className="text-xl font-semibold text-red-600 dark:text-red-500 mb-2">
          Inline Carts
        </h4>
        <ul className="mb-6">
          {inlineCarts.map((item) => (
            <li
              key={item.id}
              data-cart={item.id}
              onClick={() => handleItemClick(item.id)}
              onContextMenu={(e) => handleContextMenu(e, item.id)}
              className={`p-5 text-black hover:bg-red-400 dark:text-white cursor-pointer ${
                item.count > 0 ? "selected dark:bg-red-800" : ""
              }`}
            >
              {renderItemText(item)}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
