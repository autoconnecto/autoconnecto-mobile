import { WidgetMessage } from "../components/WidgetState";
import { WidgetShell } from "../components/WidgetShell";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../hooks/useMobileWidgetBindings";

export function MarkdownPanelWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const widgetTitle =
    config.showTitle !== false ? title || String(config.title || "") : "";
  const content = typeof config.content === "string" ? config.content : "";

  return (
    <WidgetShell title={widgetTitle}>
      {content ? (
        <div className="markdown-panel-mobile">{content}</div>
      ) : (
        <p className="muted small">No content</p>
      )}
    </WidgetShell>
  );
}

export function ImagePanelWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const src = String(config.url || config.imageUrl || config.src || "").trim();
  const alt = String(config.alt || title || "Image");

  return (
    <WidgetShell title={title}>
      {src ? (
        <img className="image-panel-mobile" src={src} alt={alt} loading="lazy" />
      ) : (
        <WidgetMessage title={title} message="No image URL configured" />
      )}
    </WidgetShell>
  );
}

export function CodeWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const code = String(config.code || config.content || "").trim();
  const link = String(config.linkUrl || config.href || "").trim();

  return (
    <WidgetShell title={title}>
      {code ? <pre className="code-widget-mobile">{code}</pre> : null}
      {link ? (
        <a
          className="code-widget-link"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open link
        </a>
      ) : null}
      {!code && !link ? (
        <p className="muted small">No code or link configured</p>
      ) : null}
    </WidgetShell>
  );
}

export function NavigationButtonWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const label = String(config.label || config.title || title || "Open");
  const href = String(config.url || config.href || "").trim();
  const target = config.openInNewTab === false ? "_self" : "_blank";

  if (!href) {
    return <WidgetMessage title={title} message="No navigation URL configured" />;
  }

  return (
    <WidgetShell title={title}>
      <a
        className="nav-button-mobile"
        href={href}
        target={target}
        rel="noopener noreferrer"
      >
        {label}
      </a>
    </WidgetShell>
  );
}

export function PanelWidgetRouter(props: MobileWidgetBindings) {
  const type = String(props.widget.type || "");
  switch (type) {
    case "markdownPanel":
      return <MarkdownPanelWidgetMobile {...props} />;
    case "imagePanel":
      return <ImagePanelWidgetMobile {...props} />;
    case "codeWidget":
      return <CodeWidgetMobile {...props} />;
    case "navigationButton":
      return <NavigationButtonWidgetMobile {...props} />;
    default:
      return null;
  }
}
