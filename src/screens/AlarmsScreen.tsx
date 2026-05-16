import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ackAlarm,
  clearAlarm,
  fetchAlarms,
  type AlarmRow,
} from "../api/alarms";
import { PullRefresh } from "../components/PullRefresh";
import { getSocket } from "../realtime/socket";
import {
  filterAlarms,
  type AlarmListFilters,
  type AlarmSeverityFilter,
  type AlarmStatusFilter,
} from "../utils/alarmFilters";
import { formatTs } from "../utils/format";

type Props = {
  initialSeverity?: AlarmSeverityFilter;
  deviceIdFilter?: string;
};

function severityClass(severity?: string) {
  const s = (severity || "").toLowerCase();
  if (s === "critical") return "severity-critical";
  if (s === "major") return "severity-major";
  if (s === "minor") return "severity-minor";
  return "severity-default";
}

export function AlarmsScreen({
  initialSeverity = "all",
  deviceIdFilter,
}: Props) {
  const [alarms, setAlarms] = useState<AlarmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [severity, setSeverity] = useState<AlarmSeverityFilter>(initialSeverity);
  const [status, setStatus] = useState<AlarmStatusFilter>("active");

  useEffect(() => {
    setSeverity(initialSeverity);
  }, [initialSeverity]);

  const load = useCallback(async () => {
    setError("");
    try {
      const rows = await fetchAlarms();
      setAlarms(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load alarms"
      );
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

  const filters: AlarmListFilters = useMemo(
    () => ({
      severity,
      status,
      deviceId: deviceIdFilter,
    }),
    [severity, status, deviceIdFilter]
  );

  const visible = useMemo(
    () => filterAlarms(alarms, filters),
    [alarms, filters]
  );

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PullRefresh
      className="screen tab-screen"
      onRefresh={async () => {
        setLoading(true);
        await load();
      }}
    >
      {deviceIdFilter ? (
        <p className="muted small filter-hint">
          Filtered to device {deviceIdFilter}
        </p>
      ) : null}

      <div className="chip-row">
        {(["all", "critical", "major", "minor"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`chip ${severity === key ? "active" : ""}`}
            onClick={() => setSeverity(key)}
          >
            {key === "all" ? "All severities" : key}
          </button>
        ))}
      </div>

      <div className="chip-row">
        {(["active", "cleared", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`chip ${status === key ? "active" : ""}`}
            onClick={() => setStatus(key)}
          >
            {key === "active"
              ? "Active"
              : key === "cleared"
                ? "Cleared"
                : "All status"}
          </button>
        ))}
      </div>

      <div className="toolbar-row">
        <button
          type="button"
          className="btn small secondary"
          onClick={() => {
            setLoading(true);
            void load();
          }}
        >
          Refresh
        </button>
        <span className="muted small">{visible.length} shown</span>
      </div>

      {loading ? <p className="muted center">Loading…</p> : null}
      {error ? <p className="error center">{error}</p> : null}
      {!loading && visible.length === 0 ? (
        <p className="muted center">No alarms match your filters.</p>
      ) : null}

      <ul className="card-list">
        {visible.map((alarm) => {
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
    </PullRefresh>
  );
}
