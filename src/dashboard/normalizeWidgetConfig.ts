function asTrimmedString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeText(value: unknown): string {
  return asTrimmedString(value).toLowerCase();
}

function uniqueStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => asTrimmedString(value))
        .filter(Boolean)
    )
  );
}

function getArrayCandidate(config: Record<string, unknown>, key: string): unknown[] {
  return Array.isArray(config?.[key]) ? (config[key] as unknown[]) : [];
}

function collectConfigCollections(config: Record<string, unknown>): unknown[][] {
  return [
    getArrayCandidate(config, "items"),
    getArrayCandidate(config, "series"),
    getArrayCandidate(config, "bars"),
    getArrayCandidate(config, "slices"),
    getArrayCandidate(config, "values"),
    getArrayCandidate(config, "metricsConfig"),
    getArrayCandidate(config, "pairs"),
    getArrayCandidate(config, "channels"),
    getArrayCandidate(config, "controls"),
    getArrayCandidate(config, "actions"),
  ].filter((collection) => collection.length > 0);
}

function collectMetricFromItem(item: Record<string, unknown>): string[] {
  return uniqueStrings([
    item?.key,
    item?.telemetryKey,
    item?.metric,
    item?.metrics,
    item?.field,
    item?.dataKey,
    item?.valueKey,
    item?.targetKey,
    item?.feedbackKey,
    item?.stateKey,
    item?.statusKey,
    item?.name,
    item?.attributeKey,
    item?.attributeName,
    item?.readKey,
    item?.writeKey,
    item?.channel,
    item?.channelKey,
    item?.command,
    item?.method,
    item?.sourceKey,
    item?.topic,
    item?.topicKey,
  ] as unknown[]);
}

function collectDeviceFromItem(item: Record<string, unknown>): string[] {
  return uniqueStrings([
    item?.deviceId,
    item?.sourceDeviceId,
    item?.targetDeviceId,
    item?.entityId,
    item?.device,
  ] as unknown[]);
}

function collectMetricsFromCollections(collections: unknown[][]): string[] {
  return uniqueStrings(
    collections.flatMap((collection) =>
      collection.flatMap((item) =>
        collectMetricFromItem(item as Record<string, unknown>)
      )
    )
  );
}

function collectDevicesFromCollections(collections: unknown[][]): string[] {
  return uniqueStrings(
    collections.flatMap((collection) =>
      collection.flatMap((item) =>
        collectDeviceFromItem(item as Record<string, unknown>)
      )
    )
  );
}

function getAliasId(widget: Record<string, unknown>): string | null {
  const widgetAlias = Array.isArray(widget?.aliases)
    ? widget.aliases[0]
    : null;
  const config = (widget?.config || {}) as Record<string, unknown>;
  const aliasId = asTrimmedString(widgetAlias || config.alias || "");
  return aliasId || null;
}

export const DASHBOARD_STATE_DEVICE = "__dashboardState__";

export type NormalizedWidgetConfig = {
  aliasId: string | null;
  aliasTypeHint: string | null;
  telemetryKeys: string[];
  metric: string | null;
  rawDeviceIds: string[];
  primaryRawDeviceId: string | null;
  usesDashboardStateToken: boolean;
  rawConfig: Record<string, unknown>;
  collections: unknown[][];
};

export function normalizeWidgetConfig(
  widget: Record<string, unknown>
): NormalizedWidgetConfig {
  const config = (widget?.config || {}) as Record<string, unknown>;
  const collections = collectConfigCollections(config);

  const topLevelMetric = asTrimmedString(
    config.metric ||
      config.key ||
      config.telemetryKey ||
      config.field ||
      widget.metric ||
      ""
  );

  const topLevelTelemetryKeys = uniqueStrings([
    ...(Array.isArray(config.telemetryKeys) ? config.telemetryKeys : []),
    ...(Array.isArray(config.metrics) ? config.metrics : []),
    ...(Array.isArray(config.keys) ? config.keys : []),
    ...(topLevelMetric ? [topLevelMetric] : []),
  ] as unknown[]);

  const itemTelemetryKeys = collectMetricsFromCollections(collections);
  const telemetryKeys =
    topLevelTelemetryKeys.length > 0 ? topLevelTelemetryKeys : itemTelemetryKeys;
  const metric = telemetryKeys[0] || null;

  const directDevice = asTrimmedString(
    config.device || config.deviceId || config.entityId || widget.deviceId || ""
  );

  const topLevelDeviceIds = uniqueStrings([
    ...(directDevice ? [directDevice] : []),
    ...(Array.isArray(config.deviceIds) ? config.deviceIds : []),
  ] as unknown[]);

  const itemDeviceIds = collectDevicesFromCollections(collections);
  const rawDeviceIds =
    topLevelDeviceIds.length > 0 ? topLevelDeviceIds : itemDeviceIds;

  const usesDashboardStateToken = rawDeviceIds.some(
    (id) => normalizeText(id) === normalizeText(DASHBOARD_STATE_DEVICE)
  );

  return {
    aliasId: getAliasId(widget),
    aliasTypeHint:
      normalizeText(
        config.aliasType || config.sourceType || config.entitySourceType || ""
      ) || null,
    telemetryKeys,
    metric,
    rawDeviceIds,
    primaryRawDeviceId: rawDeviceIds[0] || null,
    usesDashboardStateToken,
    rawConfig: config,
    collections,
  };
}
