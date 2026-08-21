/**
 * Types mirrored from FastAPI OpenAPI (`GET /openapi.json`) and
 * `backend/app/schemas/{prediction,alert}.py`. Field names are not renamed.
 *
 * Documented HTTP contracts:
 * - GET  /api/v1/health
 * - POST /api/v1/predictions          → 200 PredictionResponse | 422 | 501
 * - GET  /api/v1/predictions/model-info
 * - GET  /api/v1/alerts               → AlertResponse[] (no query params)
 *
 * 501 is raised as FastAPI HTTPException when PredictionService has no
 * loaded model (see backend tests). OpenAPI does not list 501 because the
 * route does not declare it; the runtime body is `{ "detail": string }`.
 *
 * Auth: none.
 * Pagination / list filters: none on any endpoint.
 *
 * Missing backend routes (do not call):
 * // TODO: backend endpoint missing — GET /api/v1/predictions/{id}
 * // TODO: backend endpoint missing — prediction history / sessions
 * // TODO: backend endpoint missing — similar historical cases
 *
 * Implemented satellite Grad-CAM route:
 * POST /api/v1/predictions/explain-image → 200 GradCamResponse | 422
 */

export type RiskLevel = "low" | "moderate" | "heavy" | "extreme";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/** Surface meteorology. Units from WeatherFeatures Field descriptions. All optional. */
export interface WeatherFeatures {
  /** Surface air temperature, °C */
  temperature_c?: number | null;
  /** Relative humidity, % (0–100) */
  humidity_pct?: number | null;
  /** Mean sea-level pressure, hPa */
  pressure_hpa?: number | null;
  /** Wind speed, m/s (≥ 0) */
  wind_speed_ms?: number | null;
  /** Total cloud cover, % (0–100) */
  cloud_cover_pct?: number | null;
}

export interface PredictionRequest {
  location: GeoPoint;
  /** Human-readable place name, e.g. 'Kerala' */
  region_name?: string | null;
  /** Forecast lead time in hours (1–72), default 12 */
  horizon_hours?: number;
  weather?: WeatherFeatures | null;
  /** Attach SHAP/Grad-CAM explanation payload, default true */
  include_explanation?: boolean;
}

export interface FeatureAttribution {
  feature: string;
  /** The input value the model saw */
  value?: number | null;
  /** Signed SHAP value (log-odds or probability units) */
  contribution: number;
}

export interface ImageExplanation {
  satellite_image_id: string;
  /** URL of the Grad-CAM overlay rendered by the backend */
  heatmap_url: string;
  /** Plain-language summary of highlighted regions */
  description: string;
}

export interface HistoricalMatch {
  event: string;
  region: string;
  date: string;
  observed_category: number;
  observed_rainfall_mm: number;
  similarity: number;
  similarity_pct: number;
}

export interface HistoricalExplanation {
  reference_events: number;
  closest_match?: HistoricalMatch | null;
  matches?: HistoricalMatch[];
  notes?: string[];
}

export interface ConfidenceFactors {
  model_agreement?: number | null;
  historical_similarity?: number | null;
  data_quality: string;
  data_quality_score: number;
}

export interface ConfidenceExplanation {
  confidence_pct: number;
  confidence: string;
  factors: ConfidenceFactors;
  components?: Record<string, any>;
}

export interface Explanation {
  feature_attributions?: FeatureAttribution[];
  image_explanation?: ImageExplanation | null;
  /** Human-readable sentence explaining the main drivers of the prediction */
  narrative?: string;
  historical_explanation?: HistoricalExplanation | null;
  confidence_explanation?: ConfidenceExplanation | null;
  caveats?: string[];
}

export interface PredictionResponse {
  location: GeoPoint;
  region_name: string | null;
  generated_at: string;
  horizon_hours: number;
  /** Probability of a high-impact rain event (0–1) */
  probability: number;
  risk_level: RiskLevel;
  /** Model confidence score (0–1) */
  confidence: number;
  model_version: string;
  explanation?: Explanation | null;
}

export interface AlertResponse {
  id: number;
  region_name: string;
  location: GeoPoint;
  risk_level: RiskLevel;
  probability: number;
  valid_from: string;
  valid_until: string;
  /** Human-readable warning text, including the AI's reasoning */
  message: string;
  issued_at: string;
  is_active: boolean;
}

/** Runtime shape of GET /api/v1/health (untyped dict in OpenAPI). */
export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  environment: string;
}

/** Runtime shape of GET /api/v1/predictions/model-info (untyped dict in OpenAPI). */
export interface ModelInfoResponse {
  model_loaded: boolean;
  artifact_dir: string;
  expected_models: {
    tabular: string;
    vision: string;
    hybrid: string;
  };
}

export interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface HTTPValidationError {
  detail: ValidationErrorItem[];
}


/** FastAPI HTTPException body (501 and other raised HTTP errors). */
export interface HTTPExceptionBody {
  detail: string;
}

// ---------------------------------------------------------------------------
// Grad-CAM image explanation types (POST /api/v1/predictions/explain-image)
// ---------------------------------------------------------------------------

/** One named high-attention region extracted from the Grad-CAM heatmap. */
export interface GradCamRegion {
  name: string;
  /** Normalised bounding box [x0, y0, x1, y1] in scene coordinates */
  bbox: number[];
  /** Share of the whole scene this region covers */
  area_share: number;
  /** Mean normalised attribution inside the region */
  intensity: number;
  /** Plain-language position within the scene */
  position: string;
}

/**
 * Real Grad-CAM explanation from the trained satellite CNN (satellite_model_v1.pt).
 * Returned by POST /api/v1/predictions/explain-image.
 * Both image URLs are base64 PNG data URLs — no static file server required.
 */
export interface GradCamResponse {
  /** Always "real" — distinguishes from simulator Grad-CAM */
  source: "real";
  model_name: string;
  model_version: string;
  /** Convolutional layer used for attribution (e.g. 'features.3') */
  target_layer: string;
  predicted_category: number;
  class_probabilities: Record<string, number>;
  satellite_risk_score: number;
  high_influence_coverage: number;
  coverage_label: string;
  regions: GradCamRegion[];
  /** Normalised heatmap as a PNG data URL (data:image/png;base64,…) */
  heatmap_data_url: string;
  /** Side-by-side overlay (original scene + heatmap) as a PNG data URL */
  overlay_data_url: string;
  notes: string[];
}
