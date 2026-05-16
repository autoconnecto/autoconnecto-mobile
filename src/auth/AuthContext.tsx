import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
} from "aws-amplify/auth";
import { clearTokenCache } from "../api/client";
import { disconnectSocket } from "../realtime/socket";
import "./cognito";

type AuthState = {
  loading: boolean;
  isAuthenticated: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      await getCurrentUser();
      const session = await fetchAuthSession();
      if (session.tokens?.idToken) {
        setIsAuthenticated(true);
        const payload = session.tokens.idToken.payload as {
          email?: string;
        };
        setEmail(payload.email ?? null);
        return;
      }
    } catch {
      /* not signed in */
    }
    setIsAuthenticated(false);
    setEmail(null);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      await signIn({ username, password });
      clearTokenCache();
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await signOut();
    clearTokenCache();
    disconnectSocket();
    setIsAuthenticated(false);
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({ loading, isAuthenticated, email, login, logout }),
    [loading, isAuthenticated, email, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
