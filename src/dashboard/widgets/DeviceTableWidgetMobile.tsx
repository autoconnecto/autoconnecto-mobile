import { useMemo } from "react";
import { type DeviceRow } from "../../api/devices";
import { formatValue, isDeviceActive } from "../../utils/format";
import { WidgetShell } from "../components/WidgetShell";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../hooks/useMobileWidgetBindings";

type Props = MobileWidgetBindings & {
  devices: DeviceRow[];
};

export function DeviceTableWidgetMobile({ devices, ...props }: Props) {
  const { config, title } = useMobileWidgetBindings(props);
  const limit = Math.max(1, Math.min(Number(config.limit ?? 10) || 10, 50));
  const statusFilter = String(config.statusFilter || "all").toLowerCase();

  const rows = useMemo(() => {
    let list = devices;
    if (statusFilter === "active") {
      list = list.filter((d) => isDeviceActive(d.status));
    } else if (statusFilter === "inactive") {
      list = list.filter((d) => !isDeviceActive(d.status));
    }
    return list.slice(0, limit);
  }, [devices, limit, statusFilter]);

  return (
    <WidgetShell title={title} hint={`${rows.length} shown`}>
      {rows.length === 0 ? (
        <p className="muted small">No devices</p>
      ) : (
        <ul className="device-table-mobile">
          {rows.map((device) => {
            const id = String(device.deviceId || device.device_id || "");
            const name = String(device.name || id);
            const active = isDeviceActive(device.status);
            return (
              <li key={id} className="device-table-mobile__row">
                <span className="device-table-mobile__name">{name}</span>
                <span
                  className={`badge ${active ? "live" : "severity-default"}`}
                >
                  {formatValue(device.status || (active ? "active" : "offline"))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetShell>
  );
}
