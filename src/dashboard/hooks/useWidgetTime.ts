import { useMemo } from "react";
import { useMobileDashboardClock } from "../context/MobileDashboardClock";

export interface WidgetTimeState {
  mode: "realtime" | "history";
  from: number;
  to: number;
  windowMs: number;
  refreshSec: number;
  source: "dashboard" | "widget";
}

export type TelemetryHistoryResyncPolicy = "chart" | "delta";

export function buildTelemetryHistoricalResyncKey(
  time: WidgetTimeState,
  policy: TelemetryHistoryResyncPolicy = "chart"
): string {
  if (time.mode === "history") {
    return `h:${time.from}|${time.to}`;
  }

  if (policy === "delta") {
    const step = Math.max(1, time.refreshSec) * 1000;
    const bucket = Math.floor(time.to / step);
    return `r:${time.windowMs}|${time.source}|${bucket}`;
  }

  return `r:${time.windowMs}|${time.source}`;
}

export function useWidgetTime(widget: Record<string, unknown>): WidgetTimeState {
  const clock = useMobileDashboardClock();
  const config = (widget?.config || {}) as Record<string, unknown>;

  return useMemo(() => {
    const timeSource =
      config?.timeSource === "widget" ? "widget" : "dashboard";

    if (timeSource === "dashboard") {
      return {
        mode: clock.mode === "history" ? "history" : "realtime",
        from: clock.from,
        to: clock.to,
        windowMs: clock.windowMs,
        refreshSec: clock.refreshSec || 10,
        source: "dashboard",
      };
    }

    const widgetMode =
      config?.widgetTimeMode === "history" ? "history" : "realtime";
    const refreshSec = clock.refreshSec || 10;
    const widgetWindowMsRaw = Number(config?.widgetWindowMs);
    const widgetWindowMs =
      Number.isFinite(widgetWindowMsRaw) && widgetWindowMsRaw > 0
        ? widgetWindowMsRaw
        : 60 * 60 * 1000;

    if (widgetMode === "realtime") {
      const now = Date.now();
      return {
        mode: "realtime",
        from: now - widgetWindowMs,
        to: now,
        windowMs: widgetWindowMs,
        refreshSec,
        source: "widget",
      };
    }

    const from = Number(config?.from);
    const to = Number(config?.to);

    if (Number.isFinite(from) && Number.isFinite(to) && from < to) {
      return {
        mode: "history",
        from,
        to,
        windowMs: to - from,
        refreshSec,
        source: "widget",
      };
    }

    return {
      mode: clock.mode === "history" ? "history" : "realtime",
      from: clock.from,
      to: clock.to,
      windowMs: clock.windowMs,
      refreshSec,
      source: "dashboard",
    };
  }, [
    config?.timeSource,
    config?.widgetTimeMode,
    config?.widgetWindowMs,
    config?.from,
    config?.to,
    clock.mode,
    clock.from,
    clock.to,
    clock.windowMs,
    clock.refreshSec,
  ]);
}
