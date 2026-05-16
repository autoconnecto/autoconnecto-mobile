export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatTs(ts?: number | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

export function isDeviceActive(status?: string): boolean {
  return String(status || "").toUpperCase() === "ACTIVE";
}
