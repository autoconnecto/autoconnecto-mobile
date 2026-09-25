/** Pull a device id from a web or app link. Any device, any tenant. */
export function deviceIdFromUrl(raw: string): string | null {
  const text = String(raw || "").trim();
  if (!text) return null;

  const appScheme = text.match(/^autoconnecto:\/\/device\/([^/?#]+)/i);
  if (appScheme?.[1]) {
    try {
      return decodeURIComponent(appScheme[1]);
    } catch {
      return appScheme[1];
    }
  }

  try {
    const url = new URL(text);
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) => part.toLowerCase() === "devices");
    const id = index >= 0 ? parts[index + 1] : "";
    if (!id || id === "create") return null;
    return decodeURIComponent(id);
  } catch {
    return null;
  }
}
