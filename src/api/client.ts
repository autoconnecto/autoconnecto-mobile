import axios from "axios";
import { API_BASE_URL } from "../config/env";
import {
  clearServerToken,
  readRefreshToken,
  readServerToken,
  saveServerToken,
} from "../auth/localSession";
import { notifyUnauthorized } from "../auth/sessionEvents";

const api = axios.create({
  baseURL: API_BASE_URL,
});

let refreshInFlight: Promise<string | null> | null = null;

export function clearTokenCache() {
  // Lazy import avoids circular init with realtime / attributes.
  void import("../realtime/attribute.store")
    .then((m) => m.attributeStore.clear())
    .catch(() => undefined);
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) return null;
  try {
    const base = API_BASE_URL.replace(/\/$/, "");
    const { data } = await axios.post(`${base}/api/auth/refresh`, {
      refreshToken,
    });
    if (!data?.accessToken) return null;
    saveServerToken(String(data.accessToken), {
      rememberMe: true,
      refreshToken: data.refreshToken
        ? String(data.refreshToken)
        : refreshToken,
    });
    return String(data.accessToken);
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  let url = config.url || "";
  if (!url.startsWith("/api")) {
    url = "/api" + (url.startsWith("/") ? url : `/${url}`);
  }
  config.url = url;

  const token = readServerToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    const cfg = err?.config;
    if (status === 401 && cfg && !cfg.__retriedAfterRefresh) {
      if (readRefreshToken()) {
        cfg.__retriedAfterRefresh = true;
        if (!refreshInFlight) {
          refreshInFlight = tryRefresh().finally(() => {
            refreshInFlight = null;
          });
        }
        const renewed = await refreshInFlight;
        if (renewed) {
          cfg.headers = cfg.headers || {};
          cfg.headers.Authorization = `Bearer ${renewed}`;
          return api.request(cfg);
        }
      }
      clearServerToken();
      clearTokenCache();
      // Drop React auth state so App shows LoginScreen — do not leave raw Axios text on dashboards/alarms.
      notifyUnauthorized();
      const sessionErr = new Error("Session expired. Sign in again.");
      (sessionErr as Error & { isUnauthorized?: boolean }).isUnauthorized = true;
      return Promise.reject(sessionErr);
    }
    return Promise.reject(err);
  }
);

export default api;
