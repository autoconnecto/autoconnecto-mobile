import { useCallback, useEffect, useState } from "react";
import { fetchAlarms, type AlarmRow } from "../api/alarms";
import {
  getDeviceId,
  getDeviceLabel,
  type DeviceRow,
} from "../api/devices";
import {
  getShowSolutionSamples,
  subscribeShowSolutionSamples,
} from "../preferences/showSolutionSamples";
import { MeterList } from "../components/MeterList";
import { formatTs, isDeviceActive } from "../utils/format";

type Props = {
  devices: DeviceRow[];
  loading: boolean;
  onOpenDevices: () => void;
  onOpenAlarms: () => void;
  onOpenDevice: (deviceId: string) => void;
};

export function SummaryScreen({
  devices,
  loading,
  onOpenDevices,
  onOpenAlarms,
  onOpenDevice,
}: Props) {
  const [alarmsLoading, setAlarmsLoading] = useState(true);
  const [activeAlarms, setActiveAlarms] = useState<AlarmRow[]>([]);

  const loadAlarms = useCallback(async () => {
    setAlarmsLoading(true);
    try {
      const rows = await fetchAlarms({
        includeSolutionDemo: getShowSolutionSamples(),
      });
      setActiveAlarms(
        rows.filter(
          (row) => String(row.status || "").toUpperCase() === "ACTIVE"
        )
      );
    } catch {
      setActiveAlarms([]);
    } finally {
      setAlarmsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlarms();
    return subscribeShowSolutionSamples(() => {
      void loadAlarms();
    });
  }, [loadAlarms]);

  const live = devices.filter((d) => isDeviceActive(d.status));
  const offline = devices.filter((d) => !isDeviceActive(d.status));

  return (
    <div className="screen tab-screen">
      <div className="stat-grid">
        <button
          type="button"
          className="stat-card"
          onClick={onOpenDevices}
          disabled={loading}
        >
          <span className="stat-value">{loading ? "—" : live.length}</span>
          <span className="stat-label">Live</span>
          <span className="stat-sub">Devices seen recently</span>
        </button>
        <button
          type="button"
          className="stat-card"
          onClick={onOpenDevices}
          disabled={loading}
        >
          <span className="stat-value">{loading ? "—" : offline.length}</span>
          <span className="stat-label">Offline</span>
          <span className="stat-sub">No recent activity</span>
        </button>
        <button
          type="button"
          className="stat-card alarm-stat"
          onClick={onOpenAlarms}
          disabled={alarmsLoading}
        >
          <span className="stat-value">
            {alarmsLoading ? "—" : activeAlarms.length}
          </span>
          <span className="stat-label">Active alarms</span>
          <span className="stat-sub">Any device in your scope</span>
        </button>
      </div>

      <MeterList
        devices={devices}
        alarms={activeAlarms}
        onOpenDevice={onOpenDevice}
      />

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Active alarms</h2>
          <button type="button" className="link-btn" onClick={onOpenAlarms}>
            See all
          </button>
        </div>
        {alarmsLoading ? <p className="muted">Loading alarms…</p> : null}
        {!alarmsLoading && activeAlarms.length === 0 ? (
          <p className="muted">No active alarms.</p>
        ) : null}
        <ul className="list-rows">
          {activeAlarms.slice(0, 8).map((alarm) => (
            <li key={alarm.alarm_id}>
              <button
                type="button"
                className="list-row"
                onClick={() =>
                  alarm.device_id
                    ? onOpenDevice(alarm.device_id)
                    : onOpenAlarms()
                }
              >
                <span className="list-row-body">
                  <span className="list-row-title">
                    {alarm.device_name || alarm.device_id || "Device"}
                  </span>
                  <span className="list-row-meta">
                    {[alarm.severity, alarm.rule_name, alarm.triggerKey]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Devices</h2>
          <button type="button" className="link-btn" onClick={onOpenDevices}>
            See all
          </button>
        </div>
        {loading ? <p className="muted">Loading devices…</p> : null}
        {!loading && devices.length === 0 ? (
          <p className="muted">No devices in your scope.</p>
        ) : null}
        <ul className="list-rows">
          {[...live, ...offline].slice(0, 8).map((device) => {
            const id = getDeviceId(device);
            const active = isDeviceActive(device.status);
            return (
              <li key={id}>
                <button
                  type="button"
                  className="list-row"
                  onClick={() => onOpenDevice(id)}
                >
                  <span
                    className={`status-dot ${active ? "online" : "offline"}`}
                    aria-hidden
                  />
                  <span className="list-row-body">
                    <span className="list-row-title">{getDeviceLabel(device)}</span>
                    <span className="list-row-meta">
                      {active ? "Live" : "Offline"}
                      {device.lastActivityTs
                        ? ` · ${formatTs(device.lastActivityTs)}`
                        : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
