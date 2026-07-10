"use client";

import { AuthProvider } from "../lib/authContext";
import GlobalNav from "../components/GlobalNav";
import { DarkModeProvider } from "../lib/useDarkMode";
import "../styles/globals.css";

export function ClientBody({ children }: { children: React.ReactNode }) {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <GlobalNav />
        {children}
      </AuthProvider>
    </DarkModeProvider>
  );
}
