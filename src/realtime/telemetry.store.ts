import { getSocket } from "./socket";
import { retainDeviceRoom } from "./deviceRoom";

export type LiveTelemetryPoint = {
  deviceId: string;
  key: string;
  value: unknown;
  ts: number;
};

type Listener = (point: LiveTelemetryPoint) => void;

function normalizeTs(candidateTs: unknown): number {
  return typeof candidateTs === "number" && Number.isFinite(candidateTs)
    ? candidateTs
    : Date.now();
}

function normalizeTelemetryMessage(msg: unknown): LiveTelemetryPoint[] {
  const payload = msg as {
    deviceId?: string;
    data?: unknown;
  };
  const deviceId = payload?.deviceId;
  const data = payload?.data;
  if (!deviceId || data == null) return [];

  if (Array.isArray(data)) {
    const output: LiveTelemetryPoint[] = [];
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (row.key !== undefined) {
        output.push({
          deviceId,
          key: String(row.key),
          value: row.value,
          ts: normalizeTs(row.ts),
        });
        continue;
      }
      const ts = normalizeTs(row.ts ?? row.timestamp);
      for (const [key, value] of Object.entries(row)) {
        if (key === "ts" || key === "timestamp") continue;
        output.push({ deviceId, key, value, ts });
      }
    }
    return output;
  }

  if (typeof data === "object" && data !== null) {
    const row = data as Record<string, unknown>;
    if (row.key !== undefined) {
      return [
        {
          deviceId,
          key: String(row.key),
          value: row.value,
          ts: normalizeTs(row.ts ?? row.timestamp),
        },
      ];
    }
    const ts = normalizeTs(row.ts ?? row.timestamp);
    const output: LiveTelemetryPoint[] = [];
    for (const [key, value] of Object.entries(row)) {
      if (key === "ts" || key === "timestamp") continue;
      output.push({ deviceId, key, value, ts });
    }
    return output;
  }

  return [];
}

class TelemetryStore {
  private initialized = false;
  private deviceListeners = new Map<string, Set<Listener>>();
  private globalListeners = new Set<Listener>();

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    const socket = getSocket();
    const handleMessage = (msg: unknown) => {
      for (const point of normalizeTelemetryMessage(msg)) {
        for (const listener of this.globalListeners) {
          listener(point);
        }
        const scoped = this.deviceListeners.get(point.deviceId);
        if (scoped) {
          for (const listener of scoped) {
            listener(point);
          }
        }
      }
    };

    socket.on("telemetry_update", handleMessage);
    socket.on("telemetry_update_global", handleMessage);
  }

  subscribeToDevice(deviceId: string, listener: Listener) {
    this.ensureInitialized();
    if (!deviceId) return () => {};

    let listeners = this.deviceListeners.get(deviceId);
    if (!listeners) {
      listeners = new Set();
      this.deviceListeners.set(deviceId, listeners);
    }
    listeners.add(listener);
    const releaseRoom = retainDeviceRoom(deviceId);

    return () => {
      const set = this.deviceListeners.get(deviceId);
      set?.delete(listener);
      if (set && set.size === 0) {
        this.deviceListeners.delete(deviceId);
      }
      releaseRoom();
    };
  }

  subscribeToAll(listener: Listener) {
    this.ensureInitialized();
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }
}

export const telemetryStore = new TelemetryStore();
