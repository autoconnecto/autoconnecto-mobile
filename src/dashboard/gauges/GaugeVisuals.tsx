import {
  describeArc,
  getSeverity,
  getZoneSegments,
  parseNumber,
  parseOptionalNumber,
  valueToAngle,
  valueToPercent,
} from "./gaugeMath";

const SEMI_START = 135;
const SEMI_END = 405;

export function SemicircleGauge({
  value,
  minValue,
  maxValue,
  warningValue,
  criticalValue,
  unit,
  decimals,
  neon = false,
}: {
  value: number | null;
  minValue: number;
  maxValue: number;
  warningValue: number | null;
  criticalValue: number | null;
  unit?: string;
  decimals: number;
  neon?: boolean;
}) {
  const cx = 110;
  const cy = 108;
  const radius = 78;
  const innerRadius = 52;
  const zones = getZoneSegments(minValue, maxValue, warningValue, criticalValue);
  const severity = getSeverity(value, warningValue, criticalValue);
  const needleColor =
    severity === "critical"
      ? "#ef4444"
      : severity === "warning"
        ? "#f59e0b"
        : neon
          ? "#22d3ee"
          : "#2563eb";

  const zoneArcs = zones.map((zone) => {
    const start = valueToAngle(zone.from, minValue, maxValue, SEMI_START, SEMI_END);
    const end = valueToAngle(zone.to, minValue, maxValue, SEMI_START, SEMI_END);
    return (
      <path
        key={`${zone.from}-${zone.to}`}
        d={describeArc(cx, cy, radius, start, end)}
        fill="none"
        stroke={zone.color}
        strokeWidth={neon ? 14 : 12}
        strokeLinecap="round"
        opacity={neon ? 0.95 : 0.85}
      />
    );
  });

  const needleAngle =
    value === null
      ? (SEMI_START + SEMI_END) / 2
      : valueToAngle(value, minValue, maxValue, SEMI_START, SEMI_END);

  const needleEnd = {
    x: cx + innerRadius * Math.cos(((needleAngle - 90) * Math.PI) / 180),
    y: cy + innerRadius * Math.sin(((needleAngle - 90) * Math.PI) / 180),
  };

  const display =
    value === null || Number.isNaN(value)
      ? "—"
      : `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className={`gauge-visual ${neon ? "gauge-visual--neon" : ""}`}>
      <svg viewBox="0 0 220 130" className="gauge-svg" aria-hidden>
        <path
          d={describeArc(cx, cy, radius, SEMI_START, SEMI_END)}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={12}
          strokeLinecap="round"
        />
        {zoneArcs}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={needleColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill={needleColor} />
      </svg>
      <p className="gauge-value-text">{display}</p>
      <p className="gauge-range-text muted small">
        {minValue} – {maxValue}
      </p>
    </div>
  );
}

export function VerticalBarGauge({
  value,
  minValue,
  maxValue,
  warningValue,
  criticalValue,
  unit,
  decimals,
  neon = false,
}: {
  value: number | null;
  minValue: number;
  maxValue: number;
  warningValue: number | null;
  criticalValue: number | null;
  unit?: string;
  decimals: number;
  neon?: boolean;
}) {
  const percent = value === null ? 0 : valueToPercent(value, minValue, maxValue);
  const severity = getSeverity(value, warningValue, criticalValue);
  const fill =
    severity === "critical"
      ? "#ef4444"
      : severity === "warning"
        ? "#f59e0b"
        : neon
          ? "#22d3ee"
          : "#2563eb";

  const display =
    value === null || Number.isNaN(value)
      ? "—"
      : `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className={`gauge-vertical ${neon ? "gauge-visual--neon" : ""}`}>
      <div className="gauge-vertical-track">
        <div
          className="gauge-vertical-fill"
          style={{
            height: `${percent}%`,
            background: fill,
            boxShadow: neon ? `0 0 12px ${fill}` : undefined,
          }}
        />
      </div>
      <div className="gauge-vertical-meta">
        <p className="gauge-value-text">{display}</p>
        <p className="gauge-range-text muted small">
          {minValue} – {maxValue}
        </p>
      </div>
    </div>
  );
}

export function HorizontalBarGauge({
  value,
  minValue,
  maxValue,
  warningValue,
  criticalValue,
  unit,
  decimals,
  label,
}: {
  value: number | null;
  minValue: number;
  maxValue: number;
  warningValue: number | null;
  criticalValue: number | null;
  unit?: string;
  decimals: number;
  label?: string;
}) {
  const percent = value === null ? 0 : valueToPercent(value, minValue, maxValue);
  const severity = getSeverity(value, warningValue, criticalValue);
  const fill =
    severity === "critical"
      ? "#ef4444"
      : severity === "warning"
        ? "#f59e0b"
        : "#22c55e";

  const display =
    value === null || Number.isNaN(value)
      ? "—"
      : `${value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="gauge-horizontal">
      {label ? <p className="gauge-horizontal-label">{label}</p> : null}
      <div className="gauge-horizontal-track">
        <div
          className="gauge-horizontal-fill"
          style={{ width: `${percent}%`, background: fill }}
        />
      </div>
      <p className="gauge-value-text">{display}</p>
    </div>
  );
}

export function LedIndicator({
  state,
  label,
  colorOn = "#22c55e",
}: {
  state: "on" | "off" | "unknown";
  label?: string;
  colorOn?: string;
}) {
  const fill =
    state === "on" ? colorOn : state === "off" ? "#94a3b8" : "#cbd5e1";

  return (
    <div className={`gauge-led ${state === "on" ? "gauge-led--on" : ""}`}>
      <span
        className="gauge-led-dot"
        style={{
          background: fill,
          boxShadow: state === "on" ? `0 0 10px ${fill}` : undefined,
        }}
      />
      {label ? <span className="gauge-led-label">{label}</span> : null}
      <span className="gauge-led-state muted small">
        {state === "unknown" ? "—" : state.toUpperCase()}
      </span>
    </div>
  );
}

export function KpiDisplay({
  value,
  unit,
  decimals,
  subtitle,
}: {
  value: number | null;
  unit?: string;
  decimals: number;
  subtitle?: string;
}) {
  const display =
    value === null || Number.isNaN(value)
      ? "—"
      : value.toFixed(decimals);

  return (
    <div className="gauge-kpi">
      <p className="dash-big-value gauge-kpi-value">
        {display}
        {unit ? <span className="dash-unit"> {unit}</span> : null}
      </p>
      {subtitle ? <p className="card-meta">{subtitle}</p> : null}
    </div>
  );
}

export function MultiGaugeGrid({
  rows,
}: {
  rows: Array<{
    id: string;
    label: string;
    value: number | null;
    min: number;
    max: number;
    warning: number | null;
    critical: number | null;
    unit?: string;
  }>;
}) {
  return (
    <div className="gauge-multi-grid">
      {rows.map((row) => (
        <div key={row.id} className="gauge-multi-item">
          <p className="gauge-multi-label">{row.label}</p>
          <SemicircleGauge
            value={row.value}
            minValue={row.min}
            maxValue={row.max}
            warningValue={row.warning}
            criticalValue={row.critical}
            unit={row.unit}
            decimals={1}
          />
        </div>
      ))}
    </div>
  );
}

export function parseGaugeScale(config: Record<string, unknown>) {
  const minValueRaw = parseNumber(config.minValue, 0);
  const maxValueRaw = parseNumber(config.maxValue, 100);
  return {
    minValue: Math.min(minValueRaw, maxValueRaw),
    maxValue: Math.max(minValueRaw, maxValueRaw),
    warningValue: parseOptionalNumber(config.warningValue),
    criticalValue: parseOptionalNumber(config.criticalValue),
    decimals: Math.max(0, Math.min(6, parseNumber(config.decimals, 1))),
    unit: String(config.unit || config.units || "").trim(),
  };
}
