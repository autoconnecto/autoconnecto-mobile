/**
 * Ensures every frontend registry widget type has native mobile routing coverage.
 * Run from autoconnecto-mobile/: npm run audit:widgets
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mobileRoot, "..");

const registryPath = path.join(
  repoRoot,
  "frontend/src/features/dashboards/registry/widgetRegistry.ts"
);
const routesPath = path.join(mobileRoot, "src/dashboard/widgetRoutes.ts");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function extractRegistryTypes(registrySrc) {
  const types = new Set();
  const manualBlock = registrySrc.match(/const manualRegistry[\s\S]*?^};/m)?.[0];
  if (manualBlock) {
    for (const m of manualBlock.matchAll(/^\s+([a-zA-Z0-9_]+):\s+withMeta/gm)) {
      types.add(m[1]);
    }
    for (const m of manualBlock.matchAll(
      /^\s+([a-zA-Z0-9_]+):\s*\{\s*\n\s+type:\s*"([^"]+)"/gm
    )) {
      types.add(m[2]);
    }
  }
  const widgetsDir = path.join(
    repoRoot,
    "frontend/src/features/dashboards/widgets"
  );
  if (fs.existsSync(widgetsDir)) {
    for (const file of fs.readdirSync(widgetsDir)) {
      if (!file.endsWith(".tsx")) continue;
      const src = read(path.join(widgetsDir, file));
      const typeMatch = src.match(/widgetDefinition[\s\S]*?\btype:\s*"([^"]+)"/);
      if (typeMatch) types.add(typeMatch[1]);
    }
  }
  return [...types].sort();
}

function extractSet(content, name) {
  const re = new RegExp(
    `export const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`
  );
  const m = content.match(re);
  if (!m) return new Set();
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}

const registry = read(registryPath);
const routes = read(routesPath);
const types = extractRegistryTypes(registry);

const CHART = extractSet(routes, "CHART_WIDGET_TYPES");
const CONTROL = extractSet(routes, "CONTROL_WIDGET_TYPES");
const GAUGE = extractSet(routes, "GAUGE_WIDGET_TYPES");
const ALARM = extractSet(routes, "ALARM_WIDGET_TYPES");
const METRICS = extractSet(routes, "METRICS_WIDGET_TYPES");
const PANEL = extractSet(routes, "PANEL_WIDGET_TYPES");
const MAP = extractSet(routes, "MAP_WIDGET_TYPES");
const DEVICE_DATA = extractSet(routes, "DEVICE_DATA_TYPES");

const SPECIAL = new Set(["deviceCount", "deviceTable"]);

function bucket(type) {
  if (SPECIAL.has(type)) return "special";
  if (CONTROL.has(type)) return "control";
  if (CHART.has(type)) return "chart";
  if (GAUGE.has(type)) return "gauge";
  if (ALARM.has(type)) return "alarm";
  if (MAP.has(type)) return "map";
  if (PANEL.has(type)) return "panel";
  if (DEVICE_DATA.has(type)) return "device-data";
  if (METRICS.has(type)) return "metrics";
  return null;
}

const rows = types.map((type) => ({ type, bucket: bucket(type) }));
const missing = rows.filter((r) => !r.bucket);
const summary = rows.reduce((acc, row) => {
  const key = row.bucket || "UNROUTED";
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const json = process.argv.includes("--json");
const report = { total: rows.length, summary, missing: missing.map((m) => m.type), rows };

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Native mobile widget routing audit\n");
  console.log(`Types: ${report.total}`);
  console.log("Buckets:", summary);
  if (missing.length) {
    console.log("\nUNROUTED (add to widgetRoutes.ts):");
    for (const row of missing) console.log(`  - ${row.type}`);
    process.exit(1);
  }
  console.log("\nOK — every registry type has a mobile handler bucket.");
}

if (!json && missing.length) process.exit(1);
