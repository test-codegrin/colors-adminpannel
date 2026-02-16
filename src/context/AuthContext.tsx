import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { Admin, AuthContextValue, LoginResponse } from "@/types/auth.types";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function parseAdminFromStorage(): Admin | null {
  const storedAdmin = localStorage.getItem("adminInfo");

  if (!storedAdmin) {
    return null;
  }

  try {
    return JSON.parse(storedAdmin) as Admin;
  } catch {
    localStorage.removeItem("adminInfo");

    return null;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string>(() => localStorage.getItem("adminToken") ?? "");
  const [admin, setAdmin] = useState<Admin | null>(() => parseAdminFromStorage());

  const login = ({ token: nextToken, admin: nextAdmin }: LoginResponse) => {
    localStorage.setItem("adminToken", nextToken);
    localStorage.setItem("adminInfo", JSON.stringify(nextAdmin));
    setToken(nextToken);
    setAdmin(nextAdmin);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminInfo");
    setToken("");
    setAdmin(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      token,
      login,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [admin, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
