"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { UserProfile } from "@/lib/types";

const REGISTRATION_PATHS = ["/complete-profile"];

function isRegistrationPath(pathname: string) {
  return REGISTRATION_PATHS.includes(pathname) || pathname.startsWith("/auth/");
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const profile = await api.auth.me();
    setUser(profile);
    return profile;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      refreshUser()
        .catch(() => api.clearTokens())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  useEffect(() => {
    if (loading || !user || user.profileComplete !== false) return;
    if (!isRegistrationPath(pathname)) {
      router.replace("/complete-profile");
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    const { accessToken, refreshToken } = await api.auth.login(email, password);
    api.setTokens(accessToken, refreshToken);
    return refreshUser();
  };

  const register = async (data: Record<string, unknown>) => {
    const { accessToken, refreshToken } = await api.auth.register(data);
    api.setTokens(accessToken, refreshToken);
    await refreshUser();
  };

  const logout = async () => {
    try { await api.auth.logout(); } finally { api.clearTokens(); setUser(null); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
