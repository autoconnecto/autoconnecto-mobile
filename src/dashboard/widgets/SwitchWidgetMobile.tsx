import { useEffect, useMemo, useState } from "react";
import { saveDeviceAttributes } from "../../api/attributes";
import { WidgetLoading, WidgetMessage } from "../components/WidgetState";
import { WidgetShell } from "../components/WidgetShell";
import { isTruthyAttributeValue } from "../../realtime/attribute.store";
import { useDeviceAttributes } from "../hooks/useDeviceAttributes";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../hooks/useMobileWidgetBindings";
import { getPairStatus, renderAttributeValue } from "../utils/attributePairUtils";
import { resolveControlDeviceId } from "../utils/resolveControlDeviceId";

export type SwitchItem = {
  id: string;
  label: string;
  channel: number;
};

function normalizeSwitchItems(input: unknown): SwitchItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: unknown, index: number) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<
        string,
        unknown
      >;
      const channel = Number(row.channel);
      return {
        id: String(row.id ?? `switch-item-${index}`),
        label: String(row.label ?? `Channel ${channel}`).trim(),
        channel,
      };
    })
    .filter((item) => Number.isFinite(item.channel));
}

function channelKey(channel: number) {
  return `channel${channel}`;
}

export function SwitchWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "Switch");

  const items = useMemo(
    () => normalizeSwitchItems(config.items),
    [config.items]
  );

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

  const { getScopedValue, loading, version } = useDeviceAttributes(deviceId);
  const [pending, setPending] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPending({});
    setError(null);
  }, [deviceId, items.length]);

  function readChecked(channel: number) {
    const raw = getScopedValue("CLIENT", channelKey(channel));
    if (raw === undefined) return false;
    return isTruthyAttributeValue(raw);
  }

  function readShared(channel: number) {
    return getScopedValue("SHARED", channelKey(channel));
  }

  async function handleToggle(channel: number, nextOn: boolean) {
    if (!deviceId) return;

    setPending((p) => ({ ...p, [channel]: true }));
    setError(null);

    try {
      await saveDeviceAttributes(deviceId, "SHARED", {
        [channelKey(channel)]: nextOn ? 1 : 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update switch");
    } finally {
      setPending((p) => ({ ...p, [channel]: false }));
    }
  }

  if (!deviceId) {
    return (
      <WidgetMessage title={widgetTitle} message="Select a device for this dashboard" />
    );
  }

  if (!items.length) {
    return <WidgetMessage title={widgetTitle} message="No switch channels configured" />;
  }

  if (loading && version === 0) {
    return <WidgetLoading title={widgetTitle} />;
  }

  const columns = Math.min(Math.max(Number(config.columns ?? 1) || 1, 1), 2);

  return (
    <WidgetShell title={widgetTitle}>
      {error ? <p className="error small">{error}</p> : null}
      <div
        className="switch-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const checked = readChecked(item.channel);
          const isPending = !!pending[item.channel];
          const sharedVal = readShared(item.channel);
          const clientVal = getScopedValue("CLIENT", channelKey(item.channel));
          const status = getPairStatus(sharedVal, clientVal);

          return (
            <div key={item.id} className="switch-row">
              <div className="switch-row-label">
                <span className="switch-row-title">
                  {item.label || `Ch ${item.channel}`}
                </span>
                <span className={`switch-state ${checked ? "on" : "off"}`}>
                  {checked ? "ON" : "OFF"}
                </span>
                <span className={`attr-pair-status is-${status.tone} switch-row-status`}>
                  {status.text}
                </span>
                <span className="switch-row-pair muted small">
                  Req {renderAttributeValue(sharedVal)} · Ack{" "}
                  {renderAttributeValue(clientVal)}
                </span>
              </div>
              <button
                type="button"
                className={`switch-toggle ${checked ? "is-on" : ""} ${
                  isPending ? "is-pending" : ""
                }`}
                disabled={isPending}
                aria-pressed={checked}
                aria-label={`${item.label} ${checked ? "on" : "off"}`}
                onClick={() => handleToggle(item.channel, !checked)}
              >
                <span className="switch-toggle-thumb" />
              </button>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}

export function MiniSwitchWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "Mini switch");
  const showTitle = config.showTitle !== false;

  const items = useMemo(
    () => normalizeSwitchItems(config.items),
    [config.items]
  );

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

  const { getScopedValue, loading, version } = useDeviceAttributes(deviceId);
  const [pending, setPending] = useState<Record<number, boolean>>({});

  function readChecked(channel: number) {
    const raw = getScopedValue("CLIENT", channelKey(channel));
    if (raw === undefined) return false;
    return isTruthyAttributeValue(raw);
  }

  async function handleToggle(channel: number, nextOn: boolean) {
    if (!deviceId) return;
    setPending((p) => ({ ...p, [channel]: true }));
    try {
      await saveDeviceAttributes(deviceId, "SHARED", {
        [channelKey(channel)]: nextOn ? 1 : 0,
      });
    } finally {
      setPending((p) => ({ ...p, [channel]: false }));
    }
  }

  if (!deviceId || !items.length) {
    return (
      <WidgetMessage
        title={widgetTitle}
        message={!deviceId ? "Select a device" : "Not configured"}
      />
    );
  }

  if (loading && version === 0) {
    return <WidgetLoading title={widgetTitle} />;
  }

  const flow = String(config.flow || "wrap");

  return (
    <WidgetShell title={showTitle ? widgetTitle : ""}>
      <div className={`mini-switch-grid mini-switch-grid--${flow}`}>
        {items.map((item) => {
          const checked = readChecked(item.channel);
          const isPending = !!pending[item.channel];
          return (
            <button
              key={item.id}
              type="button"
              className={`mini-switch-chip ${checked ? "is-on" : ""} ${
                isPending ? "is-pending" : ""
              }`}
              disabled={isPending}
              onClick={() => handleToggle(item.channel, !checked)}
            >
              <span className="mini-switch-dot" />
              <span className="mini-switch-text">
                {item.label || `Ch${item.channel}`}
              </span>
            </button>
          );
        })}
      </div>
    </WidgetShell>
  );
}
