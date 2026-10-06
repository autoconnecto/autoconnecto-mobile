import { useEffect, useMemo, useState } from "react";
import {
  fetchAlarmOpsSummary,
  fetchKpiSummary,
  fetchThresholdBreach,
  fetchTopN,
} from "../../api/analytics";
import { formatValue } from "../../utils/format";
import { WidgetLoading, WidgetMessage } from "../components/WidgetState";
import { WidgetShell } from "../components/WidgetShell";
import { useWidgetTime } from "../hooks/useWidgetTime";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../hooks/useMobileWidgetBindings";
import { MetricsWidgetMobile } from "./MetricsWidgetMobile";

function configKey(config: Record<string, unknown>): string {
  return String(
    config.key || config.metric || (config.telemetryKeys as string[] | undefined)?.[0] || ""
  ).trim();
}

function deviceIdsFromResolved(
  resolved: { primaryDeviceId?: string | null },
  config: Record<string, unknown>
): string[] {
  const fromConfig = Array.isArray(config.deviceIds)
    ? config.deviceIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const primary = String(resolved.primaryDeviceId || "").trim();
  const ids = [...fromConfig];
  if (primary && !ids.includes(primary)) ids.unshift(primary);
  return ids;
}

export function AnalyticsWidgetMobile(props: MobileWidgetBindings) {
  const type = String(props.widget.type || "");
  const { config, title, resolved } = useMobileWidgetBindings(props);
  const time = useWidgetTime(props.widget);
  const key = configKey(config);
  const deviceIds = useMemo(
    () => deviceIdsFromResolved(resolved, config),
    [resolved, config]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ label: string; value: string }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (
        !Number.isFinite(time.from) ||
        !Number.isFinite(time.to) ||
        time.to <= time.from
      ) {
        setRows([]);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        if (type === "kpiPeriodSummary") {
          if (!key || !deviceIds.length) {
            setRows([]);
            return;
          }
          const res = await fetchKpiSummary({
            deviceIds,
            key,
            from: time.from,
            to: time.to,
            combineDevices: config.combineDevices === true,
          });
          if (cancelled) return;
          const items = Array.isArray(res?.items) ? res.items : [];
          const headline =
            items.find((item: any) => item.deviceId === "combined") || items[0];
          if (!headline) {
            setRows([]);
            return;
          }
          setRows([
            { label: "Latest", value: formatValue(headline.latestValue) },
            { label: "Avg", value: formatValue(headline.avg) },
            { label: "Min", value: formatValue(headline.min) },
            { label: "Max", value: formatValue(headline.max) },
            { label: "Delta", value: formatValue(headline.delta) },
          ]);
          return;
        }

        if (type === "topN") {
          if (!key || !deviceIds.length) {
            setRows([]);
            return;
          }
          const res = await fetchTopN({
            deviceIds,
            key,
            from: time.from,
            to: time.to,
            aggregation: String(config.aggregation || "avg"),
            limit: Number(config.maxItems || config.limit || 5) || 5,
            order: String(config.sortOrder || config.order || "desc"),
          });
          if (cancelled) return;
          const items = Array.isArray(res?.items) ? res.items : [];
          setRows(
            items.slice(0, 8).map((item: any, idx: number) => ({
              label: String(item.deviceId || `#${idx + 1}`),
              value: formatValue(item.value),
            }))
          );
          return;
        }

        if (type === "thresholdBreach") {
          if (!key || !deviceIds.length) {
            setRows([]);
            return;
          }
          const above =
            config.above == null || !Number.isFinite(Number(config.above))
              ? undefined
              : Number(config.above);
          const below =
            config.below == null || !Number.isFinite(Number(config.below))
              ? undefined
              : Number(config.below);
          const res = await fetchThresholdBreach({
            deviceIds,
            key,
            from: time.from,
            to: time.to,
            above,
            below,
          });
          if (cancelled) return;
          const items = Array.isArray(res?.items) ? res.items : [];
          setRows([
            { label: "Breaches", value: String(items.length) },
            {
              label: "Devices",
              value: String(new Set(items.map((i: any) => i.deviceId)).size),
            },
          ]);
          return;
        }

        if (type === "alarmOpsAnalytics") {
          const deviceType = String(config.deviceType || "").trim();
          const res = await fetchAlarmOpsSummary({
            deviceType: deviceType || undefined,
            from: time.from,
            to: time.to,
          });
          if (cancelled) return;
          setRows([
            { label: "Active", value: String(res?.active ?? 0) },
            { label: "Created", value: String(res?.created ?? 0) },
            { label: "Cleared", value: String(res?.cleared ?? 0) },
            {
              label: "Unacked",
              value: String(res?.unacknowledgedActive ?? 0),
            },
          ]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load analytics");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    type,
    key,
    deviceIds.join("|"),
    time.from,
    time.to,
    config.combineDevices,
    config.aggregation,
    config.maxItems,
    config.limit,
    config.sortOrder,
    config.order,
    config.above,
    config.below,
    config.deviceType,
  ]);

  if (resolved.status === "waiting_for_entity" && !deviceIds.length) {
    return (
      <WidgetMessage
        title={title}
        message={resolved.reason || "Select a device for this dashboard"}
      />
    );
  }

  if (loading && !rows.length) {
    return <WidgetLoading title={title} />;
  }

  if (error) {
    return <WidgetMessage title={title} message={error} />;
  }

  if (!rows.length) {
    return <WidgetMessage title={title} message="No analytics data in range" />;
  }

  return (
    <WidgetShell title={title}>
      <ul className="dash-metric-list">
        {rows.map((row) => (
          <li key={row.label}>
            <span className="muted small">{row.label}</span>
            <strong>{row.value}</strong>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function CompositePanelWidgetMobile(props: MobileWidgetBindings) {
  const { title } = useMobileWidgetBindings(props);
  return (
    <div>
      <MetricsWidgetMobile {...props} />
      <p className="muted small" style={{ marginTop: 8 }}>
        {title}: full interactive panel is available on the web console.
      </p>
    </div>
  );
}
