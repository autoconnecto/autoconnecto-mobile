import { useEffect, useMemo, useState, type ComponentType } from "react";
import { fetchAlarms, type AlarmRow } from "../api/alarms";
import { type DeviceRow } from "../api/devices";
import { formatValue, isDeviceActive } from "../utils/format";
import { WidgetShell } from "./components/WidgetShell";
import { useDeviceTelemetry } from "./useDeviceTelemetry";
import { resolveWidgetConfig } from "./widgetResolver";
import { BarChartWidgetMobile } from "./widgets/charts/BarChartWidget";
import { DoughnutChartWidgetMobile } from "./widgets/charts/DoughnutChartWidget";
import { MultiTimeseriesChartWidget } from "./widgets/charts/MultiTimeseriesChartWidget";
import { PieChartWidgetMobile } from "./widgets/charts/PieChartWidget";
import { SparklineChartWidget } from "./widgets/charts/SparklineChartWidget";
import { TimeseriesChartWidget } from "./widgets/charts/TimeseriesChartWidget";
import { GaugeWidgetMobile } from "./widgets/GaugeWidgetMobile";
import {
  ControlWidgetMobile,
  isControlWidgetType,
} from "./widgets/ControlWidgetMobile";
import type { MobileWidgetBindings } from "./hooks/useMobileWidgetBindings";

const CHART_WIDGET_TYPES = new Set([
  "timeseries",
  "multitimeseries",
  "barChart",
  "pieChart",
  "doughnut",
  "sparkline",
]);

const CHART_WIDGET_COMPONENTS: Record<string, ComponentType<MobileWidgetBindings>> = {
  timeseries: TimeseriesChartWidget,
  multitimeseries: MultiTimeseriesChartWidget,
  barChart: BarChartWidgetMobile,
  pieChart: PieChartWidgetMobile,
  doughnut: DoughnutChartWidgetMobile,
  sparkline: SparklineChartWidget,
};

const ALARM_TYPES = new Set(["alarm", "deviceAlarm", "alarmSummary"]);
const GAUGE_TYPES = new Set([
  "gauge",
  "multigauge",
  "digitalRoundGauge",
  "digitalVerticalBar",
  "neonRoundGauge",
  "neonVerticalBar",
  "analogMeter",
  "batteryIndicator",
  "tankLevel",
  "progressBar",
  "signalStrength",
]);
const VALUE_TYPES = new Set([
  "value",
  "led",
  "miniLed",
  "kpiStatCard",
  "trendDirection",
  "deltaComparison",
]);

const WEB_PLACEHOLDER_TYPES = new Set([
  "rangeChart",
  "dualAxisChart",
  "scatterTelemetry",
  "radarTelemetry",
  "ecgStrip",
  "map",
  "routeMap",
  "deviceTable",
  "navigationButton",
]);

type Props = MobileWidgetBindings & {
  devices: DeviceRow[];
};

function severityClass(severity?: string) {
  const s = (severity || "").toLowerCase();
  if (s === "critical") return "severity-critical";
  if (s === "major") return "severity-major";
  if (s === "minor") return "severity-minor";
  return "severity-default";
}

function MobileAlarmList({
  alarms,
  limit = 5,
}: {
  alarms: AlarmRow[];
  limit?: number;
}) {
  const active = alarms
    .filter((a) => String(a.status || "").toUpperCase() !== "CLEARED")
    .slice(0, limit);

  if (active.length === 0) {
    return <p className="muted small">No active alarms</p>;
  }

  return (
    <ul className="dash-alarm-list">
      {active.map((alarm) => (
        <li key={alarm.alarm_id}>
          <span className={`badge ${severityClass(alarm.severity)}`}>
            {alarm.severity || "?"}
          </span>
          <span className="dash-alarm-text">
            {alarm.rule_name || alarm.triggerKey || "Alarm"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MobileWidget({
  widget,
  aliases,
  dashboardContext,
  selectedDeviceId,
  devices,
}: Props) {
  const type = String(widget.type || "unknown");
  const bindings: MobileWidgetBindings = {
    widget,
    aliases,
    dashboardContext,
    selectedDeviceId,
  };

  const ChartComponent = CHART_WIDGET_COMPONENTS[type];
  if (ChartComponent && CHART_WIDGET_TYPES.has(type)) {
    return <ChartComponent {...bindings} />;
  }

  if (isControlWidgetType(type)) {
    return <ControlWidgetMobile {...bindings} />;
  }

  if (GAUGE_TYPES.has(type) || VALUE_TYPES.has(type)) {
    return <GaugeWidgetMobile {...bindings} />;
  }

  const title = String(widget.name || widget.title || type);
  const config = (widget.config || {}) as Record<string, unknown>;
  const state = {
    selectedDeviceId,
    selectedEntity: { id: selectedDeviceId },
  };

  if (type === "deviceCount") {
    const statusFilter = String(config.statusFilter || "all").toLowerCase();
    const deviceType = String(config.deviceType || "").trim().toLowerCase();
    let rows = devices;
    if (statusFilter === "active") {
      rows = rows.filter((d) => isDeviceActive(d.status));
    } else if (statusFilter === "inactive") {
      rows = rows.filter((d) => !isDeviceActive(d.status));
    }
    if (deviceType) {
      rows = rows.filter(
        (d) =>
          String(d.deviceType || d.device_type || d.type || "")
            .toLowerCase() === deviceType
      );
    }
    return (
      <WidgetShell title={title}>
        <p className="dash-big-value">{rows.length}</p>
        <p className="card-meta">devices</p>
      </WidgetShell>
    );
  }

  if (ALARM_TYPES.has(type)) {
    return (
      <MobileAlarmWidget
        title={title}
        widget={widget}
        aliases={aliases}
        dashboardContext={dashboardContext}
        state={state}
      />
    );
  }

  const resolved = resolveWidgetConfig(
    widget,
    aliases,
    dashboardContext,
    state
  );

  if (resolved.status === "waiting_for_entity") {
    return (
      <WidgetShell title={title}>
        <p className="muted small">{resolved.reason}</p>
      </WidgetShell>
    );
  }

  if (resolved.status === "not_configured") {
    if (WEB_PLACEHOLDER_TYPES.has(type)) {
      return (
        <WidgetShell title={title}>
          <p className="muted small">This widget is best viewed on the web app.</p>
        </WidgetShell>
      );
    }
    return null;
  }

  return (
    <MobileTelemetryWidget title={title} resolved={resolved} />
  );
}

function MobileAlarmWidget({
  title,
  widget,
  aliases,
  dashboardContext,
  state,
}: {
  title: string;
  widget: Record<string, unknown>;
  aliases: Record<string, unknown>[];
  dashboardContext: Record<string, unknown>;
  state: Record<string, unknown>;
}) {
  const [alarms, setAlarms] = useState<AlarmRow[]>([]);
  const resolved = resolveWidgetConfig(widget, aliases, dashboardContext, state);
  const deviceIds = resolved.deviceIds;

  useEffect(() => {
    fetchAlarms()
      .then((rows) => {
        if (deviceIds.length === 0) {
          setAlarms(rows);
          return;
        }
        setAlarms(
          rows.filter((a) => deviceIds.includes(String(a.device_id || "")))
        );
      })
      .catch(() => setAlarms([]));
  }, [deviceIds.join("|")]);

  const activeCount = alarms.filter(
    (a) => String(a.status || "").toUpperCase() !== "CLEARED"
  ).length;

  return (
    <WidgetShell title={title} hint={activeCount ? `${activeCount} active` : undefined}>
      <MobileAlarmList
        alarms={alarms}
        limit={String(widget.type) === "alarmSummary" ? 8 : 5}
      />
    </WidgetShell>
  );
}

function MobileTelemetryWidget({
  title,
  resolved,
}: {
  title: string;
  resolved: ReturnType<typeof resolveWidgetConfig>;
}) {
  const deviceId = resolved.primaryDeviceId;
  const keys = resolved.metrics.length
    ? resolved.metrics
    : resolved.metric
      ? [resolved.metric]
      : [];
  const telemetry = useDeviceTelemetry(deviceId, keys);

  const rows = useMemo(() => {
    return keys.map((key) => {
      const point = telemetry[key];
      return {
        key,
        value: point?.value,
        ts: point?.ts,
        live: point?.live,
      };
    });
  }, [keys, telemetry]);

  if (rows.length <= 1) {
    return (
      <WidgetShell title={title}>
        <p className="muted small">Widget type not fully supported on mobile</p>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={title}>
      <ul className="dash-metric-list">
        {rows.map((row) => (
          <li key={row.key}>
            <span className="dash-metric-key">{row.key}</span>
            <span className="dash-metric-value">
              {formatValue(row.value)}
              {row.live ? <span className="badge live">live</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
