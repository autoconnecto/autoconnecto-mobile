import { normalizeChartItems } from "./chartItems";
import { normalizeWidgetConfig } from "../normalizeWidgetConfig";

export type TelemetryDisplayItem = {
  id: string;
  deviceId: string;
  key: string;
  label: string;
  unit?: string;
  kind?: "value" | "boolean" | "badge";
  trueText?: string;
  falseText?: string;
};

function pushUnique(
  out: TelemetryDisplayItem[],
  item: TelemetryDisplayItem
) {
  if (!item.deviceId || !item.key) return;
  const exists = out.some(
    (row) => row.deviceId === item.deviceId && row.key === item.key
  );
  if (!exists) out.push(item);
}

export function collectTelemetryItemsFromWidget(
  widget: Record<string, unknown>,
  primaryDeviceId: string | null
): TelemetryDisplayItem[] {
  const config = (widget.config || {}) as Record<string, unknown>;
  const type = String(widget.type || "");
  const fallback = primaryDeviceId || "";
  const out: TelemetryDisplayItem[] = [];

  const fromChart = normalizeChartItems(
    config.items ??
      config.series ??
      config.metrics ??
      config.rows ??
      config.fields ??
      config.cells,
    fallback
  );

  for (const row of fromChart) {
    pushUnique(out, {
      id: row.id,
      deviceId: row.deviceId,
      key: row.key,
      label: row.label,
      unit: row.unit || undefined,
      kind: "value",
    });
  }

  const normalized = normalizeWidgetConfig(widget);
  const deviceId = primaryDeviceId || normalized.primaryRawDeviceId || fallback;
  const keys =
    normalized.telemetryKeys.length > 0
      ? normalized.telemetryKeys
      : normalized.metric
        ? [normalized.metric]
        : [];

  for (const key of keys) {
    if (!deviceId) continue;
    pushUnique(out, {
      id: `metric-${key}`,
      deviceId,
      key,
      label: key,
      kind: "value",
    });
  }

  if (type === "motorStatus" || type === "pumpStatus") {
    const pairs: Array<[string, string, string?]> = [
      [String(config.metric || config.key || "status"), "Status"],
      [String(config.speedKey || "speed"), "Speed", String(config.speedUnit || "rpm")],
      [String(config.currentKey || "current"), "Current", String(config.currentUnit || "A")],
      [String(config.faultKey || "fault"), "Fault"],
      [String(config.levelKey || "level"), "Level", String(config.unit || "%")],
      [String(config.flowKey || "flow"), "Flow"],
      [String(config.pressureKey || "pressure"), "Pressure"],
    ];
    for (const [key, label, unit] of pairs) {
      if (!key.trim() || !deviceId) continue;
      pushUnique(out, {
        id: `motor-${key}`,
        deviceId,
        key: key.trim(),
        label,
        unit,
        kind: key.includes("fault") ? "boolean" : "value",
      });
    }
  }

  return out;
}
