import { useCallback, useEffect, useState } from "react";
import { fetchAlarms } from "../api/alarms";
import {
  getDeviceId,
  getDeviceLabel,
  type DeviceRow,
} from "../api/devices";
import { countActiveAlarms } from "../utils/alarmFilters";
import { formatTs, isDeviceActive } from "../utils/format";

type Props = {
  devices: DeviceRow[];
  loading: boolean;
  onOpenDevices: () => void;
  onOpenAlarms: (opts?: { severity?: "critical" | "major" }) => void;
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
  const [alarmCounts, setAlarmCounts] = useState({
    active: 0,
    critical: 0,
    major: 0,
  });

  const loadAlarms = useCallback(async () => {
    setAlarmsLoading(true);
    try {
      const rows = await fetchAlarms();
      setAlarmCounts(countActiveAlarms(rows));
    } catch {
      setAlarmCounts({ active: 0, critical: 0, major: 0 });
    } finally {
      setAlarmsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  const activeDevices = devices.filter((d) => isDeviceActive(d.status)).length;
  const inactiveDevices = devices.length - activeDevices;

  const recentDevices = [...devices]
    .sort(
      (a, b) =>
        Number(b.lastActivityTs || 0) - Number(a.lastActivityTs || 0)
    )
    .slice(0, 5);

  return (
    <div className="screen tab-screen">
      <div className="stat-grid">
        <button
          type="button"
          className="stat-card"
          onClick={onOpenDevices}
          disabled={loading}
        >
          <span className="stat-value">{loading ? "—" : devices.length}</span>
          <span className="stat-label">Devices</span>
          {!loading ? (
            <span className="stat-sub">
              {activeDevices} active · {inactiveDevices} inactive
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="stat-card alarm-stat"
          onClick={() => onOpenAlarms()}
          disabled={alarmsLoading}
        >
          <span className="stat-value">
            {alarmsLoading ? "—" : alarmCounts.active}
          </span>
          <span className="stat-label">Active alarms</span>
          {!alarmsLoading ? (
            <span className="stat-sub">
              {alarmCounts.critical} critical · {alarmCounts.major} major
            </span>
          ) : null}
        </button>
      </div>

      {!alarmsLoading && alarmCounts.critical > 0 ? (
        <button
          type="button"
          className="banner critical"
          onClick={() => onOpenAlarms({ severity: "critical" })}
        >
          {alarmCounts.critical} critical alarm
          {alarmCounts.critical === 1 ? "" : "s"} — view
        </button>
      ) : null}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Recent devices</h2>
          <button
            type="button"
            className="link-btn"
            onClick={onOpenDevices}
          >
            See all
          </button>
        </div>
        {loading ? <p className="muted">Loading devices…</p> : null}
        {!loading && recentDevices.length === 0 ? (
          <p className="muted">No devices in your scope.</p>
        ) : null}
        <ul className="list-rows">
          {recentDevices.map((device) => {
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
                    <span className="list-row-title">
                      {getDeviceLabel(device)}
                    </span>
                    <span className="list-row-meta">
                      {device.status || "unknown"}
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
