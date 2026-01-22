import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { auth, type AuthStatus } from "../lib/api";

interface AuthContextValue {
  status: AuthStatus;
  loading: boolean;
  login: (password: string, type?: "admin" | "kudos") => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthProvider() {
  const [status, setStatus] = useState<AuthStatus>({
    authenticated: false,
    type: null,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await auth.status();
      setStatus(result);
    } catch (error) {
      setStatus({ authenticated: false, type: null });
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (password: string, type: "admin" | "kudos" = "admin") => {
    try {
      await auth.login(password, type);
      await refresh();
      return true;
    } catch (error) {
      return false;
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      setStatus({ authenticated: false, type: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, login, logout, refresh };
}

export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
