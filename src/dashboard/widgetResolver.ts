import {
  normalizeWidgetConfig,
  DASHBOARD_STATE_DEVICE,
} from "./normalizeWidgetConfig";

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    )
  );
}

function getAliasType(alias: Record<string, unknown>): string {
  const filter = (alias.filter || {}) as Record<string, unknown>;
  return normalizeText(
    alias.type ??
      alias.aliasType ??
      alias.kind ??
      alias.sourceType ??
      filter.type ??
      filter.sourceType
  );
}

function isDashboardStateAliasType(aliasType: string) {
  return (
    aliasType === "dashboardstate" ||
    aliasType === "entityfromdashboardstate" ||
    aliasType === "entity_from_dashboard_state" ||
    aliasType === "dashboard_state"
  );
}

function getDashboardDevices(dashboard: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(dashboard.devices)) {
    return dashboard.devices as Record<string, unknown>[];
  }
  return [];
}

function resolveDashboardStateDeviceId(
  dashboard: Record<string, unknown>,
  state?: Record<string, unknown>
) {
  const selectedEntity = state?.selectedEntity as Record<string, unknown> | undefined;
  const selectedEntityId =
    selectedEntity?.id ||
    state?.selectedDeviceId ||
    dashboard.selectedDeviceId ||
    dashboard.contextDeviceId;

  return selectedEntityId ? String(selectedEntityId).trim() : "";
}

function resolveAliasDeviceIds(
  alias: Record<string, unknown>,
  dashboard: Record<string, unknown>,
  state?: Record<string, unknown>
): string[] {
  const aliasType = getAliasType(alias);
  const filter = (alias.filter || {}) as Record<string, unknown>;

  if (isDashboardStateAliasType(aliasType)) {
    const selectedDeviceId = resolveDashboardStateDeviceId(dashboard, state);
    return selectedDeviceId ? [selectedDeviceId] : [];
  }

  switch (aliasType) {
    case "device": {
      const deviceId = filter.deviceId || filter.id || alias.deviceId;
      return deviceId ? [String(deviceId).trim()] : [];
    }
    case "manualgroup":
    case "manual_group": {
      return uniqueStrings(
        (filter.deviceIds || alias.deviceIds || filter.ids || []) as unknown[]
      );
    }
    case "devicetype":
    case "device_type": {
      const targetType = normalizeText(
        filter.deviceType || filter.type || alias.deviceType
      );
      if (!targetType) return [];
      return uniqueStrings(
        getDashboardDevices(dashboard)
          .filter((d) => {
            const currentType = normalizeText(
              d.deviceType || d.device_type || d.type
            );
            return currentType === targetType;
          })
          .map((d) => d.deviceId || d.device_id || d.id)
      );
    }
    default:
      return [];
  }
}

function resolveSpecialDeviceToken(
  deviceId: string,
  dashboard?: Record<string, unknown>,
  state?: Record<string, unknown>
): string | null {
  if (normalizeText(deviceId) === normalizeText(DASHBOARD_STATE_DEVICE)) {
    const selected = dashboard
      ? resolveDashboardStateDeviceId(dashboard, state)
      : "";
    return selected || null;
  }
  return String(deviceId || "").trim() || null;
}

export type ResolvedWidgetConfig = {
  status: "not_configured" | "waiting_for_entity" | "ready";
  deviceIds: string[];
  primaryDeviceId: string | null;
  metric: string | null;
  metrics: string[];
  aliasId: string | null;
  aliasType: string | null;
  waitingForEntity: boolean;
  reason?: string;
};

export function resolveWidgetConfig(
  widget: Record<string, unknown>,
  aliases: Record<string, unknown>[] = [],
  dashboard?: Record<string, unknown>,
  state?: Record<string, unknown>
): ResolvedWidgetConfig {
  const normalized = normalizeWidgetConfig(widget);
  const aliasId = normalized.aliasId;
  const alias = aliasId
    ? aliases.find((a) => String(a?.id || "") === aliasId)
    : null;
  const aliasType = alias
    ? getAliasType(alias)
    : normalized.aliasTypeHint || null;

  const resolvedDirectDeviceIds = uniqueStrings(
    normalized.rawDeviceIds
      .map((deviceId) =>
        resolveSpecialDeviceToken(deviceId, dashboard, state)
      )
      .filter(Boolean)
  );

  const aliasDeviceIds = alias
    ? resolveAliasDeviceIds(alias, dashboard || {}, state)
    : [];

  const deviceIds = uniqueStrings([
    ...resolvedDirectDeviceIds,
    ...aliasDeviceIds,
  ]);

  const metric = normalized.metric;
  const metrics = normalized.telemetryKeys;
  const hasDashboardStateAlias =
    aliasType !== null && isDashboardStateAliasType(aliasType);
  const waitingForDashboardStateToken =
    normalized.usesDashboardStateToken && resolvedDirectDeviceIds.length === 0;
  const waitingForDashboardStateAlias =
    hasDashboardStateAlias && aliasDeviceIds.length === 0;
  const waitingForEntity =
    waitingForDashboardStateToken || waitingForDashboardStateAlias;
  const hasAnyTelemetryIntent = !!metric || metrics.length > 0;

  if (!hasAnyTelemetryIntent) {
    return {
      status: "not_configured",
      deviceIds: [],
      primaryDeviceId: null,
      metric: null,
      metrics: [],
      aliasId,
      aliasType,
      waitingForEntity: false,
      reason: "Missing telemetry key configuration",
    };
  }

  if (waitingForEntity) {
    return {
      status: "waiting_for_entity",
      deviceIds: [],
      primaryDeviceId: null,
      metric,
      metrics,
      aliasId,
      aliasType,
      waitingForEntity: true,
      reason: "Select a device for this dashboard",
    };
  }

  if (!deviceIds.length) {
    return {
      status: "not_configured",
      deviceIds: [],
      primaryDeviceId: null,
      metric,
      metrics,
      aliasId,
      aliasType,
      waitingForEntity: false,
      reason: "No device resolved for widget",
    };
  }

  return {
    status: "ready",
    deviceIds,
    primaryDeviceId: deviceIds[0] || null,
    metric,
    metrics,
    aliasId,
    aliasType,
    waitingForEntity: false,
  };
}

export function dashboardNeedsDevicePicker(
  widgets: Record<string, unknown>[],
  aliases: Record<string, unknown>[]
): boolean {
  for (const widget of widgets) {
    const resolved = resolveWidgetConfig(widget, aliases, {}, {});
    if (resolved.waitingForEntity) return true;
    const normalized = normalizeWidgetConfig(widget);
    if (normalized.usesDashboardStateToken) return true;
    const aliasId = normalized.aliasId;
    if (!aliasId) continue;
    const alias = aliases.find((a) => String(a.id) === aliasId);
    if (alias && isDashboardStateAliasType(getAliasType(alias))) return true;
  }
  return false;
}
