import { fetchDeviceAttributes, type DeviceAttribute } from "../api/attributes";
import { getSocket } from "./socket";

type Listener = () => void;

function normalizeScope(scope: unknown): string {
  return String(scope || "").toUpperCase();
}

function attributeKey(scope: string, key: string) {
  return `${normalizeScope(scope)}::${key}`;
}

function parseAttributeEvent(payload: unknown): {
  deviceId: string;
  scope: string;
  key: string;
  value: unknown;
  deleted?: boolean;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const deviceId = String(row.deviceId || "").trim();
  if (!deviceId) return null;

  const scope = normalizeScope(row.scope || "CLIENT");
  const deleted = row.deleted === true;

  if (row.key !== undefined && row.key !== null) {
    return {
      deviceId,
      scope,
      key: String(row.key),
      value: row.value,
      deleted,
    };
  }

  const data = row.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 1) {
      const [key, value] = entries[0];
      return { deviceId, scope, key, value, deleted };
    }
  }

  return null;
}

class AttributeStore {
  private initialized = false;
  private deviceRefCounts = new Map<string, number>();
  private attributesByDevice = new Map<string, Map<string, DeviceAttribute>>();
  private listenersByDevice = new Map<string, Set<Listener>>();

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    const socket = getSocket();

    const handleUpdate = (payload: unknown) => {
      const parsed = parseAttributeEvent(payload);
      if (!parsed || parsed.deleted) {
        if (parsed?.deleted) {
          this.removeAttribute(parsed.deviceId, parsed.scope, parsed.key);
        }
        return;
      }
      this.upsertAttribute(parsed.deviceId, {
        key: parsed.key,
        value: parsed.value,
        scope: parsed.scope,
        updatedTs: Date.now(),
      });
    };

    socket.on("attribute_update", handleUpdate);
    socket.on("attribute_update_global", handleUpdate);
    socket.on("shared_attribute_update", handleUpdate);

    socket.on("connect", () => {
      for (const [deviceId, count] of this.deviceRefCounts.entries()) {
        if (count > 0) {
          socket.emit("subscribe_device", { deviceId });
        }
      }
    });
  }

  private getDeviceMap(deviceId: string) {
    let map = this.attributesByDevice.get(deviceId);
    if (!map) {
      map = new Map();
      this.attributesByDevice.set(deviceId, map);
    }
    return map;
  }

  private notify(deviceId: string) {
    const listeners = this.listenersByDevice.get(deviceId);
    if (!listeners) return;
    for (const listener of listeners) {
      listener();
    }
  }

  private upsertAttribute(deviceId: string, attribute: DeviceAttribute) {
    const map = this.getDeviceMap(deviceId);
    map.set(attributeKey(attribute.scope, attribute.key), attribute);
    this.notify(deviceId);
  }

  private removeAttribute(deviceId: string, scope: string, key: string) {
    const map = this.attributesByDevice.get(deviceId);
    if (!map) return;
    map.delete(attributeKey(scope, key));
    this.notify(deviceId);
  }

  private async loadDevice(deviceId: string) {
    const rows = await fetchDeviceAttributes(deviceId);
    const map = new Map<string, DeviceAttribute>();
    for (const row of rows) {
      if (!row.key) continue;
      map.set(attributeKey(row.scope, row.key), row);
    }
    this.attributesByDevice.set(deviceId, map);
    this.notify(deviceId);
  }

  subscribe(deviceId: string, listener: Listener) {
    this.ensureInitialized();
    if (!deviceId) return () => {};

    let listeners = this.listenersByDevice.get(deviceId);
    if (!listeners) {
      listeners = new Set();
      this.listenersByDevice.set(deviceId, listeners);
    }
    listeners.add(listener);

    const current = this.deviceRefCounts.get(deviceId) ?? 0;
    this.deviceRefCounts.set(deviceId, current + 1);

    if (current === 0) {
      getSocket().emit("subscribe_device", { deviceId });
      this.loadDevice(deviceId).catch(() => {
        this.notify(deviceId);
      });
    } else {
      listener();
    }

    return () => {
      const set = this.listenersByDevice.get(deviceId);
      set?.delete(listener);
      if (set && set.size === 0) {
        this.listenersByDevice.delete(deviceId);
      }

      const next = (this.deviceRefCounts.get(deviceId) ?? 1) - 1;
      if (next <= 0) {
        this.deviceRefCounts.delete(deviceId);
        this.attributesByDevice.delete(deviceId);
        getSocket().emit("unsubscribe_device", { deviceId });
      } else {
        this.deviceRefCounts.set(deviceId, next);
      }
    };
  }

  getAttributes(deviceId: string): DeviceAttribute[] {
    const map = this.attributesByDevice.get(deviceId);
    if (!map) return [];
    return Array.from(map.values());
  }

  getValue(deviceId: string, key: string, preferredScopes: string[] = ["CLIENT", "SHARED"]) {
    const map = this.attributesByDevice.get(deviceId);
    if (!map) return undefined;

    for (const scope of preferredScopes) {
      const found = map.get(attributeKey(scope, key));
      if (found) return found.value;
    }

    const normalizedKey = key.toLowerCase();
    for (const attr of map.values()) {
      if (attr.key.toLowerCase() === normalizedKey) {
        return attr.value;
      }
    }

    return undefined;
  }
}

export const attributeStore = new AttributeStore();

export function isTruthyAttributeValue(value: unknown): boolean {
  return (
    value === 1 ||
    value === true ||
    value === "1" ||
    value === "true" ||
    value === "TRUE" ||
    value === "on" ||
    value === "ON"
  );
}
