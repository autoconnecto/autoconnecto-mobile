import { useMemo } from "react";
import { WidgetLoading, WidgetMessage } from "../components/WidgetState";
import { WidgetShell } from "../components/WidgetShell";
import { useLatestTelemetry } from "../sdk/useLatestTelemetry";
import {
  useMobileWidgetBindings,
  type MobileWidgetBindings,
} from "../hooks/useMobileWidgetBindings";
import { resolveControlDeviceId } from "../utils/resolveControlDeviceId";
function parseCoord(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function MapLocationWidgetMobile(props: MobileWidgetBindings) {
  const { config, title } = useMobileWidgetBindings(props);
  const type = String(props.widget.type || "");

  const latKey = String(
    config.latKey || config.latitudeKey || "lat"
  ).trim();
  const lonKey = String(
    config.lonKey || config.longitudeKey || "lon"
  ).trim();

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

  const latest = useLatestTelemetry({
    items: deviceId
      ? [
          { id: "lat", deviceId, key: latKey, label: "Lat" },
          { id: "lon", deviceId, key: lonKey, label: "Lon" },
        ]
      : [],
    mode: "realtime",
    enabled: !!deviceId,
  });

  const lat = parseCoord(latest.items.find((r) => r.key === latKey)?.value);
  const lon = parseCoord(latest.items.find((r) => r.key === lonKey)?.value);

  const staticLat = parseCoord(config.lat ?? config.latitude);
  const staticLon = parseCoord(config.lon ?? config.longitude);
  const finalLat = lat ?? staticLat;
  const finalLon = lon ?? staticLon;

  if (!deviceId && (finalLat === null || finalLon === null)) {
    return (
      <WidgetMessage title={title} message="Select a device or configure coordinates" />
    );
  }

  if (deviceId && latest.initialLoading && finalLat === null) {
    return <WidgetLoading title={title} />;
  }

  if (finalLat === null || finalLon === null) {
    return (
      <WidgetMessage
        title={title}
        message={
          type === "markerPlacement"
            ? "No location telemetry yet"
            : "Location not available"
        }
      />
    );
  }

  const mapsUrl = `https://www.google.com/maps?q=${finalLat},${finalLon}`;

  return (
    <WidgetShell title={title}>
      <p className="map-coords">
        {finalLat.toFixed(5)}, {finalLon.toFixed(5)}
      </p>
      <a
        className="nav-button-mobile"
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in Maps
      </a>
    </WidgetShell>
  );
}
