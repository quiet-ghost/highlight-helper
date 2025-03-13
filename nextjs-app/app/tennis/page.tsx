// pages/tennis.tsx
"use client";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Controls from "../../components/Controls";
import {
  CartItem,
  tennisCarts as initialTennisCarts,
} from "../../lib/tennisCarts";

export default function Tennis() {
  const [cartInput, setCartInput] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [tennisCarts, setTennisCarts] = useState<CartItem[]>(initialTennisCarts);

  const allLists = [tennisCarts];
  const setAllLists = [setTennisCarts];

  useEffect(() => {
    const darkModeEnabled = localStorage.getItem("dark-mode") === "enabled";
    setIsDarkMode(darkModeEnabled);
    setMounted(true);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = cartInput.trim();
      if (query) {
        allLists.forEach((list, index) => {
          setAllLists[index]((prevList) =>
            prevList.map((item) => {
              if (item.id === query || item.number === query) {
                return { ...item, count: item.count + 1 };
              }
              return item;
            })
          );
        });
        setCartInput("");
      }
    }
  };

  const handleItemClick = (listIndex: number, itemId: string) => {
    setAllLists[listIndex]((prevList) =>
      prevList.map((item) =>
        item.id === itemId ? { ...item, count: item.count + 1 } : item
      )
    );
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLLIElement>,
    listIndex: number,
    itemId: string
  ) => {
    e.preventDefault();
    setAllLists[listIndex]((prevList) =>
      prevList.map((item) =>
        item.id === itemId ? { ...item, count: 0 } : item
      )
    );
  };

  const handleReset = () => {
    setCartInput("");
    setAllLists.forEach((setList) =>
      setList((prevList) => prevList.map((item) => ({ ...item, count: 0 })))
    );
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      localStorage.setItem("dark-mode", newMode ? "enabled" : "disabled");
      return newMode;
    });
  };

  const renderItemText = (item: CartItem) =>
    item.count > 1 ? `${item.originalText} x${item.count}` : item.originalText;

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Highlight Helper - Tennis Warehouse</title>
      </Head>
      <div className={`tennis-theme container p-5 ${isDarkMode ? "dark" : ""}`}>
        <header className="mb-5 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Highlight Helper for Tennis Warehouse
          </h1>
        </header>

        <div className="flex justify-end mb-4">
        <Link href="/report-missing?pageType=tackle">
          <button className="bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-red-600">
            Report Missing
          </button>
        </Link>
        </div>

        <Controls
          cartInput={cartInput}
          isDarkMode={isDarkMode}
          currentPage="tennis"
          onInputChange={(e) => setCartInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onReset={handleReset}
          onToggleDarkMode={toggleDarkMode}
        />

        <h4 className="text-xl font-semibold text-blue-600 dark:text-gray-200 mb-2">
          Tennis Carts
        </h4>
        <ul className="mb-6">
          {tennisCarts.map((item) => (
            <li
              key={item.id}
              data-cart={item.id}
              onClick={() => handleItemClick(0, item.id)}
              onContextMenu={(e) => handleContextMenu(e, 0, item.id)}
              className={`p-5 text-black hover:bg-yellow-200 cursor-pointer ${
                item.count > 0 ? "selected dark:bg-yellow-400 dark:text-black" : "dark:text-white"
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