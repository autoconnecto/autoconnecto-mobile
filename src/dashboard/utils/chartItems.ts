export const DASHBOARD_STATE_DEVICE = "__dashboardState__";

export function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

export type ChartItemBase = {
  id: string;
  deviceId: string;
  key: string;
  label: string;
  unit: string;
  color: string;
};

export function normalizeChartItems(
  input: unknown,
  fallbackDeviceId?: string | null
): ChartItemBase[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item: unknown, index: number) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<
        string,
        unknown
      >;

      const key = firstNonEmptyString(
        row.key,
        row.telemetryKey,
        row.metric,
        row.field,
        row.name
      );

      let deviceId = firstNonEmptyString(
        row.deviceId,
        row.sourceDeviceId,
        row.entityId
      );

      if (
        deviceId === DASHBOARD_STATE_DEVICE ||
        (!deviceId && fallbackDeviceId)
      ) {
        deviceId = String(fallbackDeviceId || "").trim();
      }

      if (!key || !deviceId) return null;

      return {
        id: firstNonEmptyString(row.id, `item-${index}`),
        deviceId,
        key,
        label: firstNonEmptyString(row.label, row.title, row.name, key),
        unit: firstNonEmptyString(row.unit),
        color: firstNonEmptyString(row.color, "#2563eb"),
      };
    })
    .filter((item): item is ChartItemBase => item !== null);
}
