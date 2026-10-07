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
  "heatmap",
]);

export const CONTROL_WIDGET_TYPES = new Set([
  "switch",
  "miniSwitch",
  "toggleButton",
  "sliderControl",
  "gpioControl",
  "attributeControlCard",
  "attributeForm",
  "timeWindowControl",
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
  "dualColorLed",
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

export const ANALYTICS_WIDGET_TYPES = new Set([
  "kpiPeriodSummary",
  "topN",
  "thresholdBreach",
  "alarmOpsAnalytics",
]);

export const COMPOSITE_PANEL_WIDGET_TYPES = new Set([
  "stateTimeline",
  "machineFleetRuntime",
  "factoryFloor",
  "generatorMonitoring",
  "drillingMonitoring",
  "poolWaterQuality",
  "floorPlanZones",
]);

export const METRICS_WIDGET_TYPES = new Set([
  "statusPanel",
  "statusMatrix",
  "motorStatus",
  "pumpStatus",
  "processInstrument",
  "valvePosition",
  "deviceHealth",
  "anomalyInsights",
  "multiDeviceComparison",
  "timeseriesTable",
  "scatterTelemetry",
  "radarTelemetry",
  "ecgStrip",
  "indoorEnvironment",
  "mimicOverlay",
  "assetAdminTable",
]);

export const PANEL_WIDGET_TYPES = new Set([
  "markdownPanel",
  "htmlPanel",
  "imagePanel",
  "codeWidget",
  "navigationButton",
  "videoPanel",
  "hierarchyTree",
]);

export const MAP_WIDGET_TYPES = new Set(["map", "routeMap", "markerPlacement"]);

export const DEVICE_DATA_TYPES = new Set(["deviceDataCard"]);

export function mapChartType(type: string): string {
  if (type === "dualAxisChart" || type === "rangeChart") return "multitimeseries";
  return type;
}
