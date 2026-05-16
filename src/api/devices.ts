import api from "./client";

export type DeviceRow = {
  deviceId?: string;
  device_id?: string;
  name?: string;
  device_name?: string;
  type?: string;
  device_type?: string;
  deviceType?: string;
  status?: string;
  lastActivityTs?: number | null;
  inactivityTimeoutMs?: number;
  profileId?: string;
  assetId?: string;
};

function normalizeDevice(row: Record<string, unknown>): DeviceRow {
  return {
    deviceId: row.deviceId ? String(row.deviceId) : undefined,
    device_id: row.device_id ? String(row.device_id) : undefined,
    name: row.name ? String(row.name) : undefined,
    device_name: row.device_name ? String(row.device_name) : undefined,
    type: row.type ? String(row.type) : undefined,
    device_type: row.device_type ? String(row.device_type) : undefined,
    deviceType: row.deviceType ? String(row.deviceType) : undefined,
    status: row.status ? String(row.status) : undefined,
    lastActivityTs:
      typeof row.lastActivityTs === "number"
        ? row.lastActivityTs
        : typeof row.last_activity_ts === "number"
          ? row.last_activity_ts
          : null,
    inactivityTimeoutMs:
      typeof row.inactivityTimeoutMs === "number"
        ? row.inactivityTimeoutMs
        : typeof row.inactivity_timeout_ms === "number"
          ? row.inactivity_timeout_ms
          : undefined,
    profileId: row.profileId ? String(row.profileId) : undefined,
    assetId: row.assetId ? String(row.assetId) : undefined,
  };
}

export function getDeviceId(device: DeviceRow): string {
  return String(device.deviceId || device.device_id || "").trim();
}

export function getDeviceLabel(device: DeviceRow): string {
  return (
    device.name ||
    device.device_name ||
    getDeviceId(device) ||
    "Unknown device"
  );
}

export function getDeviceType(device: DeviceRow): string {
  return (
    device.deviceType ||
    device.device_type ||
    device.type ||
    "default"
  );
}

function parseDeviceList(data: unknown): DeviceRow[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown[] })?.items)
      ? (data as { items: unknown[] }).items
      : Array.isArray((data as { data?: unknown[] })?.data)
        ? (data as { data: unknown[] }).data
        : [];
  return rows
    .map((row) => normalizeDevice(row as Record<string, unknown>))
    .filter((d) => getDeviceId(d).length > 0);
}

export async function fetchDevices(): Promise<DeviceRow[]> {
  const { data } = await api.get("/devices");
  return parseDeviceList(data);
}

export async function fetchDevice(deviceId: string): Promise<DeviceRow> {
  const { data } = await api.get(`/devices/${deviceId}`);
  return normalizeDevice(
    data && typeof data === "object"
      ? (data as Record<string, unknown>)
      : {}
  );
}

export type TelemetrySnapshot = Record<
  string,
  { value: unknown; ts: number }
>;

export async function fetchLatestTelemetry(
  deviceId: string
): Promise<TelemetrySnapshot> {
  const { data } = await api.get(`/devices/${deviceId}/telemetry/latest`);
  return data && typeof data === "object" ? data : {};
}
