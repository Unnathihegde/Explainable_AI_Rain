/** Display labels only — API field names stay as-is in payloads. */
export const FEATURE_LABELS: Record<string, string> = {
  temperature_c: "Surface air temperature",
  humidity_pct: "Relative humidity",
  pressure_hpa: "Mean sea-level pressure",
  wind_speed_ms: "Wind speed",
  cloud_cover_pct: "Total cloud cover",
  latitude: "Latitude",
  longitude: "Longitude",
  horizon_hours: "Forecast horizon",
};

export const FEATURE_UNITS: Record<string, string> = {
  temperature_c: "°C",
  humidity_pct: "%",
  pressure_hpa: "hPa",
  wind_speed_ms: "m/s",
  cloud_cover_pct: "%",
  latitude: "°",
  longitude: "°",
  horizon_hours: "h",
};

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}

export function featureUnit(feature: string): string {
  return FEATURE_UNITS[feature] ?? "";
}
