import { useMemo } from "react";
import { formatTs, formatValue } from "../../utils/format";
import { WidgetLoading, WidgetMessage } from "../components/WidgetState";
import { WidgetShell } from "../components/WidgetShell";
import { useLatestTelemetry } from "../sdk/useLatestTelemetry";
import { useWidgetTime } from "../hooks/useWidgetTime";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../hooks/useMobileWidgetBindings";
import { collectTelemetryItemsFromWidget } from "../utils/collectTelemetryItems";
import { coerceBooleanState } from "../gauges/gaugeMath";

export function MetricsWidgetMobile(props: MobileWidgetBindings) {
  const { config, title, resolved } = useMobileWidgetBindings(props);
  const time = useWidgetTime(props.widget);

  const items = useMemo(() => {
    return collectTelemetryItemsFromWidget(
      props.widget,
      resolved.primaryDeviceId
    );
  }, [props.widget, resolved.primaryDeviceId]);

  const latest = useLatestTelemetry({
    items: items.map((item) => ({
      deviceId: item.deviceId,
      key: item.key,
      label: item.label,
      unit: item.unit,
      id: item.id,
    })),
    mode: time.mode === "realtime" ? "realtime" : "history",
    from: time.from,
    to: time.to,
    enabled: resolved.status === "ready" && items.length > 0,
  });

  if (resolved.status === "waiting_for_entity") {
    return (
      <WidgetMessage
        title={title}
        message={resolved.reason || "Select a device for this dashboard"}
      />
    );
  }

  if (!items.length) {
    return <WidgetMessage title={title} message="No telemetry keys configured" />;
  }

  if (latest.initialLoading && !latest.items.length) {
    return <WidgetLoading title={title} />;
  }

  const nullText = String(config.nullText || "—");
  const showTimestamp = config.showTimestamp !== false;
  const compact = config.compact === true;

  if (items.length === 1 && !compact) {
    const row = latest.items[0];
    const value = row?.value;
    const boolState =
      row?.key && typeof value !== "number"
        ? coerceBooleanState(value)
        : null;

    return (
      <WidgetShell title={title}>
        {boolState !== null ? (
          <p className={`metric-boolean-state ${boolState ? "is-on" : "is-off"}`}>
            {boolState ? "ON" : "OFF"}
          </p>
        ) : (
          <p className="dash-big-value">
            {value === null || value === undefined
              ? nullText
              : formatValue(value)}
            {row?.unit ? (
              <span className="dash-big-unit"> {row.unit}</span>
            ) : null}
          </p>
        )}
        {showTimestamp && row?.ts ? (
          <p className="card-meta">{formatTs(row.ts)}</p>
        ) : null}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={title}>
      <ul className={`dash-metric-list ${compact ? "dash-metric-list--compact" : ""}`}>
        {items.map((item) => {
          const row =
            latest.items.find(
              (r) => r.deviceId === item.deviceId && r.key === item.key
            ) || latest.items.find((r) => r.key === item.key);
          const value = row?.value;
          const boolState =
            item.kind === "boolean" || typeof value === "boolean"
              ? coerceBooleanState(value)
              : null;

          return (
            <li key={item.id} className="dash-metric-row">
              <span className="dash-metric-key">{item.label}</span>
              <span className="dash-metric-value">
                {boolState !== null ? (
                  <span className={`badge ${boolState ? "live" : ""}`}>
                    {boolState ? item.trueText || "ON" : item.falseText || "OFF"}
                  </span>
                ) : (
                  formatValue(
                    value === null || value === undefined ? nullText : value
                  )
                )}
                {row?.unit && boolState === null ? ` ${row.unit}` : ""}
                {time.mode === "realtime" ? (
                  <span className="badge live">live</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
