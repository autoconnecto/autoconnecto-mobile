import { useMemo, useState } from "react";
import {
  getDeviceId,
  getDeviceLabel,
  getDeviceType,
  type DeviceRow,
} from "../api/devices";
import { formatTs, isDeviceActive } from "../utils/format";

type Props = {
  devices: DeviceRow[];
  loading: boolean;
  onSelectDevice: (deviceId: string) => void;
};

export function DevicesListScreen({
  devices,
  loading,
  onSelectDevice,
}: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return devices
      .filter((d) => {
        if (statusFilter === "active" && !isDeviceActive(d.status)) {
          return false;
        }
        if (statusFilter === "inactive" && isDeviceActive(d.status)) {
          return false;
        }
        if (!q) return true;
        const id = getDeviceId(d).toLowerCase();
        const label = getDeviceLabel(d).toLowerCase();
        const type = getDeviceType(d).toLowerCase();
        return id.includes(q) || label.includes(q) || type.includes(q);
      })
      .sort((a, b) => getDeviceLabel(a).localeCompare(getDeviceLabel(b)));
  }, [devices, query, statusFilter]);

  return (
    <div className="screen tab-screen">
      <label className="field">
        <span className="field-label">Search</span>
        <input
          className="input"
          type="search"
          placeholder="Name, ID, or type"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="chip-row">
        {(["all", "active", "inactive"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={`chip ${statusFilter === key ? "active" : ""}`}
            onClick={() => setStatusFilter(key)}
          >
            {key === "all" ? "All" : key === "active" ? "Active" : "Inactive"}
          </button>
        ))}
      </div>

      {loading ? <p className="muted center">Loading devices…</p> : null}
      {!loading && filtered.length === 0 ? (
        <p className="muted center">No devices match your filters.</p>
      ) : null}

      <ul className="list-rows">
        {filtered.map((device) => {
          const id = getDeviceId(device);
          const active = isDeviceActive(device.status);
          return (
            <li key={id}>
              <button
                type="button"
                className="list-row"
                onClick={() => onSelectDevice(id)}
              >
                <span
                  className={`status-dot ${active ? "online" : "offline"}`}
                  aria-hidden
                />
                <span className="list-row-body">
                  <span className="list-row-title">{getDeviceLabel(device)}</span>
                  <span className="list-row-meta">
                    {getDeviceType(device)} · {device.status || "unknown"}
                  </span>
                  {device.lastActivityTs ? (
                    <span className="list-row-meta">
                      Last activity {formatTs(device.lastActivityTs)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
