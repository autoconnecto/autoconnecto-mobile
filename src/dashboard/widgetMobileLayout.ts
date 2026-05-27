/**
 * Per-widget mobile visibility and ordering — mirrors frontend widgetMobileLayout.ts.
 */

export type WidgetMobileConfig = {
  show?: boolean;
  order?: number | null;
};

export type LayoutItem = { i: string; x?: number; y?: number; w?: number; h?: number };

export function getWidgetId(widget: Record<string, unknown>): string {
  return String(widget.widgetId || widget.id || "").trim();
}

export function readWidgetMobileConfig(
  widget: Record<string, unknown>
): WidgetMobileConfig {
  const config = widget.config as Record<string, unknown> | undefined;
  const mobile = config?.mobile;
  if (!mobile || typeof mobile !== "object") return {};
  const m = mobile as WidgetMobileConfig;
  return {
    show: m.show,
    order:
      m.order === undefined || m.order === null ? null : Number(m.order),
  };
}

export function isWidgetVisibleOnMobile(widget: Record<string, unknown>): boolean {
  const { show } = readWidgetMobileConfig(widget);
  if (show === undefined) return true;
  return show === true;
}

export function getWidgetMobileOrder(widget: Record<string, unknown>): number | null {
  const { order } = readWidgetMobileConfig(widget);
  if (order === null || order === undefined || !Number.isFinite(order)) {
    return null;
  }
  return order;
}

function compareByDesktopLayout(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  layoutById: Map<string, LayoutItem>
): number {
  const idA = getWidgetId(a);
  const idB = getWidgetId(b);
  const layA = layoutById.get(idA);
  const layB = layoutById.get(idB);
  const yA = layA?.y ?? 9999;
  const yB = layB?.y ?? 9999;
  if (yA !== yB) return yA - yB;
  const xA = layA?.x ?? 0;
  const xB = layB?.x ?? 0;
  if (xA !== xB) return xA - xB;
  return idA.localeCompare(idB);
}

export function sortWidgetsForMobileView(
  widgets: Record<string, unknown>[],
  layout: LayoutItem[] = []
): Record<string, unknown>[] {
  const layoutById = new Map(layout.map((item) => [String(item.i), item]));

  return widgets
    .filter((w) => isWidgetVisibleOnMobile(w))
    .sort((a, b) => {
      const oA = getWidgetMobileOrder(a);
      const oB = getWidgetMobileOrder(b);

      if (oA !== null && oB !== null && oA !== oB) return oA - oB;
      if (oA !== null && oB === null) return -1;
      if (oA === null && oB !== null) return 1;

      return compareByDesktopLayout(a, b, layoutById);
    });
}
