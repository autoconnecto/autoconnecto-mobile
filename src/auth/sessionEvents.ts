/** Fired when the API returns 401 so AuthProvider can show LoginScreen. */

type Listener = () => void;

const listeners = new Set<Listener>();

export function onUnauthorized(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyUnauthorized(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore listener errors */
    }
  }
}

export function isUnauthorizedError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      (err as { isUnauthorized?: boolean }).isUnauthorized === true
  );
}
