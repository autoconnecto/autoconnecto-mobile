import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLiveTelemetry } from "../../../realtime/useLiveTelemetry";
import { MobileChartArea } from "../../components/MobileChartArea";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import {
  formatAxisTime,
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

export function TimeseriesChartWidget(props: MobileWidgetBindings) {
  const { config, title, resolved } = useMobileWidgetBindings(props);
  const time = useWidgetTime(props.widget);

  const device = resolved.primaryDeviceId;
  const metric = resolved.metric;
  const from = time.from;
  const to = time.to;
  const isRealtimeMode = time.mode === "realtime";

  const lineColor = String(config.color || "#2563eb");
  const lineWidth = Math.max(
    1,
    Math.min(Number(config.lineWidth ?? 2) || 2, 6)
  );

  const historicalResyncKey = useMemo(
    () => buildTelemetryHistoricalResyncKey(time, "chart"),
    [time.mode, time.windowMs, time.source, time.from, time.to, time.refreshSec]
  );

  const baseData = useTelemetry({
    device: resolved.status === "ready" ? device || undefined : undefined,
    metric: resolved.status === "ready" ? metric || undefined : undefined,
    from,
    to,
    maxDataPoints: 600,
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

  const liveQuery = useMemo(() => {
    if (resolved.status !== "ready" || !isRealtimeMode) return null;
    if (!device || !metric) return null;
    return { deviceIds: [device], keys: [metric] };
  }, [resolved.status, isRealtimeMode, device, metric]);

  const { pointsByTopic } = useLiveTelemetry({
    deviceIds: liveQuery?.deviceIds || [],
    keys: liveQuery?.keys || [],
    enabled: !!liveQuery,
  });

  useEffect(() => {
    if (resolved.status !== "ready" || !isRealtimeMode || !device || !metric) {
      return;
    }

    const livePoint = pointsByTopic?.[`${device}__${metric}`];
    if (!livePoint) return;

    const ts = Number(livePoint.ts ?? Date.now());
    const value = Number(livePoint.value);
    if (!Number.isFinite(ts) || !Number.isFinite(value)) return;

    setData((prev) => {
      const last = getLastRealPoint(prev);
      if (last && last.ts === ts && last.value === value) return prev;
      const next = [...prev, { ts, value }].filter(
        (p) => p.ts >= from && p.ts <= to
      );
      return next.length > 600 ? next.slice(-600) : next;
    });
  }, [resolved.status, isRealtimeMode, device, metric, pointsByTopic, from, to]);

  if (resolved.status === "waiting_for_entity") {
    return <WidgetMessage title={title} message={resolved.reason || "Select a device"} />;
  }
  if (resolved.status === "not_configured") {
    return <WidgetMessage title={title} message="Not configured" />;
  }
  if (!data.length && !baseData.length) {
    return <WidgetLoading title={title} />;
  }
  if (!data.length) {
    return <WidgetMessage title={title} message="No data in selected time range" />;
  }

  return (
    <WidgetShell title={title} hint={isRealtimeMode ? "live" : undefined}>
      <MobileChartArea>
        <LineChart data={data}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            type="number"
            domain={[from, to]}
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickFormatter={(v) => formatAxisTime(Number(v), from, to)}
          />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={42} />
          <Tooltip
            labelFormatter={(v) => formatTooltipTime(Number(v))}
            formatter={(v: number) => [Number(v).toFixed(2), metric]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={lineWidth}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </MobileChartArea>
    </WidgetShell>
  );
}
