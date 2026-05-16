import { useCallback, useEffect, useState } from "react";
import {
  ackAlarm,
  clearAlarm,
  fetchAlarms,
  type AlarmRow,
} from "../api/alarms";
import { getSocket } from "../realtime/socket";

function severityClass(severity?: string) {
  const s = (severity || "").toLowerCase();
  if (s === "critical") return "severity-critical";
  if (s === "major") return "severity-major";
  if (s === "minor") return "severity-minor";
  return "severity-default";
}

function formatTs(ts?: number | null) {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

export function AlarmsScreen() {
  const [alarms, setAlarms] = useState<AlarmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const rows = await fetchAlarms();
      setAlarms(rows);
    } catch {
      setError("Failed to load alarms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => load();
    socket.on("alarm_update_global", refresh);
    socket.on("alarm_update", refresh);
    return () => {
      socket.off("alarm_update_global", refresh);
      socket.off("alarm_update", refresh);
    };
  }, [load]);

  async function onAck(alarm: AlarmRow) {
    setBusyId(alarm.alarm_id);
    try {
      await ackAlarm(alarm.alarm_id);
      await load();
    } catch {
      setError("Ack failed");
    } finally {
      setBusyId(null);
    }
  }

  async function onClear(alarm: AlarmRow) {
    setBusyId(alarm.alarm_id);
    try {
      await clearAlarm(alarm.alarm_id);
      await load();
    } catch {
      setError("Clear failed");
    } finally {
      setBusyId(null);
    }
  }

  const active = alarms.filter(
    (a) => (a.status || "").toUpperCase() !== "CLEARED"
  );

  return (
    <div className="screen tab-screen">
      {loading ? <p className="muted center">Loading…</p> : null}
      {error ? <p className="error center">{error}</p> : null}
      {!loading && active.length === 0 ? (
        <p className="muted center">No active alarms.</p>
      ) : null}
      <ul className="card-list">
        {active.map((alarm) => {
          const busy = busyId === alarm.alarm_id;
          const acknowledged = Boolean(alarm.acknowledged);
          return (
            <li key={alarm.alarm_id} className="card alarm-card">
              <div className="card-row">
                <span className={`badge ${severityClass(alarm.severity)}`}>
                  {alarm.severity || "alarm"}
                </span>
                <span className="card-meta">{alarm.status}</span>
              </div>
              <p className="card-title">
                {alarm.rule_name || alarm.triggerKey || "Alarm"}
              </p>
              <p className="card-meta">
                {alarm.device_name || alarm.device_id || "—"}
              </p>
              {alarm.triggerValue !== undefined &&
              alarm.triggerValue !== null ? (
                <p className="card-value">{String(alarm.triggerValue)}</p>
              ) : null}
              <p className="card-meta">{formatTs(alarm.startTs)}</p>
              <div className="card-actions">
                {!acknowledged ? (
                  <button
                    type="button"
                    className="btn small"
                    disabled={busy}
                    onClick={() => onAck(alarm)}
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="badge acked">Acked</span>
                )}
                <button
                  type="button"
                  className="btn small secondary"
                  disabled={busy}
                  onClick={() => onClear(alarm)}
                >
                  Clear
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
