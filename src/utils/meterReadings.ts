import { getDeviceType, type DeviceRow } from "../api/devices";

export const METER_KEYS = [
  "active_power_kw_total",
  "voltage_vln_avg",
  "voltage_l1n",
  "voltage_l2n",
  "voltage_l3n",
  "current_avg",
  "current_l1",
  "current_l2",
  "current_l3",
];

export type MeterReading = {
  powerKw: number | null;
  voltageV: number | null;
  currentA: number | null;
};

export function isEnergyMeter(device: DeviceRow): boolean {
  return getDeviceType(device).toLowerCase() === "energy_meter";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function mean(values: unknown[]): number | null {
  const nums = values
    .map(asNumber)
    .filter((value): value is number => value != null);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export function readingsFromMap(
  values: Record<string, unknown>
): MeterReading {
  return {
    powerKw: asNumber(values.active_power_kw_total),
    voltageV:
      asNumber(values.voltage_vln_avg) ??
      mean([values.voltage_l1n, values.voltage_l2n, values.voltage_l3n]),
    currentA:
      asNumber(values.current_avg) ??
      mean([values.current_l1, values.current_l2, values.current_l3]),
  };
}

export function formatMeterNumber(value: number | null, digits = 1): string {
  if (value == null) return "—";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}
