import fs from "fs";
import path from "path";

const registryPath = path.resolve(
  "../frontend/src/features/dashboards/registry/widgetRegistry.ts"
);

const routesPath = path.resolve("src/dashboard/widgetRoutes.ts");
const mobilePath = path.resolve("src/dashboard/MobileWidget.tsx");

const registry = fs.readFileSync(registryPath, "utf8");
const routes = fs.readFileSync(routesPath, "utf8");
const mobile = fs.readFileSync(mobilePath, "utf8");

const manualKeys = [
  ...registry.matchAll(/^\s{2}([a-zA-Z0-9]+):\s+withMeta/gm),
].map((m) => m[1]);

function extractSetFromFile(content, name) {
  const re = new RegExp(`export const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`);
  const m = content.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

const CHART = extractSetFromFile(routes, "CHART_WIDGET_TYPES");
const CONTROL = extractSetFromFile(routes, "CONTROL_WIDGET_TYPES");
const GAUGE = extractSetFromFile(routes, "GAUGE_WIDGET_TYPES");
const ALARM = extractSetFromFile(routes, "ALARM_WIDGET_TYPES");
const METRICS = extractSetFromFile(routes, "METRICS_WIDGET_TYPES");
const PANEL = extractSetFromFile(routes, "PANEL_WIDGET_TYPES");
const MAP = extractSetFromFile(routes, "MAP_WIDGET_TYPES");
const DEVICE_DATA = extractSetFromFile(routes, "DEVICE_DATA_TYPES");

const SPECIAL = new Set(["deviceCount", "deviceTable"]);

function classify(type) {
  if (SPECIAL.has(type)) return "full";
  if (ALARM.includes(type)) return "alarms";
  if (CHART.includes(type)) return "chart";
  if (CONTROL.includes(type)) return "control";
  if (GAUGE.includes(type)) return "gauge";
  if (PANEL.includes(type)) return "panel";
  if (MAP.includes(type)) return "map";
  if (DEVICE_DATA.includes(type)) return "device-data-card";
  if (METRICS.includes(type)) return "metrics-composite";
  if (mobile.includes(`"${type}"`)) return "metrics-fallback";
  return "metrics-fallback";
}

const rows = [...new Set(manualKeys)].sort().map((type) => ({
  type,
  mobile: classify(type),
}));

const summary = rows.reduce((acc, row) => {
  acc[row.mobile] = (acc[row.mobile] || 0) + 1;
  return acc;
}, {});

console.log(JSON.stringify({ total: rows.length, summary, rows }, null, 2));
