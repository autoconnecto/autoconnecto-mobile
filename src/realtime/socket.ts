import { io, Socket } from "socket.io-client";
import { fetchAuthSession } from "aws-amplify/auth";
import { WS_BASE_URL } from "../config/env";

let socket: Socket | null = null;

async function resolveSocketToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || undefined;
  } catch {
    return undefined;
  }
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
        void resolveSocketToken()
          .then((token) => {
            if (!token) {
              cb({});
              return;
            }
            cb({ token });
          })
          .catch(() => cb({}));
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
