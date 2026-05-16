import api from "./client";

export type DeviceRow = {
  deviceId?: string;
  device_id?: string;
  name?: string;
  device_name?: string;
  type?: string;
  device_type?: string;
};

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

export async function fetchDevices(): Promise<DeviceRow[]> {
  const { data } = await api.get("/devices");
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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
