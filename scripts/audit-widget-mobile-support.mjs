import fs from "fs";
import path from "path";

const registryPath = path.resolve(
  "../frontend/src/features/dashboards/registry/widgetRegistry.ts"
);
const mobilePath = path.resolve("src/dashboard/MobileWidget.tsx");

const registry = fs.readFileSync(registryPath, "utf8");
const mobile = fs.readFileSync(mobilePath, "utf8");

const manualKeys = [
  ...registry.matchAll(/^\s{2}([a-zA-Z0-9]+):\s+withMeta/gm),
].map((m) => m[1]);

const extractSet = (name) => {
  const re = new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`);
  const m = mobile.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
};

const ALARM = extractSet("ALARM_TYPES");
const GAUGE = extractSet("GAUGE_TYPES");
const VALUE = extractSet("VALUE_TYPES");
const CHART = extractSet("CHART_WIDGET_TYPES");
const CHART_RENDERED = [
  "timeseries",
  "multitimeseries",
  "barChart",
  "pieChart",
  "doughnut",
  "sparkline",
];

const GAUGE_RENDERED = [
  "gauge",
  "multigauge",
  "digitalRoundGauge",
  "digitalVerticalBar",
  "neonRoundGauge",
  "neonVerticalBar",
  "analogMeter",
  "batteryIndicator",
  "tankLevel",
  "progressBar",
  "signalStrength",
  "value",
  "led",
  "miniLed",
  "kpiStatCard",
  "trendDirection",
  "deltaComparison",
];

const SPECIAL = ["deviceCount"];
const WEB_ONLY_EXPLICIT = ["deviceTable", "navigationButton"];

function classify(type) {
  if (SPECIAL.includes(type)) return "full";
  if (ALARM.includes(type)) return "alarms";
  if (CHART_RENDERED.includes(type)) return "chart-rendered";
  if (GAUGE_RENDERED.includes(type)) return "gauge-rendered";
  if (VALUE.includes(type) || GAUGE.includes(type)) return "telemetry-card";
  if (CHART.includes(type)) return "web-placeholder";
  if (WEB_ONLY_EXPLICIT.includes(type)) return "web-placeholder";
  return "partial-or-unknown";
}

const rows = [...new Set(manualKeys)].sort().map((type) => ({
  type,
  mobile: classify(type),
}));

console.log(JSON.stringify({ total: rows.length, rows }, null, 2));
