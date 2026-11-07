const TOKEN_KEY = "autoconnecto_server_token";
const TEMP_PASSWORD_KEY = "autoconnecto.mobile.mustChangeTemp";

/** E2E / server-package uses local JWT (AUTH_MODE=local). AWS Cognito is retired. */
export function isServerInstall(): boolean {
  const mode = String(import.meta.env.VITE_AUTH_MODE || "local").trim();
  return mode === "local" || mode === "";
}

export function readServerToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token && token.length > 20 ? token : null;
  } catch {
    return null;
  }
}

export function saveServerToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearServerToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export function stashTempPasswordForMustChange(password: string) {
  try {
    sessionStorage.setItem(TEMP_PASSWORD_KEY, password);
  } catch {
    /* ignore */
  }
}

export function takeTempPasswordForMustChange(): string {
  try {
    const v = sessionStorage.getItem(TEMP_PASSWORD_KEY) || "";
    sessionStorage.removeItem(TEMP_PASSWORD_KEY);
    return v;
  } catch {
    return "";
  }
}

export function emailFromJwt(token: string | null): string | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(
      atob(part.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { email?: string; preferred_username?: string };
    return json.email || json.preferred_username || null;
  } catch {
    return null;
  }
}
