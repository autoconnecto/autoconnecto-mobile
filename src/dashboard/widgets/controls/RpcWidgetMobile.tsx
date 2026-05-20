import { useMemo, useState } from "react";
import { sendDeviceCommand } from "../../../api/commands";
import { getSocket } from "../../../realtime/socket";
import { WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";
import { resolveControlDeviceId } from "../../utils/resolveControlDeviceId";

type RpcAction = {
  id: string;
  label: string;
  method: string;
  params: Record<string, unknown>;
  rawParams: string;
  useJsonMode: boolean;
  timeout: number;
};

function normalizeActions(input: unknown): RpcAction[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row: unknown, index: number) => {
      const item = (row && typeof row === "object" ? row : {}) as Record<
        string,
        unknown
      >;
      const method = String(item.method || "").trim();
      if (!method) return null;
      return {
        id: String(item.id ?? `rpc-${index}`),
        label: String(item.label || method).trim(),
        method,
        params:
          item.params && typeof item.params === "object" && !Array.isArray(item.params)
            ? (item.params as Record<string, unknown>)
            : {},
        rawParams: String(item.rawParams ?? "{}"),
        useJsonMode: item.useJsonMode === true,
        timeout: Math.max(
          500,
          Math.min(Number(item.timeout ?? 5000) || 5000, 60000)
        ),
      };
    })
    .filter((item): item is RpcAction => item !== null);
}

function parseParams(action: RpcAction): Record<string, unknown> {
  if (!action.useJsonMode) return action.params;
  try {
    const parsed = JSON.parse(action.rawParams);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function executeRpc(deviceId: string, action: RpcAction): Promise<unknown> {
  const requestId = `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const params = parseParams(action);

  return new Promise((resolve, reject) => {
    const socket = getSocket();
    let settled = false;

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.off("device_rpc_response", handler);
      reject(new Error(`Timeout after ${action.timeout}ms`));
    }, action.timeout);

    function handler(data: Record<string, unknown>) {
      if (data?.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      socket.off("device_rpc_response", handler);
      if (data?.success === false) {
        reject(new Error(String(data?.message || "RPC failed")));
      } else {
        resolve(data);
      }
    }

    socket.on("device_rpc_response", handler);

    sendDeviceCommand(deviceId, { method: action.method, params, requestId }).catch(
      (err) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        socket.off("device_rpc_response", handler);
        reject(err);
      }
    );
  });
}

export function RpcWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "RPC");
  const actions = useMemo(
    () => normalizeActions(config.actions ?? config.items),
    [config.actions, config.items]
  );

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

  const [pending, setPending] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: RpcAction) {
    if (!deviceId) return;
    setPending(action.id);
    setError(null);
    setLastResult(null);
    try {
      const result = await executeRpc(deviceId, action);
      setLastResult(JSON.stringify(result, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "RPC failed");
    } finally {
      setPending(null);
    }
  }

  if (!deviceId) {
    return (
      <WidgetMessage title={widgetTitle} message="Select a device for this dashboard" />
    );
  }

  if (!actions.length) {
    return <WidgetMessage title={widgetTitle} message="No RPC actions configured" />;
  }

  return (
    <WidgetShell title={widgetTitle}>
      {error ? <p className="error small">{error}</p> : null}
      <div className="rpc-action-list">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="rpc-action-btn"
            disabled={pending === action.id}
            onClick={() => runAction(action)}
          >
            {pending === action.id ? "Running…" : action.label}
          </button>
        ))}
      </div>
      {lastResult ? (
        <pre className="rpc-result-preview">{lastResult}</pre>
      ) : null}
    </WidgetShell>
  );
}
