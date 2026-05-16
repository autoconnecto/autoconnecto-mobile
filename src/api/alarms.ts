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

function normalizeAlarm(row: Record<string, unknown>): AlarmRow {
  return {
    alarm_id: String(row.alarm_id ?? row.alarmId ?? row.id ?? ""),
    device_id: row.device_id ? String(row.device_id) : undefined,
    device_name: row.device_name ? String(row.device_name) : undefined,
    rule_name: row.rule_name ? String(row.rule_name) : undefined,
    severity: row.severity ? String(row.severity) : undefined,
    status: row.status ? String(row.status) : undefined,
    acknowledged: Boolean(row.acknowledged),
    startTs:
      typeof row.start_ts === "number"
        ? row.start_ts
        : typeof row.startTs === "number"
          ? row.startTs
          : null,
    updatedTs:
      typeof row.last_update_ts === "number"
        ? row.last_update_ts
        : typeof row.updatedTs === "number"
          ? row.updatedTs
          : null,
    triggerKey:
      row.trigger_key != null
        ? String(row.trigger_key)
        : row.triggerKey != null
          ? String(row.triggerKey)
          : null,
    triggerValue: row.trigger_value ?? row.triggerValue,
  };
}

function parseAlarmList(data: unknown): AlarmRow[] {
  const rows = Array.isArray(data)
    ? data
    : Array.isArray((data as { items?: unknown[] })?.items)
      ? (data as { items: unknown[] }).items
      : [];
  return rows
    .map((row) => normalizeAlarm(row as Record<string, unknown>))
    .filter((row) => row.alarm_id.length > 0);
}

export async function fetchAlarms(): Promise<AlarmRow[]> {
  const { data } = await api.get("/alarms");
  return parseAlarmList(data);
}

export async function fetchAlarmsForDevice(
  deviceId: string
): Promise<AlarmRow[]> {
  const { data } = await api.get(`/alarms/device/${deviceId}`);
  return parseAlarmList(data);
}

export async function ackAlarm(alarmId: string) {
  const { data } = await api.patch(`/alarms/${alarmId}/ack`);
  return data;
}

export async function clearAlarm(alarmId: string) {
  const { data } = await api.patch(`/alarms/${alarmId}/clear`);
  return data;
}
