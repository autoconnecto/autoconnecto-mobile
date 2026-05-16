import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "in.autoconnecto.mobile",
  appName: "Autoconnecto",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
