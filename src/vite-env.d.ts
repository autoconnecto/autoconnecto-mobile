/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  readonly VITE_AUTH_MODE: string;
  readonly VITE_APP_ENV: string;
  /** Set true only when android/app/google-services.json is in the APK build. */
  readonly VITE_ENABLE_PUSH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
