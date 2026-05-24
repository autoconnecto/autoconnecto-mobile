import { useEffect, useMemo, useRef, useState } from "react";
import { saveDeviceAttributes, type AttributeScope } from "../../../api/attributes";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import { useDeviceAttributes } from "../../hooks/useDeviceAttributes";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";
import { resolveControlDeviceId } from "../../utils/resolveControlDeviceId";
import { clamp, toNumber } from "./controlUtils";

function normalizeWriteScope(raw: unknown): AttributeScope {
  const scope = String(raw || "SHARED").trim().toUpperCase();
  if (scope === "CLIENT") return "CLIENT";
  if (scope === "SERVER") return "SERVER";
  return "SHARED";
}

function roundToStep(value: number, step: number, min: number, max: number) {
  if (!Number.isFinite(step) || step <= 0) {
    return clamp(value, min, max);
  }
  const steps = Math.round((value - min) / step);
  return clamp(min + steps * step, min, max);
}

export function SliderControlWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "Slider");
  const key = String(config.key || config.metric || config.telemetryKey || "").trim();
  const unit = String(config.unit || "");
  const min = Number(config.min ?? 0);
  const max = Number(config.max ?? 100);
  const step = Number(config.step ?? 1) || 1;
  const decimals = Math.max(0, Number(config.decimals ?? 1) || 0);
  const writeScope = normalizeWriteScope(config.writeScope ?? config.scope);

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
  const [local, setLocal] = useState(min);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localRef = useRef(min);

  const attributeValue = key
    ? toNumber(getScopedValue(writeScope, key))
    : null;

  useEffect(() => {
    if (attributeValue === null) return;
    const next = roundToStep(attributeValue, step, min, max);
    setLocal(next);
    localRef.current = next;
  }, [attributeValue, min, max, step, version]);

  async function commit(value: number) {
    if (!deviceId || !key) return;
    const next = roundToStep(value, step, min, max);
    if (!Number.isFinite(next)) {
      setError("Invalid slider value");
      return;
    }

    setLocal(next);
    localRef.current = next;
    setPending(true);
    setError(null);
    try {
      await saveDeviceAttributes(deviceId, writeScope, { [key]: next });
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
        onChange={(e) => {
          const next = Number(e.target.value);
          setLocal(next);
          localRef.current = next;
        }}
        onPointerUp={(e) => commit(Number(e.currentTarget.value))}
        onTouchEnd={(e) => commit(Number(e.currentTarget.value))}
      />
      <div className="slider-range-labels">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </WidgetShell>
  );
}
