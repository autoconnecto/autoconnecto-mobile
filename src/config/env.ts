export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.autoconnecto.in";

export const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL || "https://api.autoconnecto.in";

/** Always local JWT on E2E; Cognito/Amplify removed. */
export const AUTH_MODE =
  import.meta.env.VITE_AUTH_MODE || "local";

export const APP_ENV = import.meta.env.VITE_APP_ENV || "production";

export const APP_VERSION = "1.8.2";

export const LAST_DEVICE_KEY = "autoconnecto.mobile.lastDeviceId";
