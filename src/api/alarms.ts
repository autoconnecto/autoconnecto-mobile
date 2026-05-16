import api from "./client";

export type AlarmRow = {
  alarm_id: string;
  device_id?: string;
  device_name?: string;
  rule_name?: string;
  severity?: string;
  status?: string;
  acknowledged?: boolean;
  startTs?: number | null;
  updatedTs?: number | null;
  triggerKey?: string | null;
  triggerValue?: unknown;
};

export async function fetchAlarms(): Promise<AlarmRow[]> {
  const { data } = await api.get("/alarms");
  return Array.isArray(data) ? data : [];
}

export async function ackAlarm(alarmId: string) {
  const { data } = await api.patch(`/alarms/${alarmId}/ack`);
  return data;
}

export async function clearAlarm(alarmId: string) {
  const { data } = await api.patch(`/alarms/${alarmId}/clear`);
  return data;
}
