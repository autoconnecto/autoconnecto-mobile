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

export default api;
