import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MobileChartArea } from "../../components/MobileChartArea";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import { formatChartValue } from "../../charts/chartUtils";
import { useWidgetTime } from "../../hooks/useWidgetTime";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";
import { useLatestTelemetry } from "../../sdk/useLatestTelemetry";
import { normalizeChartItems } from "../../utils/chartItems";

export function BarChartWidgetMobile(props: MobileWidgetBindings) {
  const { config, title, resolved } = useMobileWidgetBindings(props);
  const time = useWidgetTime(props.widget);

  const rawItems = useMemo(
    () => normalizeChartItems(config.items, resolved.primaryDeviceId),
    [config.items, resolved.primaryDeviceId]
  );

  const latest = useLatestTelemetry({
    items: rawItems,
    mode: time.mode === "realtime" ? "realtime" : "history",
    from: time.from,
    to: time.to,
    enabled: resolved.status === "ready" && rawItems.length > 0,
  });

  const chartData = useMemo(() => {
    return (latest.items || [])
      .map((item) => {
        const numericValue = Number(item.value);
        return {
          id: item.id,
          name: item.label || item.key,
          value: Number.isFinite(numericValue) ? numericValue : null,
          color: item.color,
          unit: item.unit,
        };
      })
      .filter((row) => row.value !== null);
  }, [latest.items]);

  const decimals = Math.max(0, Math.min(Number(config.decimals ?? 2) || 2, 6));

  if (resolved.status === "waiting_for_entity") {
    return <WidgetMessage title={title} message={resolved.reason || "Select a device"} />;
  }
  if (!rawItems.length) {
    return <WidgetMessage title={title} message="Not configured" />;
  }
  if (latest.error) {
    return <WidgetMessage title={title} message={latest.error} />;
  }
  if (latest.initialLoading && !chartData.length) {
    return <WidgetLoading title={title} />;
  }
  if (!chartData.length) {
    return <WidgetMessage title={title} message="No data" />;
  }

  return (
    <WidgetShell
      title={title}
      hint={time.mode === "realtime" ? "live" : undefined}
    >
      <MobileChartArea>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 40, left: 8 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            interval={0}
            angle={chartData.length > 3 ? -20 : 0}
            textAnchor={chartData.length > 3 ? "end" : "middle"}
            height={chartData.length > 3 ? 52 : 28}
            tick={{ fontSize: 10, fill: "#64748b" }}
          />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} width={40} />
          <Tooltip
            formatter={(v: number, _n, entry) => {
              const unit = (entry?.payload as { unit?: string })?.unit;
              return [`${formatChartValue(v, decimals)}${unit ? ` ${unit}` : ""}`, "Value"];
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </MobileChartArea>
    </WidgetShell>
  );
}
