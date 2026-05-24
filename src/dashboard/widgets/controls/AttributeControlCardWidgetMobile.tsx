import { useEffect, useMemo, useState } from "react";
import { saveDeviceAttributes } from "../../../api/attributes";
import { WidgetLoading, WidgetMessage } from "../../components/WidgetState";
import { WidgetShell } from "../../components/WidgetShell";
import { useDeviceAttributes } from "../../hooks/useDeviceAttributes";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../../hooks/useMobileWidgetBindings";
import { resolveControlDeviceId } from "../../utils/resolveControlDeviceId";
import {
  findScopedAttribute,
  getEditorType,
  getPairStatus,
  getRowDraftKey,
  normalizeAttributePairItems,
  renderAttributeValue,
  scopeToApi,
  type AttributePairItem,
} from "../../utils/attributePairUtils";
import { toNumber } from "./controlUtils";

export function AttributeControlCardWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle = title || String(config.title || "Attributes");
  const items = useMemo(() => normalizeAttributePairItems(config.items), [config.items]);

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

  const { attributes, loading, version } = useDeviceAttributes(deviceId);
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts({});
    setSavingKeys({});
    setError(null);
  }, [deviceId]);

  async function handleSave(item: AttributePairItem, currentValue: unknown) {
    if (!deviceId) return;

    const draftKey = getRowDraftKey(item);
    const nextValue = Object.prototype.hasOwnProperty.call(drafts, draftKey)
      ? drafts[draftKey]
      : currentValue;

    setSavingKeys((prev) => ({ ...prev, [draftKey]: true }));
    setError(null);

    try {
      await saveDeviceAttributes(deviceId, scopeToApi(item.writeScope), {
        [item.writeKey]: nextValue,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingKeys((prev) => ({ ...prev, [draftKey]: false }));
    }
  }

  function renderEditor(item: AttributePairItem, currentValue: unknown) {
    const draftKey = getRowDraftKey(item);
    const draftValue = Object.prototype.hasOwnProperty.call(drafts, draftKey)
      ? drafts[draftKey]
      : currentValue;
    const editorType = getEditorType(currentValue);
    const isSaving = !!savingKeys[draftKey];

    if (editorType === "boolean") {
      const checked = Boolean(draftValue);
      return (
        <div className="attr-pair-editor">
          <button
            type="button"
            className={`switch-toggle ${checked ? "is-on" : ""} ${
              isSaving ? "is-pending" : ""
            }`}
            disabled={isSaving}
            aria-pressed={checked}
            onClick={() =>
              setDrafts((prev) => ({ ...prev, [draftKey]: !checked }))
            }
          >
            <span className="switch-toggle-thumb" />
          </button>
          <button
            type="button"
            className="attr-control-save"
            disabled={isSaving}
            onClick={() => handleSave(item, currentValue)}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      );
    }

    if (editorType === "number") {
      const numeric =
        typeof draftValue === "number"
          ? draftValue
          : toNumber(draftValue) ?? "";
      return (
        <div className="attr-pair-editor">
          <input
            className="attr-control-input"
            type="number"
            value={numeric}
            disabled={isSaving}
            onChange={(e) => {
              const parsed = toNumber(e.target.value);
              setDrafts((prev) => ({
                ...prev,
                [draftKey]: parsed ?? e.target.value,
              }));
            }}
          />
          <button
            type="button"
            className="attr-control-save"
            disabled={isSaving}
            onClick={() => handleSave(item, currentValue)}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      );
    }

    return (
      <div className="attr-pair-editor">
        <input
          className="attr-control-input"
          value={
            draftValue === null || draftValue === undefined
              ? ""
              : String(draftValue)
          }
          disabled={isSaving}
          onChange={(e) =>
            setDrafts((prev) => ({ ...prev, [draftKey]: e.target.value }))
          }
        />
        <button
          type="button"
          className="attr-control-save"
          disabled={isSaving}
          onClick={() => handleSave(item, currentValue)}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    );
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
      <div className="attr-pair-grid">
        {items.map((item) => {
          const writeAttr = findScopedAttribute(
            attributes,
            item.writeScope,
            item.writeKey
          );
          const readAttr = findScopedAttribute(
            attributes,
            item.readScope,
            item.readKey
          );
          const status = getPairStatus(writeAttr?.value, readAttr?.value);
          const rowLabel =
            item.label.trim() || item.writeKey || item.readKey || "Attribute";

          return (
            <article key={item.id} className="attr-pair-card">
              <div className="attr-pair-header">
                <div className="attr-pair-heading">
                  <span className="attr-pair-title">{rowLabel}</span>
                  <span className="attr-pair-keys">
                    W: {item.writeScope}.{item.writeKey}
                    <br />
                    R: {item.readScope}.{item.readKey}
                  </span>
                </div>
                <span className={`attr-pair-status is-${status.tone}`}>
                  {status.text}
                </span>
              </div>

              <p className="attr-pair-row">
                Req:{" "}
                <span className="attr-pair-req">
                  {renderAttributeValue(writeAttr?.value)}
                </span>
              </p>

              {renderEditor(item, writeAttr?.value)}

              <p className="attr-pair-row">
                Ack:{" "}
                <span className="attr-pair-ack">
                  {renderAttributeValue(readAttr?.value)}
                </span>
              </p>

              <p className="attr-pair-ts">
                {readAttr?.updatedTs
                  ? new Date(readAttr.updatedTs).toLocaleTimeString()
                  : "—"}
              </p>
            </article>
          );
        })}
      </div>
    </WidgetShell>
  );
}
