import type { ReactNode } from "react";

export function WidgetShell({
  title,
  children,
  hint,
}: {
  title: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <article className="dash-widget card">
      <div className="card-row">
        <span className="card-title">{title}</span>
        {hint ? <span className="badge live">{hint}</span> : null}
      </div>
      {children}
    </article>
  );
}
