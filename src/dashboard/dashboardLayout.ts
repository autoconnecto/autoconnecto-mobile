import type { DashboardDetail } from "../api/dashboards";

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
  });

  const rows: WidgetRow[] = filtered.map((widget) => {
    const w = widget as Record<string, unknown>;
    const id = String(w.widgetId || w.id || "");
    const layoutItem = layoutById.get(id);
    return {
      widget: w,
      layoutH: layoutItem?.h ?? Number(w.h) ?? 4,
    };
  });

  rows.sort((a, b) => {
    const idA = String(a.widget.widgetId || a.widget.id || "");
    const idB = String(b.widget.widgetId || b.widget.id || "");
    const layA = layoutById.get(idA);
    const layB = layoutById.get(idB);
    const yA = layA?.y ?? 9999;
    const yB = layB?.y ?? 9999;
    if (yA !== yB) return yA - yB;
    return (layA?.x ?? 0) - (layB?.x ?? 0);
  });

  return rows;
}
