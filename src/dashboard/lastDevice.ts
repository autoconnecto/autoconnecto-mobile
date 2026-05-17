import { LAST_DEVICE_KEY } from "../config/env";

export function readLastDeviceId(): string {
  try {
    return localStorage.getItem(LAST_DEVICE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveLastDeviceId(id: string) {
  try {
    if (id) localStorage.setItem(LAST_DEVICE_KEY, id);
  } catch {
    /* ignore */
  }
}
