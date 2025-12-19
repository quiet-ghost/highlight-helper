"use client";

import { createContext, useContext, ReactNode } from "react";

interface SnowfallContextType {
  isSnowfallEnabled: boolean;
  onToggleSnowfall: () => void;
}

const SnowfallContext = createContext<SnowfallContextType | undefined>(undefined);

export function SnowfallProvider({ 
  children, 
  isSnowfallEnabled, 
  onToggleSnowfall 
}: { 
  children: ReactNode;
  isSnowfallEnabled: boolean;
  onToggleSnowfall: () => void;
}) {
  return (
    <SnowfallContext.Provider value={{ isSnowfallEnabled, onToggleSnowfall }}>
      {children}
    </SnowfallContext.Provider>
  );
}

export function useSnowfall() {
  const context = useContext(SnowfallContext);
  if (context === undefined) {
    throw new Error("useSnowfall must be used within a SnowfallProvider");
  }
  return context;
}