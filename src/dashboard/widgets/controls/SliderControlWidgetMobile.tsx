import { useEffect, useMemo, useState } from "react";
import { saveDeviceAttributes } from "../../../api/attributes";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import { useDeviceAttributes } from "../../hooks/useDeviceAttributes";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";
import { resolveControlDeviceId } from "../../utils/resolveControlDeviceId";
import { clamp, toNumber } from "./controlUtils";

export function SliderControlWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "Slider");
  const key = String(config.key || "").trim();
  const unit = String(config.unit || "");
  const min = Number(config.min ?? 0);
  const max = Number(config.max ?? 100);
  const step = Number(config.step ?? 1) || 1;
  const decimals = Math.max(0, Number(config.decimals ?? 1) || 0);

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

  const { getValue, loading, version } = useDeviceAttributes(deviceId);
  const [local, setLocal] = useState(min);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attributeValue = key ? toNumber(getValue(key, ["SHARED", "CLIENT"])) : null;

  useEffect(() => {
    if (attributeValue === null) return;
    setLocal(clamp(attributeValue, min, max));
  }, [attributeValue, min, max, version]);

  async function commit(value: number) {
    if (!deviceId || !key) return;
    const next = clamp(value, min, max);
    setPending(true);
    setError(null);
    try {
      await saveDeviceAttributes(deviceId, "SHARED", { [key]: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setPending(false);
    }
  }

  if (!deviceId) {
    return (
      <WidgetMessage title={widgetTitle} message="Select a device for this dashboard" />
    );
  }

  if (!key) {
    return <WidgetMessage title={widgetTitle} message="No attribute key configured" />;
  }

  if (loading && version === 0) {
    return <WidgetLoading title={widgetTitle} />;
  }

  return (
    <WidgetShell title={widgetTitle}>
      {error ? <p className="error small">{error}</p> : null}
      <p className="slider-value-display">
        {local.toFixed(decimals)}
        {unit ? ` ${unit}` : ""}
      </p>
      <input
        type="range"
        className="slider-range"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={pending}
        onChange={(e) => setLocal(Number(e.target.value))}
        onPointerUp={() => commit(local)}
        onTouchEnd={() => commit(local)}
      />
      <div className="slider-range-labels">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </WidgetShell>
  );
}
