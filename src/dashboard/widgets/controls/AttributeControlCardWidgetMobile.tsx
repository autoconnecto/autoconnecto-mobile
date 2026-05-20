import { useMemo, useState } from "react";
import { saveDeviceAttributes } from "../../../api/attributes";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import { useDeviceAttributes } from "../../hooks/useDeviceAttributes";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";
import { resolveControlDeviceId } from "../../utils/resolveControlDeviceId";
import { formatDisplayValue, toNumber } from "./controlUtils";

type Scope = "SHARED" | "CLIENT" | "SERVER";

type PairItem = {
  id: string;
  label: string;
  writeScope: Scope;
  writeKey: string;
  readScope: Scope;
  readKey: string;
};

function normalizeScope(scope: unknown): Scope {
  const s = String(scope || "SHARED").toUpperCase();
  if (s === "CLIENT") return "CLIENT";
  if (s === "SERVER") return "SERVER";
  return "SHARED";
}

function normalizeItems(input: unknown): PairItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: unknown, index: number) => {
      const row = (item && typeof item === "object" ? item : {}) as Record<
        string,
        unknown
      >;
      const writeKey = String(row.writeKey || row.key || "").trim();
      const readKey = String(row.readKey || writeKey).trim();
      if (!writeKey) return null;
      return {
        id: String(row.id ?? `attr-${index}`),
        label: String(row.label || writeKey).trim(),
        writeScope: normalizeScope(row.writeScope),
        writeKey,
        readScope: normalizeScope(row.readScope || row.writeScope),
        readKey,
      };
    })
    .filter((item): item is PairItem => item !== null);
}

export function AttributeControlCardWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "Attributes");
  const items = useMemo(() => normalizeItems(config.items), [config.items]);

  const deviceId = useMemo(
    () =>
      resolveControlDeviceId(
        props.widget,
        props.aliases,
        props.dashboardContext,
        props.selectedDeviceId
      ),
    [props.widget, props.aliases, props.dashboardContext, props.selectedDeviceId]
  );

  const { getValue, loading, version } = useDeviceAttributes(deviceId);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function saveItem(item: PairItem) {
    if (!deviceId) return;
    const raw = draft[item.id] ?? formatDisplayValue(getValue(item.readKey, [item.readScope]));
    if (raw === "—") return;

    setPending((p) => ({ ...p, [item.id]: true }));
    setError(null);
    try {
      let value: unknown = raw;
      const current = getValue(item.readKey, [item.readScope]);
      if (typeof current === "boolean") {
        value = raw === "true" || raw === "1";
      } else if (toNumber(current) !== null || toNumber(raw) !== null) {
        value = toNumber(raw) ?? raw;
      }
      await saveDeviceAttributes(deviceId, item.writeScope, {
        [item.writeKey]: value,
      });
      setDraft((d) => {
        const next = { ...d };
        delete next[item.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending((p) => ({ ...p, [item.id]: false }));
    }
  }

  if (!deviceId) {
    return (
      <WidgetMessage title={widgetTitle} message="Select a device for this dashboard" />
    );
  }

  if (!items.length) {
    return <WidgetMessage title={widgetTitle} message="No attribute fields configured" />;
  }

  if (loading && version === 0) {
    return <WidgetLoading title={widgetTitle} />;
  }

  return (
    <WidgetShell title={widgetTitle}>
      {error ? <p className="error small">{error}</p> : null}
      <ul className="attr-control-list">
        {items.map((item) => {
          const current = getValue(item.readKey, [item.readScope]);
          const display =
            draft[item.id] ?? formatDisplayValue(current);
          const isBool = typeof current === "boolean";
          const isPending = !!pending[item.id];

          return (
            <li key={item.id} className="attr-control-row">
              <span className="attr-control-label">{item.label}</span>
              {isBool ? (
                <button
                  type="button"
                  className={`mini-switch-chip ${current ? "is-on" : ""}`}
                  disabled={isPending}
                  onClick={async () => {
                    if (!deviceId) return;
                    setPending((p) => ({ ...p, [item.id]: true }));
                    try {
                      await saveDeviceAttributes(deviceId, item.writeScope, {
                        [item.writeKey]: !current,
                      });
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Save failed"
                      );
                    } finally {
                      setPending((p) => ({ ...p, [item.id]: false }));
                    }
                  }}
                >
                  {current ? "ON" : "OFF"}
                </button>
              ) : (
                <>
                  <input
                    className="attr-control-input"
                    value={display === "—" ? "" : display}
                    disabled={isPending}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [item.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="attr-control-save"
                    disabled={isPending}
                    onClick={() => saveItem(item)}
                  >
                    Save
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </WidgetShell>
  );
}
