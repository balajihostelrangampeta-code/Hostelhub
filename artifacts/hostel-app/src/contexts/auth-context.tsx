import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
    isLoading: true,
  });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data: { authenticated: boolean; username?: string }) => {
        setState({
          isAuthenticated: data.authenticated,
          username: data.username ?? null,
          isLoading: false,
        });
      })
      .catch(() => {
        setState({ isAuthenticated: false, username: null, isLoading: false });
      });
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe = false) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      });
      const data = await res.json() as { ok?: boolean; username?: string; error?: string };
      if (res.ok && data.ok) {
        setState({ isAuthenticated: true, username: data.username ?? username, isLoading: false });
        return { ok: true };
      }
      return { ok: false, error: data.error ?? "Login failed" };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setState({ isAuthenticated: false, username: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
