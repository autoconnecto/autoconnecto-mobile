import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { queryTelemetry } from "../../../api/telemetry";
import { useLiveTelemetry } from "../../../realtime/useLiveTelemetry";
import { MobileChartArea } from "../../components/MobileChartArea";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import {
  formatAxisTime,
  formatTooltipTime,
  getStableColor,
} from "../../charts/chartUtils";
import {
  buildTelemetryHistoricalResyncKey,
  useWidgetTime,
} from "../../hooks/useWidgetTime";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(input.map((v) => String(v || "").trim()).filter(Boolean))
  ).sort();
}

export function MultiTimeseriesChartWidget(props: MobileWidgetBindings) {
  const { config, title, resolved } = useMobileWidgetBindings(props);
  const time = useWidgetTime(props.widget);

  const from = time.from;
  const to = time.to;
  const isRealtimeMode = time.mode === "realtime";

  const deviceIds = useMemo(() => {
    const resolvedIds = normalizeStringArray(resolved.deviceIds);
    const configuredIds = normalizeStringArray(config.deviceIds);
    return resolvedIds.length ? resolvedIds : configuredIds;
  }, [resolved.deviceIds, config.deviceIds]);

  const keys = useMemo(() => {
    const resolvedKeys = normalizeStringArray(resolved.metrics);
    const configuredKeys = normalizeStringArray(config.keys);
    return resolvedKeys.length ? resolvedKeys : configuredKeys;
  }, [resolved.metrics, config.keys]);

  const seriesKeys = useMemo(() => {
    const output: string[] = [];
    let index = 0;
    for (const deviceId of deviceIds) {
      for (const key of keys) {
        output.push(`${deviceId}__${key}`);
        index += 1;
      }
    }
    return output;
  }, [deviceIds, keys]);

  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);

  const historicalResyncKey = useMemo(
    () => buildTelemetryHistoricalResyncKey(time, "chart"),
    [time.mode, time.windowMs, time.source, time.from, time.to, time.refreshSec]
  );

  useEffect(() => {
    if (resolved.status !== "ready" || !deviceIds.length || !keys.length) {
      setData([]);
      return;
    }

    requestVersion.current += 1;
    const version = requestVersion.current;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await queryTelemetry({
          devices: deviceIds,
          keys,
          from,
          to,
          aggregation: "none",
          combineDevices: false,
          maxDataPoints: 800,
        });

        if (cancelled || version !== requestVersion.current) return;

        const pointMap = new Map<number, Record<string, unknown>>();

        for (const s of result.series || []) {
          const seriesKey = `${s.deviceId}__${s.key}`;
          for (const p of s.points || []) {
            const ts = Number(Array.isArray(p) ? p[0] : (p as { ts?: number }).ts);
            const rawVal = Array.isArray(p) ? p[1] : (p as { value?: unknown }).value;
            const numVal = Number(rawVal);
            if (!Number.isFinite(ts) || !Number.isFinite(numVal)) continue;
            const row = pointMap.get(ts) || { ts };
            row[seriesKey] = numVal;
            pointMap.set(ts, row);
          }
        }

        setData(
          Array.from(pointMap.values()).sort(
            (a, b) => Number(a.ts) - Number(b.ts)
          )
        );
      } catch {
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [
    resolved.status,
    deviceIds.join("|"),
    keys.join("|"),
    historicalResyncKey,
  ]);

  const { pointsByTopic } = useLiveTelemetry({
    deviceIds: isRealtimeMode ? deviceIds : [],
    keys: isRealtimeMode ? keys : [],
    enabled: resolved.status === "ready" && isRealtimeMode,
  });

  useEffect(() => {
    if (!isRealtimeMode || resolved.status !== "ready") return;

    setData((prev) => {
      let changed = false;
      const next = [...prev];
      const indexByTs = new Map<number, number>();

      for (let i = 0; i < next.length; i += 1) {
        indexByTs.set(Number(next[i].ts), i);
      }

      for (const seriesKey of seriesKeys) {
        const live = pointsByTopic[seriesKey];
        if (!live) continue;

        const ts = Number(live.ts ?? Date.now());
        const value = Number(live.value);
        if (!Number.isFinite(ts) || !Number.isFinite(value)) continue;
        if (ts < from || ts > to) continue;

        const idx = indexByTs.get(ts);
        if (idx !== undefined) {
          if (next[idx][seriesKey] !== value) {
            next[idx] = { ...next[idx], [seriesKey]: value };
            changed = true;
          }
        } else {
          next.push({ ts, [seriesKey]: value });
          changed = true;
        }
      }

      if (!changed) return prev;
      return next.sort((a, b) => Number(a.ts) - Number(b.ts)).slice(-800);
    });
  }, [isRealtimeMode, resolved.status, pointsByTopic, seriesKeys, from, to]);

  if (resolved.status === "waiting_for_entity") {
    return <WidgetMessage title={title} message={resolved.reason || "Select a device"} />;
  }
  if (resolved.status === "not_configured" || !deviceIds.length || !keys.length) {
    return <WidgetMessage title={title} message="Not configured" />;
  }
  if (loading && !data.length) {
    return <WidgetLoading title={title} />;
  }
  if (!data.length) {
    return <WidgetMessage title={title} message="No data in selected time range" />;
  }

  return (
    <WidgetShell title={title} hint={isRealtimeMode ? "live" : undefined}>
      <MobileChartArea height={240}>
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
          <Tooltip labelFormatter={(v) => formatTooltipTime(Number(v))} />
          {seriesKeys.map((seriesKey, index) => (
            <Line
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              name={seriesKey.replace("__", " · ")}
              stroke={getStableColor(index)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </MobileChartArea>
    </WidgetShell>
  );
}
