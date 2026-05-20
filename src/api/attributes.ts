import api from "./client";

export type AttributeScope = "SHARED" | "CLIENT" | "SERVER";

export type DeviceAttribute = {
  key: string;
  value: unknown;
  scope: AttributeScope | string;
  updatedTs?: number;
};

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const err = error as {
    response?: { data?: { message?: string | string[] } };
    message?: string;
  };
  const raw = err.response?.data?.message;
  if (Array.isArray(raw) && raw.length) return String(raw[0]);
  if (typeof raw === "string" && raw.trim()) return raw;
  if (err.message && !err.message.startsWith("API error")) return err.message;
  return fallback;
}

export async function fetchDeviceAttributes(
  deviceId: string
): Promise<DeviceAttribute[]> {
  const encodedId = encodeURIComponent(deviceId);
  const { data } = await api.get(`/devices/${encodedId}/attributes`);
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
  const encodedId = encodeURIComponent(deviceId);
  try {
    const { data } = await api.post(`/devices/${encodedId}/attributes`, {
      scope: String(scope).toUpperCase(),
      attributes,
    });
    return data;
  } catch (error) {
    throw new Error(
      apiErrorMessage(error, "Failed to save device attributes")
    );
  }
}
