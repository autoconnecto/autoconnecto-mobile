import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { getDeviceId, type DeviceRow } from "../api/devices";
import { loadDeviceListWithStatus } from "../components/DevicePicker";
import { deviceIdFromUrl } from "../navigation/deviceLink";
import {
  getShowSolutionSamples,
  setShowSolutionSamples,
  subscribeShowSolutionSamples,
} from "../preferences/showSolutionSamples";
import type { AlarmSeverityFilter } from "../utils/alarmFilters";
import { AlarmsScreen } from "./AlarmsScreen";
import { DeviceDetailScreen } from "./DeviceDetailScreen";
import { DevicesListScreen } from "./DevicesListScreen";
import { DashboardListScreen } from "./DashboardListScreen";
import { DashboardViewScreen } from "./DashboardViewScreen";
import { SummaryScreen } from "./SummaryScreen";

type Tab = "home" | "devices" | "dashboards" | "alarms";

export function HomeScreen() {
  const { email, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState("");
  const [showDemos, setShowDemos] = useState(() => getShowSolutionSamples());
  const [detailDeviceId, setDetailDeviceId] = useState<string | null>(null);
  const [detailDashboardId, setDetailDashboardId] = useState<string | null>(
    null
  );
  const [alarmsSeverity, setAlarmsSeverity] =
    useState<AlarmSeverityFilter>("all");
  const [alarmsDeviceId, setAlarmsDeviceId] = useState<string | undefined>();

  const reloadDevices = useCallback(() => {
    setDevicesLoading(true);
    loadDeviceListWithStatus()
      .then(({ devices: list, error }) => {
        setDevicesError(error || "");
        setDevices(list);
      })
      .finally(() => setDevicesLoading(false));
  }, []);

  useEffect(() => {
    reloadDevices();
  }, [reloadDevices, showDemos]);

  useEffect(() => subscribeShowSolutionSamples(setShowDemos), []);

  const detailFallback = useMemo(
    () =>
      detailDeviceId
        ? devices.find((d) => getDeviceId(d) === detailDeviceId)
        : undefined,
    [devices, detailDeviceId]
  );

  function openDevice(deviceId: string) {
    if (!deviceId) return;
    setDetailDashboardId(null);
    setDetailDeviceId(deviceId);
    setTab("home");
  }

  useEffect(() => {
    const openFromUrl = (url?: string | null) => {
      if (!url) return;
      const id = deviceIdFromUrl(url);
      if (id) openDevice(id);
    };

    openFromUrl(window.location.href);

    let removeListener: (() => void) | undefined;
    import("@capacitor/app")
      .then(({ App }) => {
        App.getLaunchUrl()
          .then((launch) => openFromUrl(launch?.url))
          .catch(() => undefined);
        const handle = App.addListener("appUrlOpen", (event) => {
          openFromUrl(event.url);
        });
        removeListener = () => {
          void handle.then((listener) => listener.remove());
        };
      })
      .catch(() => undefined);

    return () => removeListener?.();
  }, []);

  function openAlarms(opts?: {
    severity?: AlarmSeverityFilter;
    deviceId?: string;
  }) {
    setAlarmsSeverity(opts?.severity ?? "all");
    setAlarmsDeviceId(opts?.deviceId);
    setTab("alarms");
    setDetailDeviceId(null);
    setDetailDashboardId(null);
  }

  if (detailDashboardId) {
    return (
      <div className="app-shell">
        <DashboardViewScreen
          dashboardId={detailDashboardId}
          devices={devices}
          onBack={() => setDetailDashboardId(null)}
        />
      </div>
    );
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
        <div className="header-actions">
          <button
            type="button"
            className="btn small secondary"
            onClick={() => setShowSolutionSamples(!showDemos)}
            title="Show undeletable Solution demo inventory"
          >
            {showDemos ? "Hide demos" : "Show demos"}
          </button>
          <button type="button" className="btn small secondary" onClick={logout}>
            Sign out
          </button>
        </div>
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
          className={`tab tab-compact ${tab === "dashboards" ? "active" : ""}`}
          onClick={() => setTab("dashboards")}
        >
          Boards
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
            onOpenAlarms={() => openAlarms()}
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
        {tab === "dashboards" ? (
          <DashboardListScreen
            onOpenDashboard={(id) => {
              setDetailDashboardId(id);
              setDetailDeviceId(null);
            }}
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
