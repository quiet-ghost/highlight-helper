"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../lib/authContext";
import { PageType } from "../lib/missingItems";
import { getAuthorizedWarehouseSet } from "../lib/roles";
import { warehouseList, warehouses } from "../lib/warehouses";

export default function GlobalNav() {
  const pathname = usePathname(); // Get current URL path
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { claims } = useAuth();
  const access = getAuthorizedWarehouseSet(claims);

  // Determine the current page type based on pathname
  const getCurrentPageType = (): PageType | null => {
    if (pathname.startsWith("/tackle")) return "tackle";
    if (pathname.startsWith("/tennis")) return "tennis";
    if (pathname.startsWith("/running")) return "running";
    if (pathname.startsWith("/inline")) return "inline";
    return null;
  };

  const currentPageType = getCurrentPageType();

  // Check if we're on a missing items page
  const isMissingPage = pathname.includes("-missing");

  // Filter out the current page’s button for the hamburger menu
  const otherPages = warehouseList.filter(
    (warehouse) =>
      warehouse.pageType !== currentPageType &&
      (access.canAdmin || access.warehouses.includes(warehouse.pageType)),
  );

  return (
    <div className="fixed top-4 right-4 flex items-center space-x-2 z-50">
      {/* Show the relevant "Missing" button if on a main page */}
      {currentPageType && !isMissingPage && (
        <Link href={warehouses[currentPageType].missingRoute}>
          <button
            className={`${warehouses[currentPageType].buttonClass} text-white px-4 py-2 rounded font-bold`}
          >
            {warehouses[currentPageType].label} Missing Items
          </button>
        </Link>
      )}

      {/* Hamburger Menu */}
      <div className="fixed top-4 left-4">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="border-inherit text-white px-4 py-2 rounded font-bold hover:bg-gray-800 focus:outline-none"
        >
          ☰ {/* Hamburger icon */}
        </button>
        {/* Home Button */}
        <Link href="/">
          <button className="bg-inherit text-white px-4 py-2 rounded font-bold hover:bg-gray-800">
            🏠 {/* Home icon */}
          </button>
        </Link>
        {access.canAdmin && (
          <Link href="/admin/missing-items">
            <button className="bg-inherit text-white px-4 py-2 rounded font-bold hover:bg-gray-800">
              Admin
            </button>
          </Link>
        )}

        {isMenuOpen && (
          <div className="absolute top-12 left-0 bg-gray-800 rounded-lg shadow-lg p-2 w-48">
            {otherPages.map((warehouse) => (
              <Link key={warehouse.pageType} href={warehouse.missingRoute}>
                <button
                  className={`${warehouse.buttonClass} text-white text-sm px-4 py-2 rounded font-bold w-full text-left mb-1`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {warehouse.label} Missing Items
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
