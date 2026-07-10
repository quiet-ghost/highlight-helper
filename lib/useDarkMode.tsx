"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const darkModeStorageKey = "dark-mode";

interface DarkModeContextValue {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextValue | null>(null);

function setDocumentDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle("dark", enabled);
}

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const applyStoredMode = (storedValue?: string | null) => {
      const enabled = storedValue === "enabled";
      setIsDarkMode(enabled);
      setDocumentDarkMode(enabled);
    };

    try {
      applyStoredMode(localStorage.getItem(darkModeStorageKey));
    } catch {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === darkModeStorageKey) applyStoredMode(event.newValue);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((previousMode) => {
      const nextMode = !previousMode;
      setDocumentDarkMode(nextMode);
      try {
        localStorage.setItem(
          darkModeStorageKey,
          nextMode ? "enabled" : "disabled",
        );
      } catch {
        // The document theme still works when storage is unavailable.
      }
      return nextMode;
    });
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error("useDarkMode must be used within a DarkModeProvider");
  }
  return context;
}
