import { WidgetShell } from "./WidgetShell";

export function WidgetLoading({ title }: { title: string }) {
  return (
    <WidgetShell title={title}>
      <p className="muted small">Loading…</p>
    </WidgetShell>
  );
}

export function WidgetMessage({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <WidgetShell title={title}>
      <p className="muted small">{message}</p>
    </WidgetShell>
  );
}

export function WidgetError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <WidgetShell title={title}>
      <p className="error small">{message}</p>
    </WidgetShell>
  );
}
