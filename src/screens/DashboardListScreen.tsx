import { useCallback, useEffect, useState } from "react";
import {
  fetchDashboards,
  type DashboardSummary,
} from "../api/dashboards";
import { PullRefresh } from "../components/PullRefresh";

type Props = {
  onOpenDashboard: (dashboardId: string) => void;
};

export function DashboardListScreen({ onOpenDashboard }: Props) {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const rows = await fetchDashboards();
      setDashboards(rows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboards"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PullRefresh
      className="screen tab-screen"
      onRefresh={async () => {
        setLoading(true);
        await load();
      }}
    >
      <p className="muted small">
        View-only dashboards. Edit layouts on the web app.
      </p>
      {loading ? <p className="muted center">Loading dashboards…</p> : null}
      {error ? <p className="error center">{error}</p> : null}
      {!loading && dashboards.length === 0 ? (
        <p className="muted center">No dashboards in your tenant.</p>
      ) : null}
      <ul className="list-rows">
        {dashboards.map((dash) => (
          <li key={dash.id}>
            <button
              type="button"
              className="list-row"
              onClick={() => onOpenDashboard(dash.id)}
            >
              <span className="list-row-body">
                <span className="list-row-title">{dash.name}</span>
                <span className="list-row-meta">{dash.id}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </PullRefresh>
  );
}
