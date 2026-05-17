import { useMemo } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
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

export function PieChartWidgetMobile(props: MobileWidgetBindings) {
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
        const value = Number(item.value);
        return {
          id: item.id,
          name: item.label || item.key,
          value: Number.isFinite(value) && value >= 0 ? value : null,
          color: item.color,
          unit: item.unit,
        };
      })
      .filter((row) => row.value !== null);
  }, [latest.items]);

  const totalValue = chartData.reduce((sum, row) => sum + Number(row.value || 0), 0);
  const decimals = Math.max(0, Math.min(Number(config.decimals ?? 2) || 2, 6));
  const innerRadius = Math.max(0, Math.min(Number(config.innerRadius ?? 0), 80));
  const outerRadius = Math.max(40, Math.min(Number(config.outerRadius ?? 72), 96));

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
  if (!chartData.length || totalValue <= 0) {
    return <WidgetMessage title={title} message="No data" />;
  }

  return (
    <WidgetShell
      title={title}
      hint={time.mode === "realtime" ? "live" : undefined}
    >
      <MobileChartArea>
        <PieChart>
          <Tooltip
            formatter={(v: number, _n, entry) => {
              const unit = (entry?.payload as { unit?: string })?.unit;
              return formatChartValue(v, decimals) + (unit ? ` ${unit}` : "");
            }}
          />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </MobileChartArea>
    </WidgetShell>
  );
}
