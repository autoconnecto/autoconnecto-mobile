import { useEffect, useMemo, useState } from "react";
import {
  fetchLatestTelemetry,
  type TelemetrySnapshot,
} from "../api/devices";
import {
  telemetryStore,
  type LiveTelemetryPoint,
} from "../realtime/telemetry.store";
import { formatTs, formatValue } from "../utils/format";

type Props = {
  deviceId: string;
  compact?: boolean;
};

export function TelemetryList({ deviceId, compact }: Props) {
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

  if (!deviceId) {
    return <p className="muted center">No device selected.</p>;
  }

  return (
    <>
      {loading ? <p className="muted center">Loading telemetry…</p> : null}
      {error ? <p className="error center">{error}</p> : null}
      {!loading && rows.length === 0 ? (
        <p className="muted center">No telemetry keys for this device.</p>
      ) : null}
      <ul className={`card-list ${compact ? "compact" : ""}`}>
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
    </>
  );
}
