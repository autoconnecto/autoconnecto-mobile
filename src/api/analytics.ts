import api from "./client";

export async function fetchKpiSummary(payload: {
  deviceIds: string[];
  key: string;
  from: number;
  to: number;
  combineDevices?: boolean;
}) {
  const res = await api.post("/analytics/kpi-summary", payload);
  return res.data;
}

export async function fetchTopN(payload: {
  deviceIds: string[];
  key: string;
  from: number;
  to: number;
  aggregation?: string;
  limit?: number;
  order?: string;
}) {
  const res = await api.post("/analytics/top-n", payload);
  return res.data;
}

export async function fetchThresholdBreach(payload: {
  deviceIds: string[];
  key: string;
  from: number;
  to: number;
  above?: number;
  below?: number;
}) {
  const res = await api.post("/analytics/threshold-breach", payload);
  return res.data;
}

export async function fetchAlarmOpsSummary(payload: {
  deviceType?: string;
  from: number;
  to: number;
}) {
  const res = await api.post("/analytics/alarm-ops-summary", payload);
  return res.data;
}
