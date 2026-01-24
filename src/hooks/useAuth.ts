import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { authClient } from "../lib/auth";
import { setApiUser } from "../lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

interface Permissions {
  read: boolean;       // Can view public pages (daily, weekly, reports, research)
  viewKudos: boolean;  // Can view kudos page
  admin: boolean;      // Can access admin pages
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authenticated: boolean;
  permissions: Permissions;
  signInWithGoogle: (callbackURL: string) => void;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const defaultPermissions: Permissions = { read: false, viewKudos: false, admin: false };

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuthProvider() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);

  const fetchSession = useCallback(async () => {
    try {
      const { data } = await authClient.getSession();
      setUser(data?.user ?? null);
      setSession(data?.session ?? null);

      // Update API client with user info for authenticated requests
      if (data?.user?.id && data?.user?.email) {
        setApiUser({ id: data.user.id, email: data.user.email });

        // Fetch permissions from backend
        const authResponse = await fetch("/api/auth", {
          headers: {
            "x-user-id": data.user.id,
            "x-user-email": data.user.email,
          },
        });
        const authData = await authResponse.json();
        setAuthenticated(authData.authenticated ?? false);
        setPermissions(authData.permissions ?? defaultPermissions);
      } else {
        setApiUser(null);
        setAuthenticated(false);
        setPermissions(defaultPermissions);
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
      setUser(null);
      setSession(null);
      setApiUser(null);
      setAuthenticated(false);
      setPermissions(defaultPermissions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const signInWithGoogle = useCallback((callbackURL: string) => {
    authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${callbackURL}`,
    });
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    // Hard redirect clears all state
    window.location.href = "/";
  }, []);

  return {
    user,
    session,
    loading,
    authenticated,
    permissions,
    signInWithGoogle,
    signOut,
    refetch: fetchSession,
  };
}

export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
