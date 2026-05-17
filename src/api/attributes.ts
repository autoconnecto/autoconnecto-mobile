import api from "./client";

export type AttributeScope = "SHARED" | "CLIENT" | "SERVER";

export type DeviceAttribute = {
  key: string;
  value: unknown;
  scope: AttributeScope | string;
  updatedTs?: number;
};

export async function fetchDeviceAttributes(
  deviceId: string
): Promise<DeviceAttribute[]> {
  const { data } = await api.get(`/devices/${deviceId}/attributes`);
  if (!Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => ({
    key: String(row.key ?? ""),
    value: row.value,
    scope: String(row.scope ?? "CLIENT").toUpperCase(),
    updatedTs:
      typeof row.updatedTs === "number"
        ? row.updatedTs
        : typeof row.updated_ts === "number"
          ? row.updated_ts
          : undefined,
  }));
}

export async function saveDeviceAttributes(
  deviceId: string,
  scope: AttributeScope,
  attributes: Record<string, unknown>
) {
  const { data } = await api.post(`/devices/${deviceId}/attributes`, {
    scope,
    attributes,
  });
  return data;
}
