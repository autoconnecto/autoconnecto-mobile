import { getSocket } from "./socket";

/**
 * Shared ref-count for Socket.IO `device:{id}` rooms.
 * Alarms, telemetry, and attributes all retain through this so leaving
 * one screen cannot drop a room another screen still needs.
 */
const refCounts = new Map<string, number>();
let reconnectHooked = false;

function ensureReconnect() {
  if (reconnectHooked) return;
  reconnectHooked = true;
  const socket = getSocket();
  socket.on("connect", () => {
    for (const [deviceId, count] of refCounts.entries()) {
      if (count > 0) {
        socket.emit("subscribe_device", { deviceId });
      }
    }
  });
}

export function retainDeviceRoom(deviceId: string): () => void {
  const id = String(deviceId || "").trim();
  if (!id) return () => {};

  ensureReconnect();
  const current = refCounts.get(id) ?? 0;
  refCounts.set(id, current + 1);
  if (current === 0) {
    getSocket().emit("subscribe_device", { deviceId: id });
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = (refCounts.get(id) ?? 1) - 1;
    if (next <= 0) {
      refCounts.delete(id);
      getSocket().emit("unsubscribe_device", { deviceId: id });
    } else {
      refCounts.set(id, next);
    }
  };
}
