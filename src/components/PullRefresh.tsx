import { useRef, useState, type ReactNode } from "react";

type Props = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
};

const THRESHOLD = 72;

export function PullRefresh({ onRefresh, children, className }: Props) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  async function triggerRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPull(0);
    }
  }

  return (
    <div
      className={["pull-refresh", className].filter(Boolean).join(" ")}
      onTouchStart={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop > 0 || refreshing) return;
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }}
      onTouchMove={(e) => {
        if (!pulling.current || refreshing) return;
        const el = e.currentTarget;
        if (el.scrollTop > 0) {
          pulling.current = false;
          setPull(0);
          return;
        }
        const delta = Math.max(0, e.touches[0].clientY - startY.current);
        setPull(Math.min(delta, THRESHOLD * 1.5));
      }}
      onTouchEnd={() => {
        if (!pulling.current) return;
        pulling.current = false;
        if (pull >= THRESHOLD) {
          void triggerRefresh();
        } else {
          setPull(0);
        }
      }}
    >
      <div
        className="pull-refresh-indicator"
        style={{ height: refreshing ? 40 : pull > 8 ? pull * 0.45 : 0 }}
        aria-hidden
      >
        {refreshing || pull >= THRESHOLD ? (
          <span className="muted small">
            {refreshing ? "Refreshing…" : "Release to refresh"}
          </span>
        ) : pull > 8 ? (
          <span className="muted small">Pull to refresh</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
