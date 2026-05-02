"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { parseAppRoles, RoleClaims } from "./roles";
import { supabase } from "./supabaseClient";

interface AuthContextType {
  isAuthenticated: boolean;
  claims: RoleClaims | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [claims, setClaims] = useState<RoleClaims | null>(null);

  const applySession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]) => {
    setIsAuthenticated(!!session);
    setClaims(
      session
        ? {
            userId: session.user.id,
            email: session.user.email ?? null,
            roles: parseAppRoles(session.user.app_metadata.roles),
          }
        : null,
    );
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      applySession(session);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return false;
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, claims, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
