import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchDashboard,
  type DashboardDetail,
} from "../api/dashboards";
import { getDeviceId, type DeviceRow } from "../api/devices";
import { DevicePicker } from "../components/DevicePicker";
import { MobileDashboardClockProvider } from "../dashboard/context/MobileDashboardClock";
import { getWidgetsForState } from "../dashboard/dashboardLayout";
import { MobileWidget } from "../dashboard/MobileWidget";
import { dashboardNeedsDevicePicker } from "../dashboard/widgetResolver";
import { readLastDeviceId, saveLastDeviceId } from "../dashboard/lastDevice";

type Props = {
  dashboardId: string;
  devices: DeviceRow[];
  onBack: () => void;
};

export function DashboardViewScreen({
  dashboardId,
  devices,
  onBack,
}: Props) {
  const [dashboard, setDashboard] = useState<DashboardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState(readLastDeviceId);
  const [currentStateId, setCurrentStateId] = useState("default");

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const data = await fetchDashboard(dashboardId);
      setDashboard(data);
      const states = data.states || [{ id: "default", name: "Default" }];
      if (!states.some((s) => s.id === currentStateId)) {
        setCurrentStateId(states[0]?.id || "default");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, [dashboardId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const ids = devices.map(getDeviceId).filter(Boolean);
    setSelectedDeviceId((current) => {
      if (current && ids.includes(current)) return current;
      const next = ids[0] || "";
      if (next) saveLastDeviceId(next);
      return next;
    });
  }, [devices]);

  const aliases = dashboard?.aliases || [];
  const widgets = dashboard?.widgets || [];
  const needsDevice = useMemo(
    () => dashboardNeedsDevicePicker(widgets, aliases),
    [widgets, aliases]
  );

  const deviceContext = useMemo(
    () =>
      devices.map((d) => ({
        deviceId: getDeviceId(d),
        deviceType: d.deviceType || d.device_type || d.type,
        type: d.type,
        status: d.status,
        name: d.name || d.device_name,
      })),
    [devices]
  );

  const dashboardContext = useMemo(
    () => ({
      devices: deviceContext,
      selectedDeviceId,
    }),
    [deviceContext, selectedDeviceId]
  );

  const widgetRows = useMemo(
    () => (dashboard ? getWidgetsForState(dashboard, currentStateId) : []),
    [dashboard, currentStateId]
  );

  const states = dashboard?.states || [{ id: "default", name: "Default" }];
  const showStatePicker = states.length > 1;

  function handleDeviceChange(id: string) {
    setSelectedDeviceId(id);
    saveLastDeviceId(id);
  }

  return (
    <div className="detail-screen">
      <header className="detail-header">
        <button type="button" className="btn small secondary" onClick={onBack}>
          Back
        </button>
        <div className="detail-title-wrap">
          <h2 className="detail-title">{dashboard?.name || "Dashboard"}</h2>
          <p className="detail-meta muted small">View only</p>
        </div>
      </header>

      {loading ? <p className="muted center tab-screen">Loading…</p> : null}
      {error ? <p className="error center tab-screen">{error}</p> : null}

      {!loading && dashboard ? (
        <MobileDashboardClockProvider dashboard={dashboard}>
        <div className="tab-screen dash-view">
          {needsDevice ? (
            <DevicePicker
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              devices={devices}
            />
          ) : null}

          {showStatePicker ? (
            <div className="chip-row">
              {states.map((state) => (
                <button
                  key={state.id}
                  type="button"
                  className={`chip ${currentStateId === state.id ? "active" : ""}`}
                  onClick={() => setCurrentStateId(state.id)}
                >
                  {state.name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="dash-widget-stack">
            {widgetRows.length === 0 ? (
              <p className="muted center">No widgets in this state.</p>
            ) : (
              widgetRows.map(({ widget }) => {
                const id = String(widget.widgetId || widget.id || Math.random());
                return (
                  <MobileWidget
                    key={id}
                    widget={widget}
                    aliases={aliases}
                    dashboardContext={dashboardContext}
                    selectedDeviceId={selectedDeviceId}
                    devices={devices}
                  />
                );
              })
            )}
          </div>
        </div>
        </MobileDashboardClockProvider>
      ) : null}
    </div>
  );
}
