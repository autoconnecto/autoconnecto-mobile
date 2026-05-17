import api from "./client";

export type TelemetryAggregation =
  | "avg"
  | "min"
  | "max"
  | "sum"
  | "count"
  | "first"
  | "last"
  | "none";

export interface TelemetryQueryBody {
  devices?: string[];
  deviceIds?: string[];
  deviceId?: string;
  entityId?: string;
  keys?: string[];
  metrics?: string[];
  key?: string;
  from?: number;
  to?: number;
  startTs?: number;
  endTs?: number;
  aggregation?: TelemetryAggregation;
  aggregator?: TelemetryAggregation;
  agg?: TelemetryAggregation;
  combineDevices?: boolean;
  maxDataPoints?: number;
  limit?: number;
}

export type TelemetrySeries = {
  deviceId: string;
  key: string;
  points: Array<[number, number] | { ts: number; value: number }>;
};

export type TelemetryQueryResult = {
  series?: TelemetrySeries[];
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean))
    );
  }
  if (value === undefined || value === null || value === "") return [];
  return [String(value).trim()].filter(Boolean);
}

function normalizeAggregation(value: unknown): TelemetryAggregation {
  const raw = String(value ?? "none").trim().toLowerCase();
  const allowed: TelemetryAggregation[] = [
    "avg",
    "min",
    "max",
    "sum",
    "count",
    "first",
    "last",
    "none",
  ];
  return allowed.includes(raw as TelemetryAggregation)
    ? (raw as TelemetryAggregation)
    : "none";
}

function normalizeTelemetryQuery(body: TelemetryQueryBody) {
  const deviceIds = Array.from(
    new Set(
      [
        ...toStringArray(body.devices),
        ...toStringArray(body.deviceIds),
        ...toStringArray(body.deviceId),
        ...toStringArray(body.entityId),
      ].filter(Boolean)
    )
  );

  const keys = Array.from(
    new Set(
      [
        ...toStringArray(body.keys),
        ...toStringArray(body.metrics),
        ...toStringArray(body.key),
      ].filter(Boolean)
    )
  );

  const now = Date.now();
  const from = Number(body.from) || Number(body.startTs) || now - 60 * 60 * 1000;
  const to = Number(body.to) || Number(body.endTs) || now;
  const aggregation = normalizeAggregation(
    body.aggregation ?? body.aggregator ?? body.agg ?? "none"
  );
  const maxDataPointsRaw = body.maxDataPoints ?? body.limit;
  const maxDataPoints =
    maxDataPointsRaw !== undefined && maxDataPointsRaw !== null
      ? Number(maxDataPointsRaw)
      : undefined;

  return {
    deviceIds,
    keys,
    from,
    to,
    aggregation,
    combineDevices: body.combineDevices === true,
    maxDataPoints:
      maxDataPoints !== undefined && Number.isFinite(maxDataPoints)
        ? maxDataPoints
        : undefined,
  };
}

export async function queryTelemetry(
  body: TelemetryQueryBody
): Promise<TelemetryQueryResult> {
  const normalized = normalizeTelemetryQuery(body);
  const { data } = await api.post("/v1/telemetry/query", {
    deviceIds: normalized.deviceIds,
    keys: normalized.keys,
    from: normalized.from,
    to: normalized.to,
    aggregation: normalized.aggregation,
    combineDevices: normalized.combineDevices,
    maxDataPoints: normalized.maxDataPoints,
  });
  return data && typeof data === "object" ? data : { series: [] };
}

export interface LatestTelemetryItem {
  deviceId: string;
  key: string;
  ts: number | null;
  value: unknown;
}

export async function queryLatestTelemetry(body: {
  devices: string[];
  keys: string[];
  lookbackMs?: number;
}): Promise<{ items: LatestTelemetryItem[] }> {
  const lookbackMs = body.lookbackMs ?? 24 * 60 * 60 * 1000;
  const bucketMs = 60 * 1000;
  const nowBucket = Math.floor(Date.now() / bucketMs) * bucketMs;

  const result = await queryTelemetry({
    devices: body.devices,
    keys: body.keys,
    from: nowBucket - lookbackMs,
    to: nowBucket,
    aggregation: "none",
    combineDevices: false,
    maxDataPoints: 1,
  });

  const items: LatestTelemetryItem[] = [];
  const series = Array.isArray(result.series) ? result.series : [];

  for (const deviceId of body.devices || []) {
    for (const key of body.keys || []) {
      const match = series.find((s) => s.deviceId === deviceId && s.key === key);
      if (!match?.points?.length) {
        items.push({ deviceId, key, ts: null, value: null });
        continue;
      }
      const lastPoint = match.points[match.points.length - 1];
      const ts = Array.isArray(lastPoint)
        ? Number(lastPoint[0])
        : Number((lastPoint as { ts?: number }).ts);
      const value = Array.isArray(lastPoint)
        ? lastPoint[1]
        : (lastPoint as { value?: unknown }).value;
      items.push({
        deviceId,
        key,
        ts: Number.isFinite(ts) ? ts : null,
        value: value ?? null,
      });
    }
  }

  return { items };
}
