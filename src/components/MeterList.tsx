import { useEffect, useMemo, useState } from "react";
import {
  fetchLatestForDevices,
  getDeviceId,
  getDeviceLabel,
  type DeviceRow,
} from "../api/devices";
import type { AlarmRow } from "../api/alarms";
import { telemetryStore } from "../realtime/telemetry.store";
import {
  formatMeterNumber,
  isEnergyMeter,
  METER_KEYS,
  readingsFromMap,
} from "../utils/meterReadings";

type Props = {
  devices: DeviceRow[];
  alarms: AlarmRow[];
  onOpenDevice: (deviceId: string) => void;
};

export function MeterList({ devices, alarms, onOpenDevice }: Props) {
  const meters = useMemo(
    () => devices.filter((device) => isEnergyMeter(device)).slice(0, 20),
    [devices]
  );
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>(
    {}
  );

  const meterIds = useMemo(
    () => meters.map((device) => getDeviceId(device)).filter(Boolean),
    [meters]
  );

  useEffect(() => {
    if (!meterIds.length) return;
    let cancelled = false;
    fetchLatestForDevices(meterIds, METER_KEYS)
      .then((items) => {
        if (cancelled) return;
        const next: Record<string, Record<string, unknown>> = {};
        for (const item of items) {
          if (!item.deviceId || !item.key) continue;
          next[item.deviceId] = next[item.deviceId] || {};
          next[item.deviceId][item.key] = item.value;
        }
        setValues(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [meterIds]);

  useEffect(() => {
    if (!meterIds.length) return;
    const stops = meterIds.map((deviceId) =>
      telemetryStore.subscribeToDevice(deviceId, (point) => {
        if (!METER_KEYS.includes(point.key)) return;
        setValues((prev) => ({
          ...prev,
          [deviceId]: {
            ...(prev[deviceId] || {}),
            [point.key]: point.value,
          },
        }));
      })
    );
    return () => {
      for (const stop of stops) stop();
    };
  }, [meterIds]);

  if (!meters.length) return null;

  return (
    <section className="section">
      <div className="section-head">
        <h2 className="section-title">Meters</h2>
      </div>
      <ul className="list-rows">
        {meters.map((device) => {
          const id = getDeviceId(device);
          const reading = readingsFromMap(values[id] || {});
          const alarm = alarms.find(
            (row) =>
              row.device_id === id &&
              String(row.status || "").toUpperCase() === "ACTIVE"
          );
          return (
            <li key={id}>
              <button
                type="button"
                className="list-row meter-row"
                onClick={() => onOpenDevice(id)}
              >
                <span className="list-row-body">
                  <span className="list-row-title">{getDeviceLabel(device)}</span>
                  <span className="meter-figures">
                    <span>{formatMeterNumber(reading.powerKw)} kW</span>
                    <span>{formatMeterNumber(reading.voltageV, 0)} V</span>
                    <span>{formatMeterNumber(reading.currentA)} A</span>
                  </span>
                  {alarm ? (
                    <span className="meter-alarm">
                      {[alarm.severity, alarm.rule_name || alarm.triggerKey]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  ) : (
                    <span className="list-row-meta">No open alarm</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
