// app/tackle/page.tsx
"use client";

import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import Controls from "../../components/Controls";
import {
  CartItem,
  bulkyList as initialBulkyList,
  hugeList as initialHugeList,
  rodBoxesList as initialRodBoxesList,
  rodCartsList as initialRodCartsList,
  smallsList as initialSmallsList,
} from "../../lib/tacCarts";

export default function Tackle() {
  const [cartInput, setCartInput] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const [bulkyList, setBulkyList] = useState<CartItem[]>(initialBulkyList);
  const [smallsList, setSmallsList] = useState<CartItem[]>(initialSmallsList);
  const [hugeList, setHugeList] = useState<CartItem[]>(initialHugeList);
  const [rodCartsList, setRodCartsList] = useState<CartItem[]>(initialRodCartsList);
  const [rodBoxesList, setRodBoxesList] = useState<CartItem[]>(initialRodBoxesList);

  const allLists = [bulkyList, smallsList, hugeList, rodCartsList, rodBoxesList];
  const setAllLists = [
    setBulkyList,
    setSmallsList,
    setHugeList,
    setRodCartsList,
    setRodBoxesList,
  ];

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
        <title>Highlight Helper - Tackle Warehouse</title>
      </Head>
      <div className={`tackle-theme container p-5 ${isDarkMode ? "dark" : ""}`}>
        <header className="mb-5 text-center">
          <h1 className="text-3xl font-bold text-black dark:text-white">
            Highlight Helper for Tackle Warehouse
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
          currentPage="tackle"
          onInputChange={(e) => setCartInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onReset={handleReset}
          onToggleDarkMode={toggleDarkMode}
        />

        <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Bulky</h4>
        <ul className="mb-6">
          {bulkyList.map((item) => (
            <li
              key={item.id}
              data-cart={item.id}
              onClick={() => handleItemClick(0, item.id)}
              onContextMenu={(e) => handleContextMenu(e, 0, item.id)}
              className={`p-3.5 text-black hover:bg-red-300 dark:text-white cursor-pointer ${
                item.count > 0 ? "selected dark:bg-red-600" : ""
              }`}
            >
              {renderItemText(item)}
            </li>
          ))}
        </ul>

        <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-6">Small</h4>
        <ul className="mb-6">
          {smallsList.map((item) => (
            <li
              key={item.id}
              data-cart={item.id}
              onClick={() => handleItemClick(1, item.id)}
              onContextMenu={(e) => handleContextMenu(e, 1, item.id)}
              className={`p-3.5 text-black hover:bg-red-300 dark:text-white cursor-pointer ${
                item.count > 0 ? "selected  dark:bg-red-600" : ""
              }`}
            >
              {renderItemText(item)}
            </li>
          ))}
        </ul>

        <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-6">Huge</h4>
        <ul className="mb-6">
          {hugeList.map((item) => (
            <li
              key={item.id}
              data-cart={item.id}
              onClick={() => handleItemClick(2, item.id)}
              onContextMenu={(e) => handleContextMenu(e, 2, item.id)}
              className={`p-3.5 text-black hover:bg-red-300 dark:text-white cursor-pointer ${
                item.count > 0 ? "selected  dark:bg-red-600" : ""
              }`}
            >
              {renderItemText(item)}
            </li>
          ))}
        </ul>

        <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-6">Rod carts</h4>
        <ul className="mb-6">
          {rodCartsList.map((item) => (
            <li
              key={item.id}
              data-cart={item.id}
              onClick={() => handleItemClick(3, item.id)}
              onContextMenu={(e) => handleContextMenu(e, 3, item.id)}
              className={`p-3.5 text-black hover:bg-red-300 dark:text-white cursor-pointer ${
                item.count > 0 ? "selected  dark:bg-red-600" : ""
              }`}
            >
              {renderItemText(item)}
            </li>
          ))}
        </ul>

        <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 mt-6">Rod Boxes</h4>
        <ul>
          {rodBoxesList.map((item) => (
            <li
              key={item.id}
              data-cart={item.id}
              onClick={() => handleItemClick(4, item.id)}
              onContextMenu={(e) => handleContextMenu(e, 4, item.id)}
              className={`p-3.5 text-black hover:bg-red-300 dark:text-white cursor-pointer ${
                item.count > 0 ? "selected  dark:bg-red-600" : ""
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