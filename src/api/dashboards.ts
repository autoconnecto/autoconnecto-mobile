import api from "./client";

export type DashboardSummary = {
  id: string;
  name: string;
  type?: string;
  updatedAt?: string;
};

export type DashboardDetail = {
  id: string;
  name: string;
  states?: { id: string; name: string }[];
  layout?: { i: string; x: number; y: number; w: number; h: number }[];
  widgets?: Record<string, unknown>[];
  aliases?: Record<string, unknown>[];
  timeWindow?: { from?: number; to?: number };
};

function getDashboardId(row: Record<string, unknown>): string {
  return String(row.id ?? row.dashboardId ?? "").trim();
}

export async function fetchDashboards(): Promise<DashboardSummary[]> {
  const { data } = await api.get("/dashboards");
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: getDashboardId(r),
        name: String(r.name ?? "Dashboard"),
        type: r.type ? String(r.type) : undefined,
        updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
      };
    })
    .filter((d) => d.id.length > 0);
}

export async function fetchDashboard(id: string): Promise<DashboardDetail> {
  const { data } = await api.get(`/dashboards/${id}`);
  const row = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  return {
    id: getDashboardId(row) || id,
    name: String(row.name ?? "Dashboard"),
    states: Array.isArray(row.states)
      ? (row.states as { id: string; name: string }[])
      : [{ id: "default", name: "Default" }],
    layout: Array.isArray(row.layout)
      ? (row.layout as DashboardDetail["layout"])
      : [],
    widgets: Array.isArray(row.widgets)
      ? (row.widgets as Record<string, unknown>[])
      : [],
    aliases: Array.isArray(row.aliases)
      ? (row.aliases as Record<string, unknown>[])
      : [],
    timeWindow: row.timeWindow as DashboardDetail["timeWindow"],
  };
}

export async function resolveDashboardAlias(
  alias: Record<string, unknown>,
  dashboardState?: Record<string, unknown>
): Promise<string[]> {
  const { data } = await api.post("/dashboards/resolve-alias", {
    alias,
    dashboardState,
  });
  const devices = Array.isArray(data?.devices) ? data.devices : [];
  return devices
    .map((d: Record<string, unknown>) =>
      String(d.deviceId ?? d.device_id ?? d.id ?? "").trim()
    )
    .filter(Boolean);
}
