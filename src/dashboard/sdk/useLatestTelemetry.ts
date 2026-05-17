import { useEffect, useMemo, useRef, useState } from "react";
import { queryLatestTelemetry, queryTelemetry } from "../../api/telemetry";
import { useLiveTelemetry } from "../../realtime/useLiveTelemetry";

export type LatestTelemetryMode = "realtime" | "history";

export interface LatestTelemetryItemConfig {
  deviceId: string;
  key: string;
  label?: string;
  unit?: string;
  color?: string;
  id?: string;
  [key: string]: unknown;
}

export interface UseLatestTelemetryArgs<TItem extends LatestTelemetryItemConfig> {
  items: TItem[];
  mode: LatestTelemetryMode;
  from?: number;
  to?: number;
  enabled?: boolean;
}

function buildItemsIdentity(items: LatestTelemetryItemConfig[]) {
  return (Array.isArray(items) ? items : [])
    .map((item) => `${item?.deviceId || ""}__${item?.key || ""}`)
    .filter(Boolean)
    .sort()
    .join("|");
}

function normalizeStringArray(values: string[]) {
  return Array.from(new Set(values.filter(Boolean).map(String))).sort();
}

function buildResultItems<TItem extends LatestTelemetryItemConfig>(
  sourceItems: TItem[],
  valuesByTopic: Map<string, { value: unknown; ts: number | null }>
): Array<TItem & { value: unknown; ts: number | null }> {
  return sourceItems.map((item) => {
    const topicKey = `${item.deviceId}__${item.key}`;
    const found = valuesByTopic.get(topicKey);
    return {
      ...item,
      value: found?.value ?? null,
      ts: found?.ts ?? null,
    };
  });
}

export function useLatestTelemetry<TItem extends LatestTelemetryItemConfig>({
  items,
  mode,
  from,
  to,
  enabled = true,
}: UseLatestTelemetryArgs<TItem>) {
  const normalizedItems = useMemo(() => {
    const seen = new Set<string>();
    return (Array.isArray(items) ? items : []).filter((item) => {
      const deviceId = String(item?.deviceId || "").trim();
      const key = String(item?.key || "").trim();
      if (!deviceId || !key) return false;
      const composite = `${deviceId}__${key}`;
      if (seen.has(composite)) return false;
      seen.add(composite);
      return true;
    });
  }, [items]);

  const itemsIdentity = useMemo(
    () => buildItemsIdentity(normalizedItems),
    [normalizedItems]
  );

  const historyRangeKey = useMemo(() => {
    if (mode !== "history") return "rt";
    const safeFrom =
      typeof from === "number" && Number.isFinite(from) ? from : null;
    const safeTo = typeof to === "number" && Number.isFinite(to) ? to : null;
    if (safeFrom === null || safeTo === null) return "rt";
    return `h:${safeFrom}|${safeTo}`;
  }, [mode, from, to]);

  const selectedDeviceIds = useMemo(
    () => normalizeStringArray(normalizedItems.map((item) => item.deviceId)),
    [itemsIdentity]
  );

  const selectedKeys = useMemo(
    () => normalizeStringArray(normalizedItems.map((item) => item.key)),
    [itemsIdentity]
  );

  const liveQuery = useMemo(() => {
    if (!enabled || mode !== "realtime") return null;
    if (!selectedDeviceIds.length || !selectedKeys.length) return null;
    return { deviceIds: selectedDeviceIds, keys: selectedKeys };
  }, [enabled, mode, itemsIdentity]);

  const { pointsByTopic } = useLiveTelemetry({
    deviceIds: liveQuery?.deviceIds || [],
    keys: liveQuery?.keys || [],
    enabled: !!liveQuery,
  });

  const [resultItems, setResultItems] = useState<
    Array<TItem & { value: unknown; ts: number | null }>
  >([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestVersion = useRef(0);
  const normalizedItemsRef = useRef(normalizedItems);

  useEffect(() => {
    normalizedItemsRef.current = normalizedItems;
  }, [itemsIdentity]);

  useEffect(() => {
    const safeFrom =
      typeof from === "number" && Number.isFinite(from) ? from : null;
    const safeTo = typeof to === "number" && Number.isFinite(to) ? to : null;

    if (
      !enabled ||
      !itemsIdentity ||
      !selectedDeviceIds.length ||
      !selectedKeys.length
    ) {
      setResultItems([]);
      setInitialLoading(false);
      setError(null);
      return;
    }

    if (
      mode === "history" &&
      (safeFrom === null || safeTo === null || safeFrom >= safeTo)
    ) {
      setResultItems([]);
      setInitialLoading(false);
      setError(null);
      return;
    }

    requestVersion.current += 1;
    const version = requestVersion.current;
    let cancelled = false;

    async function load() {
      try {
        setInitialLoading(true);
        setError(null);

        const valuesByTopic = new Map<
          string,
          { value: unknown; ts: number | null }
        >();

        if (mode === "realtime") {
          const latestResult = await queryLatestTelemetry({
            devices: selectedDeviceIds,
            keys: selectedKeys,
          });

          if (cancelled || version !== requestVersion.current) return;

          for (const row of latestResult.items || []) {
            valuesByTopic.set(`${row.deviceId}__${row.key}`, {
              value: row.value ?? null,
              ts:
                typeof row.ts === "number" && Number.isFinite(row.ts)
                  ? row.ts
                  : null,
            });
          }
        } else {
          const historyResult = await queryTelemetry({
            devices: selectedDeviceIds,
            keys: selectedKeys,
            from: safeFrom as number,
            to: safeTo as number,
            aggregation: "none",
            combineDevices: false,
            maxDataPoints: 1000,
          });

          if (cancelled || version !== requestVersion.current) return;

          for (const s of historyResult.series || []) {
            let latestTs: number | null = null;
            let latestValue: unknown = null;

            for (const point of s.points || []) {
              const ts = Number(Array.isArray(point) ? point[0] : point?.ts);
              const value = Array.isArray(point) ? point[1] : point?.value;

              if (!Number.isFinite(ts)) continue;

              if (latestTs === null || ts > latestTs) {
                latestTs = ts;
                latestValue = value;
              }
            }

            valuesByTopic.set(`${s.deviceId}__${s.key}`, {
              value: latestValue,
              ts: latestTs,
            });
          }
        }

        setResultItems(
          buildResultItems(
            normalizedItemsRef.current as TItem[],
            valuesByTopic
          )
        );
      } catch {
        if (!cancelled) {
          setError("Failed to load telemetry");
          setResultItems([]);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [enabled, mode, itemsIdentity, historyRangeKey]);

  useEffect(() => {
    if (!enabled || mode !== "realtime" || !pointsByTopic) return;
    if (!itemsIdentity) return;

    setResultItems((prev) => {
      const base =
        Array.isArray(prev) && prev.length === normalizedItemsRef.current.length
          ? prev
          : buildResultItems(normalizedItemsRef.current as TItem[], new Map());

      let changed = false;

      const next = base.map((item) => {
        const topicKey = `${item.deviceId}__${item.key}`;
        const livePoint = pointsByTopic[topicKey];
        if (!livePoint) return item;

        const nextValue = livePoint.value;
        const nextTsRaw = Number(livePoint.ts ?? Date.now());
        const nextTs = Number.isFinite(nextTsRaw) ? nextTsRaw : item.ts;

        if (item.value === nextValue && item.ts === nextTs) {
          return item;
        }

        changed = true;
        return { ...item, value: nextValue, ts: nextTs ?? null };
      });

      return changed ? next : prev;
    });
  }, [enabled, mode, pointsByTopic, itemsIdentity]);

  return {
    items: resultItems,
    initialLoading,
    error,
  };
}
