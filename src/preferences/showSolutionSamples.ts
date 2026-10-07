const STORAGE_KEY = "ac.showSolutionSamples";
const EVENT = "ac:show-solution-samples";

function readStored(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return false;
    return raw === "1" || raw.toLowerCase() === "true";
  } catch {
    return false;
  }
}

export function getShowSolutionSamples(): boolean {
  return readStored();
}

export function setShowSolutionSamples(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(
    new CustomEvent(EVENT, { detail: { showSolutionSamples: value } })
  );
}

export function subscribeShowSolutionSamples(
  listener: (value: boolean) => void
): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener(readStored());
  };
  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (typeof detail?.showSolutionSamples === "boolean") {
      listener(detail.showSolutionSamples);
    } else {
      listener(readStored());
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onCustom);
  };
}
