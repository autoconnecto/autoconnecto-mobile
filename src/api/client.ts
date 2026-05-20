import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";
import { API_BASE_URL } from "../config/env";

const api = axios.create({
  baseURL: API_BASE_URL,
});

let tokenCache = "";
let tokenExp = 0;

async function getToken() {
  const now = Date.now();
  if (tokenCache && now < tokenExp) {
    return tokenCache;
  }

  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (token) {
    tokenCache = token;
    tokenExp = now + 5 * 60 * 1000;
  }
  return token || null;
}

export function clearTokenCache() {
  tokenCache = "";
  tokenExp = 0;
}

api.interceptors.request.use(async (config) => {
  let url = config.url || "";
  if (!url.startsWith("/api")) {
    url = "/api" + (url.startsWith("/") ? url : `/${url}`);
  }
  config.url = url;

  const token = await getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    if (status === 401) {
      return Promise.reject(
        new Error("Session expired. Sign out and sign in again.")
      );
    }
    if (!error?.response) {
      return Promise.reject(
        new Error(
          `Cannot reach API (${API_BASE_URL}). Check network connection.`
        )
      );
    }
    const raw = error?.response?.data?.message;
    const message =
      Array.isArray(raw) && raw.length
        ? String(raw[0])
        : typeof raw === "string" && raw.trim()
          ? raw
          : `API error ${status ?? "?"} on ${url ?? "request"}`;
    return Promise.reject(new Error(message));
  }
);

export default api;
