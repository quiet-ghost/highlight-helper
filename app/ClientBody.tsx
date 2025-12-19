"use client";

import { useEffect, useState } from "react";
import { AuthProvider } from "../lib/authContext";
import GlobalNav from "../components/GlobalNav";
import SnowfallToggle from "../components/SnowfallToggle";
import Snowfall from "react-snowfall";
import "../styles/globals.css";

export function ClientBody({ children }: { children: React.ReactNode }) {
  const [isSnowfallEnabled, setIsSnowfallEnabled] = useState<boolean>(true);
  const [snowflakeCount, setSnowflakeCount] = useState<number>(500);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const snowfallEnabled =
      localStorage.getItem("snowfall-enabled") !== "disabled";
    setIsSnowfallEnabled(snowfallEnabled);
    setMounted(true);
  }, []);

  const toggleSnowfall = () => {
    if (isSnowfallEnabled) {
      // Start graceful shutdown
      setIsStopping(true);
      let currentCount = snowflakeCount;

      const reduceCount = () => {
        currentCount = Math.max(0, currentCount - 100);
        setSnowflakeCount(currentCount);

        if (currentCount > 0) {
          setTimeout(reduceCount, 300);
        } else {
          // Wait for remaining snowflakes to fall
          setTimeout(() => {
            setIsSnowfallEnabled(false);
            setIsStopping(false);
            setSnowflakeCount(400); // Reset for next time
            localStorage.setItem("snowfall-enabled", "disabled");
          }, 2000);
        }
      };

      reduceCount();
    } else {
      // Immediate enable
      setIsSnowfallEnabled(true);
      setSnowflakeCount(400);
      localStorage.setItem("snowfall-enabled", "enabled");
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      {(isSnowfallEnabled || isStopping) && (
        <Snowfall
          snowflakeCount={snowflakeCount}
          style={{
            position: "fixed",
            width: "100vw",
            height: "100vh",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 9999,
            transition: "opacity 0.5s ease-out",
            opacity: isStopping ? 0.3 : 1,
          }}
        />
      )}
      <AuthProvider>
        <GlobalNav />
        <SnowfallToggle
          isSnowfallEnabled={isSnowfallEnabled}
          onToggleSnowfall={toggleSnowfall}
        />
        {children}
      </AuthProvider>
    </>
  );
}
