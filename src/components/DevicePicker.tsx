import {
  fetchDevices,
  getDeviceId,
  getDeviceLabel,
  type DeviceRow,
} from "../api/devices";

type Props = {
  value: string;
  onChange: (deviceId: string) => void;
  devices: DeviceRow[];
  loading?: boolean;
};

export function DevicePicker({ value, onChange, devices, loading }: Props) {
  return (
    <label className="field">
      <span className="field-label">Device</span>
      <select
        className="select"
        value={value}
        disabled={loading || devices.length === 0}
        onChange={(e) => onChange(e.target.value)}
      >
        {devices.length === 0 ? (
          <option value="">No devices</option>
        ) : (
          devices.map((d) => {
            const id = getDeviceId(d);
            return (
              <option key={id} value={id}>
                {getDeviceLabel(d)}
              </option>
            );
          })
        )}
      </select>
    </label>
  );
}

export async function loadDeviceList(): Promise<DeviceRow[]> {
  const list = await fetchDevices();
  return list.filter((d) => getDeviceId(d).length > 0);
}
