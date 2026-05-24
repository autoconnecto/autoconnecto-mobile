/** Widget type routing for the mobile dashboard renderer. */

export const CHART_WIDGET_TYPES = new Set([
  "timeseries",
  "multitimeseries",
  "barChart",
  "pieChart",
  "doughnut",
  "sparkline",
  "dualAxisChart",
  "rangeChart",
  "stateTimeline",
]);

export const CONTROL_WIDGET_TYPES = new Set([
  "switch",
  "miniSwitch",
  "toggleButton",
  "sliderControl",
  "gpioControl",
  "attributeControlCard",
  "rpc",
]);

export const GAUGE_WIDGET_TYPES = new Set([
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
  "gpioStatus",
]);

export const ALARM_WIDGET_TYPES = new Set([
  "alarm",
  "deviceAlarm",
  "alarmSummary",
]);

export const METRICS_WIDGET_TYPES = new Set([
  "statusPanel",
  "statusMatrix",
  "motorStatus",
  "pumpStatus",
  "processInstrument",
  "valvePosition",
  "deviceHealth",
  "thresholdBreach",
  "anomalyInsights",
  "multiDeviceComparison",
  "topN",
  "timeseriesTable",
  "scatterTelemetry",
  "radarTelemetry",
  "ecgStrip",
  "indoorEnvironment",
  "mimicOverlay",
  "assetAdminTable",
  "generatorMonitoring",
]);

export const PANEL_WIDGET_TYPES = new Set([
  "markdownPanel",
  "imagePanel",
  "codeWidget",
  "navigationButton",
]);

export const MAP_WIDGET_TYPES = new Set(["map", "routeMap", "markerPlacement"]);

export const DEVICE_DATA_TYPES = new Set(["deviceDataCard"]);

export function mapChartType(type: string): string {
  if (type === "dualAxisChart" || type === "rangeChart") return "multitimeseries";
  if (type === "stateTimeline") return "timeseries";
  return type;
}
