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
import { isTruthyChannelValue, valuesMatch } from "./controlUtils";

export function ToggleButtonWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "Toggle");

  const controlMode = config.controlMode === "key" ? "key" : "channel";
  const channel = Math.max(1, Number(config.channel ?? 1) || 1);
  const commandKey = String(
    config.key || config.telemetryKey || config.metric || ""
  ).trim();
  const onValue = config.onValue ?? 1;
  const offValue = config.offValue ?? 0;
  const onLabel = String(config.onLabel || "ON");
  const offLabel = String(config.offLabel || "OFF");

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

  const telemetryKey =
    controlMode === "channel" ? `ch${channel}` : commandKey;

  const telemetry = useDeviceTelemetry(
    deviceId || null,
    telemetryKey ? [telemetryKey] : []
  );

  const [pending, setPending] = useState(false);
  const [optimistic, setOptimistic] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOptimistic(null);
    setError(null);
  }, [deviceId, controlMode, channel, commandKey]);

  const liveValue = telemetryKey ? telemetry[telemetryKey]?.value : undefined;
  const currentValue =
    optimistic !== null && optimistic !== undefined ? optimistic : liveValue;

  const isOn =
    controlMode === "channel"
      ? isTruthyChannelValue(currentValue)
      : valuesMatch(currentValue, onValue);

  async function handleToggle() {
    if (!deviceId) return;
    const nextOn = !isOn;
    setPending(true);
    setError(null);

    try {
      if (controlMode === "channel") {
        setOptimistic(nextOn);
        const res = await sendDeviceCommand(deviceId, {
          type: "set_channel_state",
          channel,
          state: nextOn ? 1 : 0,
        });
        if (!res.success) throw new Error(res.message || "Command failed");
      } else {
        const nextValue = nextOn ? onValue : offValue;
        setOptimistic(nextValue);
        const res = await sendDeviceCommand(deviceId, {
          type: "set_numeric_value",
          key: commandKey,
          value: nextValue,
        });
        if (!res.success) throw new Error(res.message || "Command failed");
      }
    } catch (err) {
      setOptimistic(null);
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setPending(false);
    }
  }

  if (!deviceId) {
    return (
      <WidgetMessage title={widgetTitle} message="Select a device for this dashboard" />
    );
  }

  if (controlMode === "key" && !commandKey) {
    return <WidgetMessage title={widgetTitle} message="No control key configured" />;
  }

  if (!telemetryKey && controlMode === "channel") {
    return <WidgetMessage title={widgetTitle} message="Invalid channel" />;
  }

  const hasData = liveValue !== undefined && liveValue !== null;
  if (!hasData && optimistic === null && !pending) {
    return <WidgetLoading title={widgetTitle} />;
  }

  return (
    <WidgetShell title={widgetTitle}>
      {error ? <p className="error small">{error}</p> : null}
      <div className="toggle-button-mobile">
        <button
          type="button"
          className={`toggle-button-mobile__btn ${isOn ? "is-on" : "is-off"} ${
            pending ? "is-pending" : ""
          }`}
          disabled={pending}
          onClick={handleToggle}
        >
          {isOn ? onLabel : offLabel}
        </button>
        <span className="muted small">
          {hasData || optimistic !== null ? (isOn ? onLabel : offLabel) : "Waiting for data…"}
        </span>
      </div>
    </WidgetShell>
  );
}
