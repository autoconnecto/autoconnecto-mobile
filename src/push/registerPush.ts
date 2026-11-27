import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "../api/client";

export type PushAlarmOpen = { alarmId?: string };

let registered = false;
let lastToken: string | null = null;

/**
 * True only when the APK was built with Firebase (`google-services.json` +
 * `VITE_ENABLE_PUSH=true`). Calling `PushNotifications.register()` without
 * FirebaseApp initialized crashes the Android process — JS cannot catch it
 * (Capacitor rethrows as RuntimeException on the plugin thread).
 *
 * Release CI currently has no google-services.json, so push stays off by default.
 * Local dry-run on the API (`FCM_DRY_RUN=true`) still works if you POST a fake
 * token via `/api/operations/push-tokens` without building an APK.
 */
function pushEnabled(): boolean {
  return String(import.meta.env.VITE_ENABLE_PUSH || "").trim() === "true";
}

/**
 * Register FCM token for the signed-in user (Android). No-op on web / when push disabled.
 * Delivery needs FCM credentials or FCM_DRY_RUN on the API; without them alarms still store/mail.
 */
export async function registerAlarmPush(opts?: {
  onOpenAlarm?: (info: PushAlarmOpen) => void;
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() !== "android") return;
  if (!pushEnabled()) return;
  if (registered) return;

  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;

    await PushNotifications.register();
    registered = true;

    await PushNotifications.addListener("registration", (token) => {
      const value = String(token?.value || "").trim();
      if (value.length < 20) return;
      lastToken = value;
      void api
        .post("/push-tokens", { token: value, platform: "android" })
        .catch(() => undefined);
    });

    await PushNotifications.addListener("registrationError", () => {
      registered = false;
    });

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (event) => {
        const data = (event?.notification?.data || {}) as Record<
          string,
          unknown
        >;
        const alarmId = data.alarmId != null ? String(data.alarmId) : undefined;
        const open = data.open != null ? String(data.open) : undefined;
        if (open === "alarm" || alarmId) {
          opts?.onOpenAlarm?.({ alarmId });
        }
      }
    );
  } catch {
    registered = false;
  }
}

export async function unregisterAlarmPush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (!pushEnabled()) return;
  const token = lastToken;
  lastToken = null;
  registered = false;
  try {
    if (token) {
      await api
        .post("/push-tokens/remove", { token, platform: "android" })
        .catch(() => undefined);
    }
    const delivered = await PushNotifications.getDeliveredNotifications();
    if (delivered?.notifications?.length) {
      await PushNotifications.removeDeliveredNotifications(delivered);
    }
  } catch {
    /* ignore */
  }
}
