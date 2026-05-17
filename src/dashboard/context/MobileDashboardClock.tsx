import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DashboardDetail } from "../../api/dashboards";

export type DashboardClockState = {
  mode: "realtime" | "history";
  windowMs: number;
  refreshSec: number;
  from: number;
  to: number;
};

const DEFAULT_WINDOW_MS = 6 * 60 * 60 * 1000;
const DEFAULT_REFRESH_SEC = 10;

const MobileDashboardClockContext = createContext<DashboardClockState | null>(
  null
);

function buildInitialClock(dashboard: DashboardDetail | null): DashboardClockState {
  const tw = dashboard?.timeWindow;
  const from = Number(tw?.from);
  const to = Number(tw?.to);

  if (Number.isFinite(from) && Number.isFinite(to) && from < to) {
    return {
      mode: "history",
      from,
      to,
      windowMs: to - from,
      refreshSec: DEFAULT_REFRESH_SEC,
    };
  }

  const now = Date.now();
  return {
    mode: "realtime",
    windowMs: DEFAULT_WINDOW_MS,
    refreshSec: DEFAULT_REFRESH_SEC,
    from: now - DEFAULT_WINDOW_MS,
    to: now,
  };
}

export function MobileDashboardClockProvider({
  dashboard,
  children,
}: {
  dashboard: DashboardDetail | null;
  children: ReactNode;
}) {
  const [clock, setClock] = useState(() => buildInitialClock(dashboard));

  useEffect(() => {
    setClock(buildInitialClock(dashboard));
  }, [dashboard?.id]);

  useEffect(() => {
    if (clock.mode !== "realtime") return;

    const tick = () => {
      const now = Date.now();
      setClock((prev) => ({
        ...prev,
        from: now - prev.windowMs,
        to: now,
      }));
    };

    tick();
    const intervalMs = Math.max(1, clock.refreshSec) * 1000;
    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [clock.mode, clock.windowMs, clock.refreshSec]);

  const value = useMemo(() => clock, [clock]);

  return (
    <MobileDashboardClockContext.Provider value={value}>
      {children}
    </MobileDashboardClockContext.Provider>
  );
}

export function useMobileDashboardClock() {
  const clock = useContext(MobileDashboardClockContext);
  if (!clock) {
    throw new Error("useMobileDashboardClock must be used within provider");
  }
  return clock;
}

export function useMobileDashboardClockOptional() {
  return useContext(MobileDashboardClockContext);
}
