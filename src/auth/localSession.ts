const TOKEN_KEY = "autoconnecto_server_token";
const REFRESH_KEY = "autoconnecto_refresh_token";
const REMEMBER_KEY = "autoconnecto_remember_me";

export function isRememberMeEnabled(): boolean {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    return false;
  }
}

export function readServerToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token && token.length > 20 ? token : null;
  } catch {
    return null;
  }
}

export function readRefreshToken(): string | null {
  try {
    const t = localStorage.getItem(REFRESH_KEY);
    return t && t.length >= 32 ? t : null;
  } catch {
    return null;
  }
}

export function saveServerToken(
  token: string,
  opts?: { rememberMe?: boolean; refreshToken?: string | null }
) {
  const rememberMe = opts?.rememberMe === true;
  try {
    localStorage.setItem(REMEMBER_KEY, rememberMe ? "1" : "0");
    localStorage.setItem(TOKEN_KEY, token);
    if (rememberMe && opts?.refreshToken) {
      localStorage.setItem(REFRESH_KEY, String(opts.refreshToken));
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    /* private mode */
  }
}

export function clearServerToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* private mode */
  }
}

export function emailFromJwt(token: string | null): string | null {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(
      atob(part.replace(/-/g, "+").replace(/_/g, "/"))
    );
    const email = json?.email || json?.username || null;
    return email ? String(email).toLowerCase() : null;
  } catch {
    return null;
  }
}

/** In-memory only — temporary password for must-change flow after login. */
let pendingTempPassword: string | null = null;

export function stashTempPasswordForMustChange(password: string) {
  pendingTempPassword = password;
}

export function takeTempPasswordForMustChange(): string | null {
  const value = pendingTempPassword;
  pendingTempPassword = null;
  return value;
}
