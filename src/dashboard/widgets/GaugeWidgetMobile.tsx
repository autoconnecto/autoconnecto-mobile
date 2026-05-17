import { useMemo } from "react";
import { formatTs } from "../../utils/format";
import { WidgetLoading, WidgetMessage } from "../components/WidgetState";
import { WidgetShell } from "../components/WidgetShell";
import {
  coerceBooleanState,
  parseNumber,
} from "../gauges/gaugeMath";
import {
  HorizontalBarGauge,
  KpiDisplay,
  LedIndicator,
  MultiGaugeGrid,
  parseGaugeScale,
  SemicircleGauge,
  VerticalBarGauge,
} from "../gauges/GaugeVisuals";
import { useWidgetTime } from "../hooks/useWidgetTime";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../hooks/useMobileWidgetBindings";
import { useLatestTelemetry } from "../sdk/useLatestTelemetry";
import { normalizeChartItems } from "../utils/chartItems";

const SEMICIRCLE_TYPES = new Set([
  "gauge",
  "digitalRoundGauge",
  "neonRoundGauge",
  "analogMeter",
]);

const VERTICAL_TYPES = new Set([
  "digitalVerticalBar",
  "neonVerticalBar",
  "tankLevel",
]);

const HORIZONTAL_TYPES = new Set([
  "progressBar",
  "batteryIndicator",
  "signalStrength",
]);

const LED_TYPES = new Set(["led", "miniLed"]);

function numericValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function GaugeWidgetMobile(props: MobileWidgetBindings) {
  const { config, title, resolved } = useMobileWidgetBindings(props);
  const time = useWidgetTime(props.widget);
  const type = String(props.widget.type || "");

  const scale = parseGaugeScale(config);

  const telemetryItems = useMemo(() => {
    if (type === "multigauge" || LED_TYPES.has(type)) {
      const raw = normalizeChartItems(
        config.items ?? config.gauges ?? config.metrics,
        resolved.primaryDeviceId
      );
      if (raw.length) {
        return raw.map((item) => ({
          deviceId: item.deviceId,
          key: item.key,
          label: item.label,
          unit: item.unit,
          id: item.id,
        }));
      }
    }

    const deviceId = resolved.primaryDeviceId;
    const keys = resolved.metrics.length
      ? resolved.metrics
      : resolved.metric
        ? [resolved.metric]
        : [];

    return keys
      .filter(Boolean)
      .map((key, index) => ({
        deviceId: deviceId || "",
        key,
        label: key,
        id: `metric-${index}`,
        unit: scale.unit,
      }));
  }, [
    type,
    config,
    resolved.primaryDeviceId,
    resolved.metrics,
    resolved.metric,
    scale.unit,
  ]);

  const latest = useLatestTelemetry({
    items: telemetryItems,
    mode: time.mode === "realtime" ? "realtime" : "history",
    from: time.from,
    to: time.to,
    enabled: resolved.status === "ready" && telemetryItems.length > 0,
  });

  const primary = latest.items[0];
  const primaryValue = numericValue(primary?.value);
  const live = time.mode === "realtime" && !!primary;

  if (resolved.status === "waiting_for_entity") {
    return (
      <WidgetMessage title={title} message={resolved.reason || "Select a device"} />
    );
  }

  if (resolved.status === "not_configured" || !telemetryItems.length) {
    return <WidgetMessage title={title} message="Not configured" />;
  }

  if (latest.initialLoading && !latest.items.length) {
    return <WidgetLoading title={title} />;
  }

  if (type === "multigauge") {
    const rows = latest.items.map((item, index) => {
      const itemConfig = (Array.isArray(config.items) ? config.items[index] : {}) as Record<
        string,
        unknown
      >;
      const itemScale = parseGaugeScale({ ...config, ...itemConfig });
      return {
        id: String(item.id || `${item.deviceId}-${item.key}`),
        label: String(item.label || item.key),
        value: numericValue(item.value),
        min: itemScale.minValue,
        max: itemScale.maxValue,
        warning: itemScale.warningValue,
        critical: itemScale.criticalValue,
        unit: itemScale.unit,
      };
    });

    return (
      <WidgetShell title={title} hint={live ? "live" : undefined}>
        <MultiGaugeGrid rows={rows} />
      </WidgetShell>
    );
  }

  if (LED_TYPES.has(type)) {
    const compact = type === "miniLed";
    return (
      <WidgetShell title={title} hint={live ? "live" : undefined}>
        <div className={compact ? "gauge-led-row gauge-led-row--compact" : "gauge-led-row"}>
          {latest.items.map((item) => (
            <LedIndicator
              key={String(item.id || item.key)}
              state={coerceBooleanState(item.value)}
              label={String(item.label || item.key)}
              colorOn={String(
                (item as { color?: string }).color || config.color || "#22c55e"
              )}
            />
          ))}
        </div>
      </WidgetShell>
    );
  }

  if (type === "trendDirection" || type === "deltaComparison") {
    const trend =
      type === "trendDirection"
        ? String(config.direction || config.trend || "").toLowerCase()
        : "";
    const delta = type === "deltaComparison" ? parseNumber(config.delta, NaN) : NaN;
    const arrow =
      trend === "up" ? "↑" : trend === "down" ? "↓" : primaryValue !== null && primaryValue >= 0 ? "↑" : "↓";

    return (
      <WidgetShell title={title} hint={live ? "live" : undefined}>
        <KpiDisplay
          value={primaryValue}
          unit={scale.unit}
          decimals={scale.decimals}
          subtitle={
            type === "deltaComparison" && Number.isFinite(delta)
              ? `Δ ${delta.toFixed(scale.decimals)}`
              : `${arrow} ${primary?.key || ""}`
          }
        />
        {primary?.ts ? <p className="card-meta">{formatTs(primary.ts)}</p> : null}
      </WidgetShell>
    );
  }

  if (SEMICIRCLE_TYPES.has(type)) {
    return (
      <WidgetShell title={title} hint={live ? "live" : undefined}>
        <SemicircleGauge
          value={primaryValue}
          minValue={scale.minValue}
          maxValue={scale.maxValue}
          warningValue={scale.warningValue}
          criticalValue={scale.criticalValue}
          unit={scale.unit}
          decimals={scale.decimals}
          neon={type === "neonRoundGauge"}
        />
        {primary?.key ? <p className="card-meta">{primary.key}</p> : null}
      </WidgetShell>
    );
  }

  if (VERTICAL_TYPES.has(type)) {
    return (
      <WidgetShell title={title} hint={live ? "live" : undefined}>
        <VerticalBarGauge
          value={primaryValue}
          minValue={scale.minValue}
          maxValue={scale.maxValue}
          warningValue={scale.warningValue}
          criticalValue={scale.criticalValue}
          unit={scale.unit}
          decimals={scale.decimals}
          neon={type === "neonVerticalBar"}
        />
        {primary?.key ? <p className="card-meta">{primary.key}</p> : null}
      </WidgetShell>
    );
  }

  if (HORIZONTAL_TYPES.has(type)) {
    const label =
      type === "batteryIndicator"
        ? "Battery"
        : type === "signalStrength"
          ? "Signal"
          : undefined;

    return (
      <WidgetShell title={title} hint={live ? "live" : undefined}>
        <HorizontalBarGauge
          value={primaryValue}
          minValue={scale.minValue}
          maxValue={scale.maxValue}
          warningValue={scale.warningValue}
          criticalValue={scale.criticalValue}
          unit={scale.unit || (type === "signalStrength" ? "%" : "")}
          decimals={scale.decimals}
          label={label}
        />
        {primary?.key ? <p className="card-meta">{primary.key}</p> : null}
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={title} hint={live ? "live" : undefined}>
      <KpiDisplay
        value={primaryValue}
        unit={scale.unit}
        decimals={scale.decimals}
        subtitle={primary?.key}
      />
      {primary?.ts ? <p className="card-meta">{formatTs(primary.ts)}</p> : null}
    </WidgetShell>
  );
}
