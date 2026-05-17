import { useEffect, useMemo, useRef, useState } from "react";
import { queryTelemetry } from "../../api/telemetry";

interface UseTelemetryArgs {
  device?: string;
  metric?: string;
  metrics?: string[];
  from?: number;
  to?: number;
  maxDataPoints?: number;
  stableSlidingTimeRange?: boolean;
  historicalResyncKey?: string;
}

export function useTelemetry({
  device,
  metric,
  metrics,
  from,
  to,
  maxDataPoints,
  stableSlidingTimeRange,
  historicalResyncKey,
}: UseTelemetryArgs) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const requestVersion = useRef(0);
  const fromRef = useRef(from);
  const toRef = useRef(to);

  fromRef.current = from;
  toRef.current = to;

  const safeMetric = useMemo(() => String(metric || "").trim(), [metric]);

  const historyFetchKeyed = Boolean(
    stableSlidingTimeRange &&
      typeof historicalResyncKey === "string" &&
      historicalResyncKey.length > 0
  );

  const fetchIdentity = useMemo(() => {
    if (historyFetchKeyed) {
      return `k:${historicalResyncKey}`;
    }
    return `t:${from ?? ""}:${to ?? ""}`;
  }, [historyFetchKeyed, historicalResyncKey, from, to]);

  const keys = useMemo(() => {
    const rawKeys =
      Array.isArray(metrics) && metrics.length
        ? metrics
        : safeMetric
          ? [safeMetric]
          : [];

    return Array.from(
      new Set(rawKeys.map((key) => String(key || "").trim()).filter(Boolean))
    );
  }, [metrics, safeMetric]);

  useEffect(() => {
    const safeDevice = String(device || "").trim();
    const fromCandidate = historyFetchKeyed ? fromRef.current : from;
    const toCandidate = historyFetchKeyed ? toRef.current : to;

    const safeFrom =
      typeof fromCandidate === "number" && Number.isFinite(fromCandidate)
        ? fromCandidate
        : undefined;
    const safeTo =
      typeof toCandidate === "number" && Number.isFinite(toCandidate)
        ? toCandidate
        : undefined;
    const safeMaxDataPoints =
      typeof maxDataPoints === "number" && Number.isFinite(maxDataPoints)
        ? maxDataPoints
        : undefined;

    const hasValidInputs =
      !!safeDevice &&
      keys.length > 0 &&
      safeFrom !== undefined &&
      safeTo !== undefined &&
      safeFrom < safeTo;

    if (!hasValidInputs) {
      setData((prev) => (prev.length ? [] : prev));
      return;
    }

    requestVersion.current += 1;
    const currentRequestVersion = requestVersion.current;
    let cancelled = false;

    async function loadTelemetry() {
      try {
        const result = await queryTelemetry({
          devices: [safeDevice],
          keys,
          from: safeFrom,
          to: safeTo,
          aggregation: "none",
          combineDevices: false,
          maxDataPoints: safeMaxDataPoints,
        });

        if (cancelled || currentRequestVersion !== requestVersion.current) {
          return;
        }

        const series = Array.isArray(result?.series) ? result.series : [];

        if (!series.length) {
          setData((prev) => (prev.length ? [] : prev));
          return;
        }

        const pointMap = new Map<number, Record<string, unknown>>();

        for (const s of series) {
          const seriesKey = String(s?.key || "").trim();
          if (!seriesKey) continue;

          const points = Array.isArray(s?.points) ? s.points : [];
          for (const p of points) {
            const ts = Number(Array.isArray(p) ? p[0] : (p as { ts?: number }).ts);
            const rawVal = Array.isArray(p) ? p[1] : (p as { value?: unknown }).value;
            const numVal = Number(rawVal);

            if (!Number.isFinite(ts) || !Number.isFinite(numVal)) continue;

            const existing = pointMap.get(ts) || { ts };
            existing[seriesKey] = numVal;

            if (safeMetric && seriesKey === safeMetric) {
              existing.value = numVal;
            }

            pointMap.set(ts, existing);
          }
        }

        const formatted = Array.from(pointMap.values()).sort(
          (a, b) => Number(a.ts) - Number(b.ts)
        );

        const capped =
          safeMaxDataPoints !== undefined
            ? formatted.slice(-safeMaxDataPoints)
            : formatted;

        if (cancelled || currentRequestVersion !== requestVersion.current) {
          return;
        }

        setData(capped);
      } catch {
        if (cancelled || currentRequestVersion !== requestVersion.current) {
          return;
        }
        setData((prev) => (prev.length ? [] : prev));
      }
    }

    loadTelemetry();

    return () => {
      cancelled = true;
    };
  }, [device, safeMetric, keys, maxDataPoints, fetchIdentity]);

  return data;
}
