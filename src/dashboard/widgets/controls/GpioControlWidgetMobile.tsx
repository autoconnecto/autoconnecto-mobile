import { useEffect, useMemo, useState } from "react";
import { sendDeviceCommand } from "../../../api/commands";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import { useDeviceTelemetry } from "../../useDeviceTelemetry";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";
import { resolveControlDeviceId } from "../../utils/resolveControlDeviceId";
import { formatDisplayValue, isTruthyChannelValue } from "./controlUtils";

type GpioItem = { id: string; label: string; channel: number };

function normalizeGpioItems(input: unknown): GpioItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: unknown, index: number) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<
        string,
        unknown
      >;
      const channel = Number(row.channel);
      return {
        id: String(row.id ?? `gpio-${index}`),
        label: String(row.label ?? `GPIO ${channel}`).trim(),
        channel,
      };
    })
    .filter((item) => Number.isFinite(item.channel) && item.channel > 0);
}

export function GpioControlWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "GPIO control");
  const items = useMemo(() => normalizeGpioItems(config.items), [config.items]);

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

  const keys = useMemo(
    () => items.map((item) => `ch${item.channel}`),
    [items]
  );

  const telemetry = useDeviceTelemetry(deviceId || null, keys);
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPending({});
    setError(null);
  }, [deviceId, items.length]);

  async function handleToggle(item: GpioItem) {
    if (!deviceId) return;
    const key = `ch${item.channel}`;
    const current = telemetry[key]?.value;
    const nextOn = !isTruthyChannelValue(current);

    setPending((p) => ({ ...p, [item.channel]: true }));
    setError(null);
    try {
      const res = await sendDeviceCommand(deviceId, {
        type: "set_channel_state",
        channel: item.channel,
        state: nextOn ? 1 : 0,
      });
      if (!res.success) throw new Error(res.message || "Command failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "GPIO command failed");
    } finally {
      setPending((p) => ({ ...p, [item.channel]: false }));
    }
  }

  if (!deviceId) {
    return (
      <WidgetMessage title={widgetTitle} message="Select a device for this dashboard" />
    );
  }

  if (!items.length) {
    return <WidgetMessage title={widgetTitle} message="No GPIO channels configured" />;
  }

  const hasAnyData = keys.some((key) => telemetry[key] !== undefined);
  if (!hasAnyData) {
    return <WidgetLoading title={widgetTitle} />;
  }

  return (
    <WidgetShell title={widgetTitle}>
      {error ? <p className="error small">{error}</p> : null}
      <ul className="gpio-control-list">
        {items.map((item) => {
          const key = `ch${item.channel}`;
          const raw = telemetry[key]?.value;
          const on = isTruthyChannelValue(raw);
          const isPending = !!pending[item.channel];
          return (
            <li key={item.id} className="gpio-control-row">
              <div className="gpio-control-row__meta">
                <span className="gpio-control-row__label">{item.label}</span>
                <span className="muted small">{formatDisplayValue(raw)}</span>
              </div>
              <button
                type="button"
                className={`switch-toggle ${on ? "is-on" : ""} ${
                  isPending ? "is-pending" : ""
                }`}
                disabled={isPending}
                aria-pressed={on}
                onClick={() => handleToggle(item)}
              >
                <span className="switch-toggle-thumb" />
              </button>
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
