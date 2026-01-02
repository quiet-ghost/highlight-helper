"use client";

import { AuthProvider } from "../lib/authContext";
import GlobalNav from "../components/GlobalNav";
import "../styles/globals.css";

export function ClientBody({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GlobalNav />
      {children}
    </AuthProvider>
  );
}
