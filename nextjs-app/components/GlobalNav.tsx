"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function GlobalNav() {
  const pathname = usePathname(); // Get current URL path
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Determine the current page type based on pathname
  const getCurrentPageType = () => {
    if (pathname.startsWith("/tackle")) return "tackle";
    if (pathname.startsWith("/tennis")) return "tennis";
    if (pathname.startsWith("/running")) return "running";
    return null;
  };

  const currentPageType = getCurrentPageType();

  // Map page types to their missing page routes and styles
  const pageMap = {
    tackle: {
      missingRoute: "/tackle-missing",
      buttonClass: "bg-red-500 hover:bg-red-600",
      label: "Tackle Missing Items",
    },
    tennis: {
      missingRoute: "/tennis-missing",
      buttonClass: "bg-blue-600 hover:bg-blue-700",
      label: "Tennis Missing Items",
    },
    running: {
      missingRoute: "/running-missing",
      buttonClass: "bg-green-800 hover:bg-green-900",
      label: "Running Missing Items",
    },
  };

  // Filter out the current page’s button for the hamburger menu
  const otherPages = Object.entries(pageMap).filter(
    ([key]) => key !== currentPageType
  );

  return (
    <div className="fixed top-4 right-4 flex items-center space-x-2 z-50">
      {/* Show the relevant "Missing" button if on a main page */}
      {currentPageType && (
        <Link href={pageMap[currentPageType].missingRoute}>
          <button
            className={`${pageMap[currentPageType].buttonClass} text-white px-4 py-2 rounded font-bold`}
          >
            {pageMap[currentPageType].label}
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

        {isMenuOpen && (
          <div className="absolute top-12 left-0 bg-gray-800 rounded-lg shadow-lg p-2 w-48">
            {otherPages.map(([key, { missingRoute, buttonClass, label }]) => (
              <Link key={key} href={missingRoute}>
                <button
                  className={`${buttonClass} text-white text-sm px-4 py-2 rounded font-bold w-full text-left mb-1`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}