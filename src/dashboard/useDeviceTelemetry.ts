import { useEffect, useState } from "react";
import { fetchLatestTelemetry } from "../api/devices";
import { telemetryStore } from "../realtime/telemetry.store";

export type TelemetryPoint = {
  value: unknown;
  ts: number;
  live?: boolean;
};

export function useDeviceTelemetry(
  deviceId: string | null,
  keys: string[]
): Record<string, TelemetryPoint> {
  const [values, setValues] = useState<Record<string, TelemetryPoint>>({});
  const keySignature = keys.slice().sort().join("|");

  useEffect(() => {
    if (!deviceId || keys.length === 0) {
      setValues({});
      return;
    }

    let cancelled = false;

    fetchLatestTelemetry(deviceId)
      .then((snapshot) => {
        if (cancelled) return;
        const next: Record<string, TelemetryPoint> = {};
        for (const key of keys) {
          const row = snapshot[key];
          if (row) {
            next[key] = { value: row.value, ts: row.ts, live: false };
          }
        }
        setValues((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {
        /* keep partial */
      });

    const unsubscribe = telemetryStore.subscribeToDevice(deviceId, (point) => {
      if (!keys.includes(point.key)) return;
      setValues((prev) => ({
        ...prev,
        [point.key]: { value: point.value, ts: point.ts, live: true },
      }));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [deviceId, keySignature]);

  return values;
}
