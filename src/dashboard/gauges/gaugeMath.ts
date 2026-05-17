export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(value, min));
}

export function parseNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number
) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(" ");
}

export function valueToPercent(
  value: number,
  minValue: number,
  maxValue: number
) {
  const range = maxValue - minValue || 1;
  return clamp(((value - minValue) / range) * 100, 0, 100);
}

export function valueToAngle(
  value: number,
  minValue: number,
  maxValue: number,
  startAngle: number,
  endAngle: number
) {
  const range = maxValue - minValue || 1;
  const normalized = clamp((value - minValue) / range, 0, 1);
  return startAngle + normalized * (endAngle - startAngle);
}

export type GaugeZone = { from: number; to: number; color: string };

export function getZoneSegments(
  minValue: number,
  maxValue: number,
  warningValue: number | null,
  criticalValue: number | null
): GaugeZone[] {
  const min = Math.min(minValue, maxValue);
  const max = Math.max(minValue, maxValue);
  const safeWarning =
    warningValue === null ? null : clamp(warningValue, min, max);
  const safeCritical =
    criticalValue === null ? null : clamp(criticalValue, min, max);

  if (safeWarning === null && safeCritical === null) {
    return [{ from: min, to: max, color: "#22c55e" }];
  }

  if (safeWarning !== null && safeCritical === null) {
    return [
      { from: min, to: safeWarning, color: "#22c55e" },
      { from: safeWarning, to: max, color: "#f59e0b" },
    ];
  }

  if (safeWarning === null && safeCritical !== null) {
    return [
      { from: min, to: safeCritical, color: "#22c55e" },
      { from: safeCritical, to: max, color: "#ef4444" },
    ];
  }

  const warning = safeWarning as number;
  const critical = safeCritical as number;

  if (critical <= warning) {
    return [
      { from: min, to: critical, color: "#22c55e" },
      { from: critical, to: max, color: "#ef4444" },
    ];
  }

  return [
    { from: min, to: warning, color: "#22c55e" },
    { from: warning, to: critical, color: "#f59e0b" },
    { from: critical, to: max, color: "#ef4444" },
  ];
}

export function getSeverity(
  value: number | null,
  warningValue: number | null,
  criticalValue: number | null
): "normal" | "warning" | "critical" {
  if (value === null || Number.isNaN(value)) return "normal";
  if (criticalValue !== null && value >= criticalValue) return "critical";
  if (warningValue !== null && value >= warningValue) return "warning";
  return "normal";
}

export function coerceBooleanState(value: unknown): "on" | "off" | "unknown" {
  if (value === undefined || value === null || value === "") return "unknown";
  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE" ||
    value === "on" ||
    value === "ON"
  ) {
    return "on";
  }
  return "off";
}
