import { DASHBOARD_STATE_DEVICE } from "./chartItems";
import { resolveWidgetDevices } from "../widgetResolver";

export function resolveControlDeviceId(
  widget: Record<string, unknown>,
  aliases: Record<string, unknown>[],
  dashboardContext: Record<string, unknown>,
  selectedDeviceId: string
) {
  const config = (widget.config || {}) as Record<string, unknown>;
  const configured = String(config.deviceId || "").trim();

  const state = {
    selectedDeviceId,
    selectedEntity: { id: selectedDeviceId },
  };

  const resolved = resolveWidgetDevices(
    widget,
    aliases,
    dashboardContext,
    state
  );

  if (configured && configured !== DASHBOARD_STATE_DEVICE) {
    return configured;
  }

  if (resolved.primaryDeviceId) return resolved.primaryDeviceId;
  if (resolved.deviceIds.length) return resolved.deviceIds[0];

  return selectedDeviceId || "";
}
