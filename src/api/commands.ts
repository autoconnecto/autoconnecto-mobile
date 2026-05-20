import api from "./client";

export type DeviceCommandPayload = {
  type?: "set_channel_state" | "set_numeric_value";
  channel?: number;
  state?: number;
  key?: string;
  value?: unknown;
  method?: string;
  params?: unknown;
  requestId?: string;
  retries?: number;
  retryIntervalMs?: number;
};

export type DeviceCommandResult = {
  success: boolean;
  message?: string;
  transport?: string;
  requestId?: string | null;
};

export async function sendDeviceCommand(
  deviceId: string,
  payload: DeviceCommandPayload
): Promise<DeviceCommandResult> {
  const { data } = await api.post(`/devices/${deviceId}/commands`, payload);
  return data as DeviceCommandResult;
}
