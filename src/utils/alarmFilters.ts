import type { AlarmRow } from "../api/alarms";

export type AlarmSeverityFilter = "all" | "critical" | "major" | "minor";
export type AlarmStatusFilter = "active" | "all" | "cleared";

export type AlarmListFilters = {
  severity: AlarmSeverityFilter;
  status: AlarmStatusFilter;
  deviceId?: string;
};

export function filterAlarms(
  alarms: AlarmRow[],
  filters: AlarmListFilters
): AlarmRow[] {
  let rows = [...alarms];

  if (filters.deviceId) {
    const id = filters.deviceId;
    rows = rows.filter((a) => (a.device_id || "") === id);
  }

  if (filters.status === "active") {
    rows = rows.filter(
      (a) => String(a.status || "").toUpperCase() !== "CLEARED"
    );
  } else if (filters.status === "cleared") {
    rows = rows.filter(
      (a) => String(a.status || "").toUpperCase() === "CLEARED"
    );
  }

  if (filters.severity !== "all") {
    const want = filters.severity.toUpperCase();
    rows = rows.filter(
      (a) => String(a.severity || "").toUpperCase() === want
    );
  }

  rows.sort((a, b) => Number(b.startTs || 0) - Number(a.startTs || 0));
  return rows;
}

export function countActiveAlarms(alarms: AlarmRow[]) {
  const active = alarms.filter(
    (a) => String(a.status || "").toUpperCase() !== "CLEARED"
  );
  const critical = active.filter(
    (a) => String(a.severity || "").toUpperCase() === "CRITICAL"
  ).length;
  const major = active.filter(
    (a) => String(a.severity || "").toUpperCase() === "MAJOR"
  ).length;
  return { active: active.length, critical, major };
}
