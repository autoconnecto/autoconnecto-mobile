import type { DeviceAttribute } from "../../api/attributes";

export type AttributeScopeLower = "shared" | "client" | "server";

export type AttributePairItem = {
  id: string;
  label: string;
  writeScope: AttributeScopeLower;
  writeKey: string;
  readScope: AttributeScopeLower;
  readKey: string;
};

export function normalizeScopeLower(scope: unknown): AttributeScopeLower | "" {
  const s = String(scope || "")
    .trim()
    .toLowerCase();
  if (s === "shared") return "shared";
  if (s === "client") return "client";
  if (s === "server") return "server";
  return "";
}

export function scopeToApi(scope: AttributeScopeLower): "SHARED" | "CLIENT" | "SERVER" {
  return String(scope || "shared").toUpperCase() as "SHARED" | "CLIENT" | "SERVER";
}

export function normalizeAttributeKey(key: unknown) {
  return String(key || "").trim().toLowerCase();
}

export function renderAttributeValue(value: unknown) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function getEditorType(value: unknown): "boolean" | "number" | "string" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "string";
}

export function valuesEqual(a: unknown, b: unknown) {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;

  const aStr = typeof a === "object" ? JSON.stringify(a) : String(a).trim();
  const bStr = typeof b === "object" ? JSON.stringify(b) : String(b).trim();

  return aStr === bStr;
}

export function getPairStatus(writeValue: unknown, readValue: unknown) {
  if (readValue === null || readValue === undefined || readValue === "") {
    return { text: "Pending", tone: "pending" as const };
  }

  if (valuesEqual(writeValue, readValue)) {
    return { text: "Confirmed", tone: "confirmed" as const };
  }

  return { text: "Mismatch", tone: "mismatch" as const };
}

export function normalizeAttributePairItems(input: unknown): AttributePairItem[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item: unknown, index: number) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<
        string,
        unknown
      >;
      return {
        id: String(row.id ?? `attribute-pair-${index}`),
        label: String(row.label ?? "").trim(),
        writeScope: normalizeScopeLower(row.writeScope) || "shared",
        writeKey: String(row.writeKey ?? "").trim(),
        readScope: normalizeScopeLower(row.readScope) || "shared",
        readKey: String(row.readKey ?? "").trim(),
      };
    })
    .filter((item) => item.writeKey && item.readKey);
}

export function findScopedAttribute(
  attributes: DeviceAttribute[],
  wantedScope: AttributeScopeLower,
  wantedKey: string
): DeviceAttribute | undefined {
  const nk = normalizeAttributeKey(wantedKey);

  return attributes.find(
    (item) =>
      normalizeScopeLower(item.scope) === wantedScope &&
      normalizeAttributeKey(item.key) === nk
  );
}

export function getRowDraftKey(item: AttributePairItem) {
  return `${item.writeScope}__${item.writeKey}`;
}
