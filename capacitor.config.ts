import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.autoconnecto.mobile",
  appName: "Autoconnecto",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    // Required: WebView origin is https://localhost — browser CORS blocks API calls
    // unless requests go through the native HTTP stack.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
