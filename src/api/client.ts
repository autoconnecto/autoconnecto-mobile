import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { clearServerToken, readServerToken } from "../auth/localSession";

const api = axios.create({
  baseURL: API_BASE_URL,
});

export function clearTokenCache() {
  // Lazy import avoids circular init with realtime / attributes.
  void import("../realtime/attribute.store")
    .then((m) => m.attributeStore.clear())
    .catch(() => undefined);
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
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      clearServerToken();
      clearTokenCache();
    }
    return Promise.reject(err);
  }
);

export default api;
