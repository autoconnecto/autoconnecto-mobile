import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import { clearTokenCache } from "../api/client";
import api from "../api/client";
import { API_BASE_URL } from "../config/env";
import { disconnectSocket, resetSocket, getSocket } from "../realtime/socket";
import {
  clearServerToken,
  emailFromJwt,
  readServerToken,
  saveServerToken,
  stashTempPasswordForMustChange,
  takeTempPasswordForMustChange,
} from "./localSession";

type AuthState = {
  loading: boolean;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  email: string | null;
  login: (email: string, password: string) => Promise<void>;
  completeMustChange: (newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function refreshSocketAfterAuth() {
  resetSocket();
  try {
    getSocket();
  } catch {
    /* optional */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = readServerToken();
    if (!token) {
      setIsAuthenticated(false);
      setMustChangePassword(false);
      setEmail(null);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setIsAuthenticated(true);
      setEmail(
        String(data?.email || emailFromJwt(token) || "").toLowerCase() || null
      );
      setMustChangePassword(Boolean(data?.mustChangePassword));
    } catch {
      clearServerToken();
      clearTokenCache();
      setIsAuthenticated(false);
      setMustChangePassword(false);
      setEmail(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      const base = API_BASE_URL.replace(/\/$/, "");
      try {
        const { data } = await axios.post(`${base}/api/auth/login`, {
          email: username,
          password,
        });
        if (!data?.accessToken) throw new Error("Login failed");
        saveServerToken(String(data.accessToken));
        clearTokenCache();
        refreshSocketAfterAuth();
        if (data?.mustChangePassword) {
          stashTempPasswordForMustChange(password);
          setMustChangePassword(true);
          setIsAuthenticated(true);
          setEmail(username);
          return;
        }
        setMustChangePassword(false);
        await refresh();
      } catch (err: any) {
        const status = err?.response?.status;
        const apiMessage = err?.response?.data?.message;
        if (status === 401) {
          throw new Error(
            Array.isArray(apiMessage)
              ? apiMessage.join(", ")
              : apiMessage || "Incorrect email or password"
          );
        }
        throw err instanceof Error ? err : new Error("Login failed");
      }
    },
    [refresh]
  );

  const completeMustChange = useCallback(
    async (newPassword: string) => {
      const current = takeTempPasswordForMustChange();
      if (!current) {
        throw new Error("Sign in again with the temporary password first");
      }
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword,
      });
      setMustChangePassword(false);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    const token = readServerToken();
    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL.replace(/\/$/, "")}/api/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch {
        /* still clear local */
      }
    }
    clearServerToken();
    clearTokenCache();
    disconnectSocket();
    setIsAuthenticated(false);
    setMustChangePassword(false);
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      isAuthenticated,
      mustChangePassword,
      email,
      login,
      completeMustChange,
      logout,
    }),
    [
      loading,
      isAuthenticated,
      mustChangePassword,
      email,
      login,
      completeMustChange,
      logout,
    ]
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
