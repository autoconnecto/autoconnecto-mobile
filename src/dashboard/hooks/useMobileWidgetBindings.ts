import { useMemo } from "react";
import { resolveWidgetConfig } from "../widgetResolver";

export type MobileWidgetBindings = {
  widget: Record<string, unknown>;
  aliases: Record<string, unknown>[];
  dashboardContext: Record<string, unknown>;
  selectedDeviceId: string;
};

export function useMobileWidgetBindings({
  widget,
  aliases,
  dashboardContext,
  selectedDeviceId,
}: MobileWidgetBindings) {
  const config = (widget.config || {}) as Record<string, unknown>;
  const title = String(widget.name || widget.title || widget.type || "Widget");

  const state = useMemo(
    () => ({
      selectedDeviceId,
      selectedEntity: { id: selectedDeviceId },
    }),
    [selectedDeviceId]
  );

  const resolved = useMemo(
    () => resolveWidgetConfig(widget, aliases, dashboardContext, state),
    [widget, aliases, dashboardContext, state]
  );

  return { config, title, state, resolved };
}
