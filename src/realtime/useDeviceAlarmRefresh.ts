import { useEffect } from "react";
import { getSocket } from "./socket";
import { retainDeviceRoom } from "./deviceRoom";

/**
 * Live alarm refresh for list/detail screens.
 * Backend emits `alarm_update` only to `device:{id}` rooms (no global fan-out).
 * Room retain is shared with telemetry/attributes so leaving Alarms cannot
 * drop a Device Detail subscription that is still open.
 */
export function useDeviceAlarmRefresh(
  deviceIds: string[],
  onAlarm: () => void
) {
  useEffect(() => {
    const ids = Array.from(
      new Set(
        (deviceIds || []).map((id) => String(id || "").trim()).filter(Boolean)
      )
    );
    if (!ids.length) return;

    const socket = getSocket();
    const handler = (msg: { deviceId?: string }) => {
      const deviceId = String(msg?.deviceId || "").trim();
      if (deviceId && !ids.includes(deviceId)) return;
      onAlarm();
    };

    socket.on("alarm_update", handler);
    const releases = ids.map((deviceId) => retainDeviceRoom(deviceId));

    return () => {
      socket.off("alarm_update", handler);
      for (const release of releases) release();
    };
  }, [deviceIds.join("|"), onAlarm]);
}
