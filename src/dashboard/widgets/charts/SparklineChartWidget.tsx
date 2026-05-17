import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, Tooltip } from "recharts";
import { useLiveTelemetry } from "../../../realtime/useLiveTelemetry";
import { MobileChartArea } from "../../components/MobileChartArea";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import {
  formatTooltipTime,
  getLastRealPoint,
  normalizePoints,
  type ChartPoint,
} from "../../charts/chartUtils";
import {
  buildTelemetryHistoricalResyncKey,
  useWidgetTime,
} from "../../hooks/useWidgetTime";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";
import { useTelemetry } from "../../sdk/useTelemetry";

export function SparklineChartWidget(props: MobileWidgetBindings) {
  const { config, title, resolved } = useMobileWidgetBindings(props);
  const time = useWidgetTime(props.widget);

  const device = resolved.primaryDeviceId;
  const metric = resolved.metric;
  const from = time.from;
  const to = time.to;
  const isRealtimeMode = time.mode === "realtime";
  const lineColor = String(config.color || "#2563eb");

  const historicalResyncKey = useMemo(
    () => buildTelemetryHistoricalResyncKey(time, "chart"),
    [time.mode, time.windowMs, time.source, time.from, time.to, time.refreshSec]
  );

  const baseData = useTelemetry({
    device: resolved.status === "ready" ? device || undefined : undefined,
    metric: resolved.status === "ready" ? metric || undefined : undefined,
    from,
    to,
    maxDataPoints: 120,
    stableSlidingTimeRange: isRealtimeMode,
    historicalResyncKey,
  });

  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    if (resolved.status !== "ready") {
      setData([]);
      return;
    }
    setData(
      normalizePoints(Array.isArray(baseData) ? baseData : []).filter(
        (p) => p.ts >= from && p.ts <= to
      )
    );
  }, [resolved.status, baseData, from, to]);

  const { pointsByTopic } = useLiveTelemetry({
    deviceIds:
      resolved.status === "ready" && isRealtimeMode && device
        ? [device]
        : [],
    keys:
      resolved.status === "ready" && isRealtimeMode && metric ? [metric] : [],
    enabled: resolved.status === "ready" && isRealtimeMode,
  });

  useEffect(() => {
    if (!isRealtimeMode || !device || !metric) return;
    const livePoint = pointsByTopic[`${device}__${metric}`];
    if (!livePoint) return;

    const ts = Number(livePoint.ts ?? Date.now());
    const value = Number(livePoint.value);
    if (!Number.isFinite(ts) || !Number.isFinite(value)) return;

    setData((prev) => {
      const last = getLastRealPoint(prev);
      if (last && last.ts === ts && last.value === value) return prev;
      return [...prev, { ts, value }].slice(-120);
    });
  }, [isRealtimeMode, device, metric, pointsByTopic]);

  if (resolved.status === "waiting_for_entity") {
    return <WidgetMessage title={title} message={resolved.reason || "Select a device"} />;
  }
  if (resolved.status === "not_configured") {
    return <WidgetMessage title={title} message="Not configured" />;
  }
  if (!data.length) {
    return <WidgetLoading title={title} />;
  }

  return (
    <WidgetShell title={title} hint={isRealtimeMode ? "live" : undefined}>
      <MobileChartArea height={100}>
        <LineChart data={data}>
          <Tooltip labelFormatter={(v) => formatTooltipTime(Number(v))} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </MobileChartArea>
    </WidgetShell>
  );
}
