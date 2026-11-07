import { io, Socket } from "socket.io-client";
import { WS_BASE_URL } from "../config/env";
import { readServerToken } from "../auth/localSession";

let socket: Socket | null = null;

function resolveSocketToken(): string | undefined {
  return readServerToken() || undefined;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_BASE_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: (cb) => {
        const token = resolveSocketToken();
        if (!token) {
          cb({});
          return;
        }
        cb({ token });
      },
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch {
      /* ignore */
    }
    socket = null;
  }
}

/** Drop unauthenticated singleton and reconnect with the local JWT after login. */
export function resetSocket() {
  disconnectSocket();
}
