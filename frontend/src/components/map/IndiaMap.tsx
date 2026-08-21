import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { AlertResponse, GeoPoint } from "../../types/api";
import { INDIA_BOUNDS, INDIA_CENTER } from "../../lib/places";
import { cn } from "../../lib/cn";

const RISK_COLOR: Record<string, string> = {
  low: "#4d7c5a",
  moderate: "#b59a3a",
  heavy: "#c06a2c",
  extreme: "#a33b32",
};

function ClickHandler({ onClick }: { onClick?: (point: GeoPoint) => void }) {
  useMapEvents({
    click(event) {
      onClick?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export function IndiaMap({
  alerts = [],
  selectedId,
  onSelectAlert,
  onMapClick,
  selection,
  className,
}: {
  alerts?: AlertResponse[];
  selectedId?: number | null;
  onSelectAlert?: (alert: AlertResponse) => void;
  onMapClick?: (point: GeoPoint) => void;
  selection?: GeoPoint | null;
  className?: string;
}) {
  return (
    <div className={cn("map-shell relative min-h-[22rem] w-full border border-stone-300", className)}>
      <MapContainer
        bounds={INDIA_BOUNDS}
        center={INDIA_CENTER}
        className="map-container h-full min-h-[22rem] w-full"
        maxBounds={INDIA_BOUNDS}
        maxBoundsViscosity={0.7}
        minZoom={4}
        scrollWheelZoom
        zoom={5}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <ClickHandler onClick={onMapClick} />
        {alerts.map((alert) => (
          <CircleMarker
            center={[alert.location.latitude, alert.location.longitude]}
            eventHandlers={{ click: () => onSelectAlert?.(alert) }}
            key={alert.id}
            pathOptions={{
              color: selectedId === alert.id ? "#1c1917" : RISK_COLOR[alert.risk_level],
              fillColor: RISK_COLOR[alert.risk_level],
              fillOpacity: 0.85,
              weight: selectedId === alert.id ? 2 : 1,
            }}
            radius={selectedId === alert.id ? 10 : 7}
          />
        ))}
        {selection && (
          <CircleMarker
            center={[selection.latitude, selection.longitude]}
            pathOptions={{ color: "#1c1917", fillColor: "#3d5a6c", fillOpacity: 0.9, weight: 2 }}
            radius={8}
          />
        )}
      </MapContainer>
    </div>
  );
}
