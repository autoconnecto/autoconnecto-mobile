export type ChartPoint = {
  ts: number;
  value: number | null;
};

export function normalizePoints(input: unknown[]): ChartPoint[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((p): ChartPoint | null => {
      const ts = Number((p as { ts?: number })?.ts);
      const raw = (p as { value?: unknown })?.value;
      const value =
        raw === null || raw === undefined || raw === ""
          ? null
          : Number(raw);
      if (!Number.isFinite(ts)) return null;
      if (value !== null && !Number.isFinite(value)) return null;
      return { ts, value };
    })
    .filter((p): p is ChartPoint => p !== null)
    .sort((a, b) => a.ts - b.ts);
}

export function getLastRealPoint(points: ChartPoint[]): ChartPoint | null {
  for (let i = points.length - 1; i >= 0; i -= 1) {
    if (points[i]?.value !== null) return points[i];
  }
  return null;
}

export function formatAxisTime(ts: number, rangeFrom: number, rangeTo: number) {
  const d = new Date(ts);
  const range = rangeTo - rangeFrom;

  if (range > 24 * 60 * 60 * 1000) {
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
    });
  }

  if (range > 5 * 60 * 1000) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatTooltipTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export function formatChartValue(value: unknown, decimals = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  return parsed.toFixed(decimals);
}

export const CHART_PALETTE = [
  "#2563eb",
  "#8b5cf6",
  "#06b6d4",
  "#f43f5e",
  "#22c55e",
  "#eab308",
  "#14b8a6",
  "#6366f1",
];

export function getStableColor(index: number) {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
