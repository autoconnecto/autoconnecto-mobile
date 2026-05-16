import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDeviceId, type DeviceRow } from "../api/devices";
import { loadDeviceListWithStatus } from "../components/DevicePicker";
import type { AlarmSeverityFilter } from "../utils/alarmFilters";
import { AlarmsScreen } from "./AlarmsScreen";
import { DeviceDetailScreen } from "./DeviceDetailScreen";
import { DevicesListScreen } from "./DevicesListScreen";
import { SummaryScreen } from "./SummaryScreen";

type Tab = "home" | "devices" | "alarms";

export function HomeScreen() {
  const { email, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");
  const [detailDeviceId, setDetailDeviceId] = useState<string | null>(null);
  const [alarmsSeverity, setAlarmsSeverity] =
    useState<AlarmSeverityFilter>("all");
  const [alarmsDeviceId, setAlarmsDeviceId] = useState<string | undefined>();

  useEffect(() => {
    loadDeviceListWithStatus()
      .then(({ devices: list, error }) => {
        setDevicesError(error || "");
        setDevices(list);
      })
      .finally(() => setDevicesLoading(false));
  }, []);

  const detailFallback = useMemo(
    () =>
      detailDeviceId
        ? devices.find((d) => getDeviceId(d) === detailDeviceId)
        : undefined,
    [devices, detailDeviceId]
  );

  function openDevice(deviceId: string) {
    setDetailDeviceId(deviceId);
  }

  function openAlarms(opts?: {
    severity?: AlarmSeverityFilter;
    deviceId?: string;
  }) {
    setAlarmsSeverity(opts?.severity ?? "all");
    setAlarmsDeviceId(opts?.deviceId);
    setTab("alarms");
    setDetailDeviceId(null);
  }

  if (detailDeviceId) {
    return (
      <div className="app-shell">
        <DeviceDetailScreen
          deviceId={detailDeviceId}
          fallback={detailFallback}
          onBack={() => setDetailDeviceId(null)}
          onViewAllAlarms={(id) => openAlarms({ deviceId: id })}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">Autoconnecto</h1>
          {email ? <p className="muted small">{email}</p> : null}
        </div>
        <button type="button" className="btn small secondary" onClick={logout}>
          Sign out
        </button>
      </header>

      <nav className="tab-bar">
        <button
          type="button"
          className={`tab ${tab === "home" ? "active" : ""}`}
          onClick={() => setTab("home")}
        >
          Home
        </button>
        <button
          type="button"
          className={`tab ${tab === "devices" ? "active" : ""}`}
          onClick={() => setTab("devices")}
        >
          Devices
        </button>
        <button
          type="button"
          className={`tab ${tab === "alarms" ? "active" : ""}`}
          onClick={() => setTab("alarms")}
        >
          Alarms
        </button>
      </nav>

      <main className="app-main">
        {devicesError ? (
          <p className="error center tab-screen">{devicesError}</p>
        ) : null}
        {tab === "home" ? (
          <SummaryScreen
            devices={devices}
            loading={devicesLoading}
            onOpenDevices={() => setTab("devices")}
            onOpenAlarms={(opts) =>
              openAlarms({
                severity:
                  opts?.severity === "critical" ||
                  opts?.severity === "major"
                    ? opts.severity
                    : "all",
              })
            }
            onOpenDevice={openDevice}
          />
        ) : null}
        {tab === "devices" ? (
          <DevicesListScreen
            devices={devices}
            loading={devicesLoading}
            onSelectDevice={openDevice}
          />
        ) : null}
        {tab === "alarms" ? (
          <AlarmsScreen
            initialSeverity={alarmsSeverity}
            deviceIdFilter={alarmsDeviceId}
          />
        ) : null}
      </main>
    </div>
  );
}
