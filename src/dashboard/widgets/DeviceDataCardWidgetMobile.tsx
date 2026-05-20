import { useMemo, useState } from "react";
import { saveDeviceAttributes } from "../../api/attributes";
import { formatValue } from "../../utils/format";
import { WidgetLoading, WidgetMessage } from "../components/WidgetState";
import { WidgetShell } from "../components/WidgetShell";
import { useDeviceAttributes } from "../hooks/useDeviceAttributes";
import { useLatestTelemetry } from "../sdk/useLatestTelemetry";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../hooks/useMobileWidgetBindings";
import { resolveControlDeviceId } from "../utils/resolveControlDeviceId";
import { coerceBooleanState } from "../gauges/gaugeMath";

type CardItem = {
  id: string;
  key: string;
  label: string;
  source: "telemetry" | "attribute";
  scope: "SHARED" | "CLIENT" | "SERVER";
  editable: boolean;
};

function normalizeItems(input: unknown): CardItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row: unknown, index: number) => {
      const item = (row && typeof row === "object" ? row : {}) as Record<
        string,
        unknown
      >;
      const key = String(item.key || "").trim();
      if (!key) return null;
      const scope = String(item.scope || "SHARED").toUpperCase();
      return {
        id: String(item.id ?? `card-${index}`),
        key,
        label: String(item.label || key).trim(),
        source: item.source === "attribute" ? "attribute" : "telemetry",
        scope:
          scope === "CLIENT" ? "CLIENT" : scope === "SERVER" ? "SERVER" : "SHARED",
        editable: item.editable === true,
      };
    })
    .filter((item): item is CardItem => item !== null);
}

export function DeviceDataCardWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "Device data");

  const items = useMemo(() => normalizeItems(config.items), [config.items]);
  const deviceId = useMemo(
    () =>
      resolveControlDeviceId(
        props.widget,
        props.aliases,
        props.dashboardContext,
        props.selectedDeviceId
      ),
    [props.widget, props.aliases, props.dashboardContext, props.selectedDeviceId]
  );

  const telemetryItems = useMemo(
    () =>
      items
        .filter((i) => i.source === "telemetry")
        .map((i) => ({
          id: i.id,
          deviceId: deviceId || "",
          key: i.key,
          label: i.label,
        })),
    [items, deviceId]
  );

  const latest = useLatestTelemetry({
    items: telemetryItems,
    mode: "realtime",
    enabled: !!deviceId && telemetryItems.length > 0,
  });

  const { getValue, loading, version } = useDeviceAttributes(deviceId);
  const [pending, setPending] = useState<string | null>(null);

  if (!deviceId) {
    return (
      <WidgetMessage title={widgetTitle} message="Select a device for this dashboard" />
    );
  }

  if (!items.length) {
    return <WidgetMessage title={widgetTitle} message="No fields configured" />;
  }

  if (loading && version === 0 && latest.initialLoading) {
    return <WidgetLoading title={widgetTitle} />;
  }

  return (
    <WidgetShell title={widgetTitle}>
      <ul className="device-data-card-list">
        {items.map((item) => {
          const telemetryRow = latest.items.find((r) => r.key === item.key);
          const attrValue =
            item.source === "attribute"
              ? getValue(item.key, [item.scope])
              : undefined;
          const value =
            item.source === "attribute" ? attrValue : telemetryRow?.value;
          const boolState = coerceBooleanState(value);

          return (
            <li key={item.id} className="device-data-card-row">
              <span className="dash-metric-key">{item.label}</span>
              <span className="dash-metric-value">
                {boolState !== null
                  ? boolState
                    ? "ON"
                    : "OFF"
                  : formatValue(value)}
              </span>
              {item.editable && item.source === "attribute" ? (
                <button
                  type="button"
                  className="attr-control-save"
                  disabled={pending === item.id}
                  onClick={async () => {
                    setPending(item.id);
                    try {
                      const next =
                        boolState === null
                          ? value
                          : !boolState;
                      await saveDeviceAttributes(deviceId, item.scope, {
                        [item.key]: next,
                      });
                    } finally {
                      setPending(null);
                    }
                  }}
                >
                  Toggle
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
