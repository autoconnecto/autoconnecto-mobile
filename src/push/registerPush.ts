import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "../api/client";

export type PushAlarmOpen = { alarmId?: string };

let registered = false;

/**
 * Register FCM token for the signed-in user (Android). No-op on web.
 * Delivery also needs FCM_SERVER_KEY on the API; without it alarms still store/mail.
 */
export async function registerAlarmPush(opts?: {
  onOpenAlarm?: (info: PushAlarmOpen) => void;
}): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (Capacitor.getPlatform() !== "android") return;
  if (registered) return;

  const perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;

  await PushNotifications.register();
  registered = true;

  await PushNotifications.addListener("registration", (token) => {
    const value = String(token?.value || "").trim();
    if (value.length < 20) return;
    void api
      .post("/api/push-tokens", { token: value, platform: "android" })
      .catch(() => undefined);
  });

  await PushNotifications.addListener("registrationError", () => {
    registered = false;
  });

  await PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (event) => {
      const data = (event?.notification?.data || {}) as Record<string, unknown>;
      const alarmId = data.alarmId != null ? String(data.alarmId) : undefined;
      const open = data.open != null ? String(data.open) : undefined;
      if (open === "alarm" || alarmId) {
        opts?.onOpenAlarm?.({ alarmId });
      }
    }
  );
}

export async function unregisterAlarmPush(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const delivered = await PushNotifications.getDeliveredNotifications();
    if (delivered?.notifications?.length) {
      await PushNotifications.removeDeliveredNotifications(delivered);
    }
  } catch {
    /* ignore */
  }
  registered = false;
}
