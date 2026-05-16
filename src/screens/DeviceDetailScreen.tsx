import { useCallback, useEffect, useState } from "react";
import {
  ackAlarm,
  clearAlarm,
  fetchAlarmsForDevice,
  type AlarmRow,
} from "../api/alarms";
import {
  fetchDevice,
  getDeviceId,
  getDeviceLabel,
  getDeviceType,
  type DeviceRow,
} from "../api/devices";
import { TelemetryList } from "../components/TelemetryList";
import { getSocket } from "../realtime/socket";
import { formatTs, isDeviceActive } from "../utils/format";

type Props = {
  deviceId: string;
  fallback?: DeviceRow;
  onBack: () => void;
  onViewAllAlarms: (deviceId: string) => void;
};

function severityClass(severity?: string) {
  const s = (severity || "").toLowerCase();
  if (s === "critical") return "severity-critical";
  if (s === "major") return "severity-major";
  if (s === "minor") return "severity-minor";
  return "severity-default";
}

export function DeviceDetailScreen({
  deviceId,
  fallback,
  onBack,
  onViewAllAlarms,
}: Props) {
  const [device, setDevice] = useState<DeviceRow | null>(fallback ?? null);
  const [alarms, setAlarms] = useState<AlarmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [section, setSection] = useState<"info" | "telemetry" | "alarms">(
    "info"
  );

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [detail, deviceAlarms] = await Promise.all([
        fetchDevice(deviceId),
        fetchAlarmsForDevice(deviceId),
      ]);
      setDevice(detail);
      setAlarms(deviceAlarms);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load device"
      );
      if (fallback) setDevice(fallback);
    } finally {
      setLoading(false);
    }
  }, [deviceId, fallback]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => load();
    socket.on("alarm_update_global", refresh);
    socket.on("alarm_update", refresh);
    socket.on("device_status_update", refresh);
    return () => {
      socket.off("alarm_update_global", refresh);
      socket.off("alarm_update", refresh);
      socket.off("device_status_update", refresh);
    };
  }, [load]);

  const label = device ? getDeviceLabel(device) : deviceId;
  const active = isDeviceActive(device?.status);
  const activeAlarms = alarms.filter(
    (a) => String(a.status || "").toUpperCase() !== "CLEARED"
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
    <div className="detail-screen">
      <header className="detail-header">
        <button type="button" className="btn small secondary" onClick={onBack}>
          Back
        </button>
        <div className="detail-title-wrap">
          <h2 className="detail-title">{label}</h2>
          <p className="detail-meta muted small">{deviceId}</p>
        </div>
      </header>

      {loading ? <p className="muted center tab-screen">Loading…</p> : null}
      {error ? <p className="error center tab-screen">{error}</p> : null}

      {!loading && device ? (
        <>
          <div className="chip-row section-tabs">
            {(
              [
                ["info", "Info"],
                ["telemetry", "Telemetry"],
                ["alarms", `Alarms (${activeAlarms.length})`],
              ] as const
            ).map(([key, text]) => (
              <button
                key={key}
                type="button"
                className={`chip ${section === key ? "active" : ""}`}
                onClick={() => setSection(key)}
              >
                {text}
              </button>
            ))}
          </div>

          <div className="tab-screen">
            {section === "info" ? (
              <ul className="info-list">
                <li>
                  <span className="info-label">Status</span>
                  <span className="info-value">
                    <span
                      className={`status-dot ${active ? "online" : "offline"}`}
                    />{" "}
                    {device.status || "unknown"}
                  </span>
                </li>
                <li>
                  <span className="info-label">Type</span>
                  <span className="info-value">{getDeviceType(device)}</span>
                </li>
                {device.lastActivityTs ? (
                  <li>
                    <span className="info-label">Last activity</span>
                    <span className="info-value">
                      {formatTs(device.lastActivityTs)}
                    </span>
                  </li>
                ) : null}
                {device.profileId ? (
                  <li>
                    <span className="info-label">Profile</span>
                    <span className="info-value">{device.profileId}</span>
                  </li>
                ) : null}
              </ul>
            ) : null}

            {section === "telemetry" ? (
              <TelemetryList deviceId={getDeviceId(device) || deviceId} compact />
            ) : null}

            {section === "alarms" ? (
              <>
                <div className="section-head">
                  <p className="muted small">
                    {activeAlarms.length} active on this device
                  </p>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => onViewAllAlarms(deviceId)}
                  >
                    All tenant alarms
                  </button>
                </div>
                {activeAlarms.length === 0 ? (
                  <p className="muted center">No active alarms.</p>
                ) : (
                  <ul className="card-list compact">
                    {activeAlarms.map((alarm) => {
                      const busy = busyId === alarm.alarm_id;
                      return (
                        <li key={alarm.alarm_id} className="card alarm-card">
                          <div className="card-row">
                            <span
                              className={`badge ${severityClass(alarm.severity)}`}
                            >
                              {alarm.severity || "alarm"}
                            </span>
                            <span className="card-meta">{alarm.status}</span>
                          </div>
                          <p className="card-title">
                            {alarm.rule_name || alarm.triggerKey || "Alarm"}
                          </p>
                          <p className="card-meta">{formatTs(alarm.startTs)}</p>
                          <div className="card-actions">
                            {!alarm.acknowledged ? (
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
                )}
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
