import { useEffect, useState } from "react";

const darkModeStorageKey = "dark-mode";

function setDocumentDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle("dark", enabled);
}

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const darkModeEnabled =
      localStorage.getItem(darkModeStorageKey) === "enabled";
    setIsDarkMode(darkModeEnabled);
    setDocumentDarkMode(darkModeEnabled);
    setMounted(true);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((previousMode) => {
      const nextMode = !previousMode;
      localStorage.setItem(
        darkModeStorageKey,
        nextMode ? "enabled" : "disabled",
      );
      setDocumentDarkMode(nextMode);
      return nextMode;
    });
  };

  return { isDarkMode, mounted, toggleDarkMode };
}
