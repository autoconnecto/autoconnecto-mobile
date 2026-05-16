import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDeviceId, type DeviceRow } from "../api/devices";
import { loadDeviceListWithStatus } from "../components/DevicePicker";
import { AlarmsScreen } from "./AlarmsScreen";
import {
  readLastDeviceId,
  saveLastDeviceId,
  TelemetryScreen,
} from "./TelemetryScreen";

type Tab = "telemetry" | "alarms";

export function HomeScreen() {
  const { email, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("telemetry");
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");
  const [deviceId, setDeviceId] = useState(readLastDeviceId);

  useEffect(() => {
    loadDeviceListWithStatus()
      .then(({ devices: list, error }) => {
        setDevicesError(error || "");
        setDevices(list);
        const ids = list.map(getDeviceId).filter(Boolean);
        setDeviceId((current) => {
          if (current && ids.includes(current)) return current;
          const next = ids[0] || "";
          if (next) saveLastDeviceId(next);
          return next;
        });
      })
      .finally(() => setDevicesLoading(false));
  }, []);

  function handleDeviceChange(id: string) {
    setDeviceId(id);
    saveLastDeviceId(id);
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
          className={`tab ${tab === "telemetry" ? "active" : ""}`}
          onClick={() => setTab("telemetry")}
        >
          Telemetry
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
        {tab === "telemetry" ? (
          <TelemetryScreen
            deviceId={deviceId}
            devices={devices}
            onDeviceChange={handleDeviceChange}
            devicesLoading={devicesLoading}
          />
        ) : (
          <AlarmsScreen />
        )}
      </main>
    </div>
  );
}
