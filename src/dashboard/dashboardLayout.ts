import type { DashboardDetail } from "../api/dashboards";
import { getWidgetId, sortWidgetsForMobileView } from "./widgetMobileLayout";

export type WidgetRow = {
  widget: Record<string, unknown>;
  layoutH: number;
};

export function getWidgetsForState(
  dashboard: DashboardDetail,
  stateId = "default"
): WidgetRow[] {
  const widgets = dashboard.widgets || [];
  const layout = dashboard.layout || [];
  const layoutById = new Map(
    layout.map((item) => [String(item.i), item])
  );

  const filtered = widgets.filter((w) => {
    const widgetState = String(
      (w as Record<string, unknown>).dashboardStateId || "default"
    );
    return widgetState === stateId;
  }) as Record<string, unknown>[];

  const ordered = sortWidgetsForMobileView(
    filtered,
    layout.map((item) => ({
      i: String(item.i),
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
    }))
  );

  return ordered.map((widget) => {
    const id = getWidgetId(widget);
    const layoutItem = layoutById.get(id);
    return {
      widget,
      layoutH: layoutItem?.h ?? Number(widget.h) ?? 4,
    };
  });
}
