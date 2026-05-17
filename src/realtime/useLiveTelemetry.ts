import { useEffect, useMemo, useState } from "react";
import { telemetryStore, type LiveTelemetryPoint } from "./telemetry.store";

interface UseLiveTelemetryArgs {
  deviceIds?: string[];
  keys?: string[];
  enabled?: boolean;
}

function buildTopicKey(deviceId: string, key: string) {
  return `${deviceId}__${key}`;
}

function normalizeStringArray(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean).map(String))).sort();
}

export function useLiveTelemetry({
  deviceIds = [],
  keys = [],
  enabled = true,
}: UseLiveTelemetryArgs) {
  const [pointsByTopic, setPointsByTopic] = useState<
    Record<string, LiveTelemetryPoint>
  >({});

  const normalizedDeviceIds = useMemo(
    () => normalizeStringArray(deviceIds),
    [deviceIds]
  );

  const normalizedKeys = useMemo(() => normalizeStringArray(keys), [keys]);

  const deviceIdsIdentity = useMemo(
    () => normalizedDeviceIds.join("|"),
    [normalizedDeviceIds]
  );

  const keysIdentity = useMemo(() => normalizedKeys.join("|"), [normalizedKeys]);

  useEffect(() => {
    if (!enabled || !normalizedDeviceIds.length) {
      setPointsByTopic({});
      return;
    }

    const stopFns: Array<() => void> = [];

    const handlePoint = (point: LiveTelemetryPoint) => {
      if (!point?.deviceId || !point?.key) return;
      if (
        normalizedKeys.length > 0 &&
        !normalizedKeys.includes(String(point.key))
      ) {
        return;
      }

      const topicKey = buildTopicKey(String(point.deviceId), String(point.key));

      setPointsByTopic((prev) => {
        const existing = prev[topicKey];
        if (
          existing &&
          existing.ts === point.ts &&
          existing.value === point.value
        ) {
          return prev;
        }
        return { ...prev, [topicKey]: point };
      });
    };

    for (const deviceId of normalizedDeviceIds) {
      stopFns.push(telemetryStore.subscribeToDevice(deviceId, handlePoint));
    }

    return () => {
      stopFns.forEach((stop) => stop());
    };
  }, [enabled, deviceIdsIdentity, keysIdentity]);

  return { pointsByTopic };
}
