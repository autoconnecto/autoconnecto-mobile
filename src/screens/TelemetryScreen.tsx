import { useEffect, useMemo, useState } from "react";
import {
  fetchLatestTelemetry,
  type DeviceRow,
  type TelemetrySnapshot,
} from "../api/devices";
import { DevicePicker } from "../components/DevicePicker";
import { LAST_DEVICE_KEY } from "../config/env";
import {
  telemetryStore,
  type LiveTelemetryPoint,
} from "../realtime/telemetry.store";

type Props = {
  deviceId: string;
  devices: DeviceRow[];
  onDeviceChange: (id: string) => void;
  devicesLoading: boolean;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatTs(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

export function TelemetryScreen({
  deviceId,
  devices,
  onDeviceChange,
  devicesLoading,
}: Props) {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>({});
  const [live, setLive] = useState<Record<string, LiveTelemetryPoint>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchLatestTelemetry(deviceId)
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load telemetry");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    setLive({});
    return telemetryStore.subscribeToDevice(deviceId, (point) => {
      setLive((prev) => ({ ...prev, [point.key]: point }));
    });
  }, [deviceId]);

  const rows = useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(snapshot),
      ...Object.keys(live),
    ]);
    return Array.from(keys)
      .sort()
      .map((key) => {
        const livePoint = live[key];
        const snap = snapshot[key];
        return {
          key,
          value: livePoint?.value ?? snap?.value,
          ts: livePoint?.ts ?? snap?.ts,
          live: Boolean(livePoint),
        };
      });
  }, [snapshot, live]);

  return (
    <div className="screen tab-screen">
      <DevicePicker
        value={deviceId}
        onChange={onDeviceChange}
        devices={devices}
        loading={devicesLoading}
      />
      {loading ? <p className="muted center">Loading…</p> : null}
      {error ? <p className="error center">{error}</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="muted center">No telemetry keys for this device.</p>
      ) : null}
      <ul className="card-list">
        {rows.map((row) => (
          <li key={row.key} className="card">
            <div className="card-row">
              <span className="card-title">{row.key}</span>
              {row.live ? <span className="badge live">live</span> : null}
            </div>
            <p className="card-value">{formatValue(row.value)}</p>
            {row.ts ? (
              <p className="card-meta">{formatTs(row.ts)}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

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
