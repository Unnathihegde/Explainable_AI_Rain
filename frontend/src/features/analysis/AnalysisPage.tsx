import { useRef, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPrediction, explainImage } from "../../api/predictionsApi";
import { ApiError } from "../../api/errors";
import { IndiaMap } from "../../components/map/IndiaMap";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Panel } from "../../components/ui/Panel";
import { RiskChip } from "../../components/ui/RiskChip";
import { SimulatedBanner } from "../../components/ui/SimulatedBanner";
import { ErrorState } from "../../components/ui/States";
import { formatCoordinate, formatDateTime, formatNumber, formatProbability } from "../../lib/format";
import { PLACE_PRESETS } from "../../lib/places";
import { simulatePrediction } from "../../lib/simulator";
import { validatePredictionRequest } from "../../lib/validation";
import { useUiStore } from "../../store/uiStore";
import type { FieldError } from "../../lib/validation";
import type { GeoPoint, GradCamResponse, WeatherFeatures } from "../../types/api";


const WEATHER_FIELDS: Array<{
  key: keyof WeatherFeatures;
  label: string;
  hint: string;
  step: string;
}> = [
  { key: "temperature_c", label: "Temperature (°C)", hint: "Surface air temperature", step: "0.1" },
  { key: "humidity_pct", label: "Relative Humidity (%)", hint: "Range 0–100", step: "0.1" },
  { key: "pressure_hpa", label: "Atmospheric Pressure (hPa)", hint: "Mean sea-level pressure", step: "0.1" },
  { key: "wind_speed_ms", label: "Wind Speed (m/s)", hint: "Non-negative speed", step: "0.1" },
  { key: "cloud_cover_pct", label: "Cloud Cover (%)", hint: "Range 0–100", step: "0.1" },
];

export function AnalysisPage() {
  const navigate = useNavigate();
  const draft = useUiStore((s) => s.analysisDraft);
  const patchDraft = useUiStore((s) => s.patchDraft);
  const setWeatherField = useUiStore((s) => s.setWeatherField);
  const simulatorMode = useUiStore((s) => s.simulatorMode);
  const setLastModelUnavailableDetail = useUiStore((s) => s.setLastModelUnavailableDetail);
  const setActiveAnalysis = useUiStore((s) => s.setActiveAnalysis);
  const addHistory = useUiStore((s) => s.addHistory);
  const activeAnalysis = useUiStore((s) => s.activeAnalysis);

  const [errors, setErrors] = useState<FieldError[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // --- Grad-CAM upload state -------------------------------------------
  const [gradCamFile, setGradCamFile] = useState<File | null>(null);
  const [gradCamResult, setGradCamResult] = useState<GradCamResponse | null>(null);
  const [gradCamError, setGradCamError] = useState<string | null>(null);
  const [showGradCamOverlay, setShowGradCamOverlay] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errorMap = useMemo(() => Object.fromEntries(errors.map((e) => [e.field, e.message])), [errors]);

  const selection: GeoPoint | null = useMemo(() => {
    const lat = Number(draft.latitude);
    const lon = Number(draft.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { latitude: lat, longitude: lon };
  }, [draft.latitude, draft.longitude]);

  const mutation = useMutation({
    mutationFn: async () => {
      const { errors: nextErrors, request } = validatePredictionRequest(draft);
      setErrors(nextErrors);
      if (!request) throw new Error("Fix the highlighted fields before running a prediction.");

      if (simulatorMode === "forced") {
        const response = simulatePrediction(request);
        return { request, response, simulated: true as const };
      }

      try {
        const response = await createPrediction(request);
        setLastModelUnavailableDetail(null);
        return { request, response, simulated: false as const };
      } catch (error) {
        if (error instanceof ApiError && error.code === "MODEL_NOT_DEPLOYED" && simulatorMode === "auto") {
          setLastModelUnavailableDetail(error.detail);
          const response = simulatePrediction(request);
          return { request, response, simulated: true as const };
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      setSubmitError(null);
      setActiveAnalysis(result);
      addHistory(result);
    },
    onError: (error) => {
      setSubmitError(error instanceof Error ? error.message : "Prediction failed.");
    },
  });

  const gradCamMutation = useMutation({
    mutationFn: async (file: File) => explainImage(file),
    onSuccess: (result) => {
      setGradCamResult(result);
      setGradCamError(null);
    },
    onError: (error) => {
      setGradCamError(error instanceof Error ? error.message : "Grad-CAM failed.");
    },
  });

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className="space-y-3">
        <Panel
          description="Fields match PredictionRequest / WeatherFeatures. Satellite imagery is not a request field on POST /api/v1/predictions."
          title="Location and meteorology"
        >
          <IndiaMap
            className="mb-3 min-h-[16rem]"
            onMapClick={(point) =>
              patchDraft({
                latitude: point.latitude.toFixed(4),
                longitude: point.longitude.toFixed(4),
              })
            }
            selection={selection}
          />
          <p className="mb-3 text-xs text-stone-500">Click the map to set location, or choose a named point.</p>
          <div className="mb-4 flex flex-wrap items-center gap-2 border-t border-stone-200 pt-3">
            <span className="font-mono text-[9px] uppercase tracking-wider text-stone-500 font-bold">Presets:</span>
            <div className="flex flex-wrap gap-1">
              {PLACE_PRESETS.map((place) => (
                <button
                  className="rounded-sm border border-stone-300 bg-white px-2 py-0.5 font-mono text-[10px] text-stone-700 hover:border-stone-500 hover:text-stone-900 transition-colors"
                  key={place.name}
                  onClick={() =>
                    patchDraft({
                      region_name: place.name,
                      latitude: String(place.latitude),
                      longitude: String(place.longitude),
                    })
                  }
                  type="button"
                >
                  {place.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              error={errorMap.latitude}
              hint="GeoPoint.latitude, −90 to 90"
              label="Latitude"
              name="latitude"
              onChange={(e) => patchDraft({ latitude: e.target.value })}
              required
              value={draft.latitude}
            />
            <Input
              error={errorMap.longitude}
              hint="GeoPoint.longitude, −180 to 180"
              label="Longitude"
              name="longitude"
              onChange={(e) => patchDraft({ longitude: e.target.value })}
              required
              value={draft.longitude}
            />
            <Input
              hint="Optional. Example: Kerala"
              label="Region Name"
              name="region_name"
              onChange={(e) => patchDraft({ region_name: e.target.value })}
              value={draft.region_name}
            />
            <Input
              error={errorMap.horizon_hours}
              hint="Integer 1–72. Default 12"
              label="Horizon Hours"
              name="horizon_hours"
              onChange={(e) => patchDraft({ horizon_hours: e.target.value })}
              value={draft.horizon_hours}
            />
          </div>
          <h3 className="mt-5 mb-2.5 text-[10.5px] font-bold tracking-[0.12em] uppercase text-stone-500">
            Meteorological parameters
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {WEATHER_FIELDS.map((field) => (
              <Input
                error={errorMap[field.key]}
                hint={field.hint}
                key={field.key}
                label={field.label}
                name={field.key}
                onChange={(e) => setWeatherField(field.key, e.target.value)}
                step={field.step}
                type="number"
                value={draft.weather[field.key]}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              data-testid="run-prediction"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              type="button"
            >
              {mutation.isPending ? "Running prediction…" : "Run Prediction"}
            </Button>
            <p className="text-xs text-stone-500">include_explanation is sent as true.</p>
          </div>
          {submitError && <div className="mt-3"><ErrorState body={submitError} title="Prediction did not complete" /></div>}
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="Result">
          {mutation.isPending && (
            <p className="text-sm text-stone-600">Submitting POST /api/v1/predictions…</p>
          )}
          {!mutation.isPending && !activeAnalysis && (
            <p className="text-sm leading-6 text-stone-600">
              No prediction yet. If the model is undeployed, the API responds with HTTP 501 and this workspace
              falls back to simulator mode unless simulator is set to off.
            </p>
          )}
          {activeAnalysis && !mutation.isPending && (
            <div className="space-y-3">
              {activeAnalysis.simulated && <SimulatedBanner />}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-stone-500">risk_level</p>
                  <div className="mt-1">
                    <RiskChip level={activeAnalysis.response.risk_level} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-stone-500">probability</p>
                  <p className="font-mono text-2xl tabular-nums">
                    {formatProbability(activeAnalysis.response.probability)}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-stone-200 pt-3 font-mono text-xs">
                <dt className="text-stone-500">confidence</dt>
                <dd>{formatProbability(activeAnalysis.response.confidence)}</dd>
                <dt className="text-stone-500">horizon_hours</dt>
                <dd>{activeAnalysis.response.horizon_hours}</dd>
                <dt className="text-stone-500">model_version</dt>
                <dd>{activeAnalysis.response.model_version}</dd>
                <dt className="text-stone-500">generated_at</dt>
                <dd>{formatDateTime(activeAnalysis.response.generated_at)}</dd>
                <dt className="text-stone-500">latitude</dt>
                <dd>{formatCoordinate(activeAnalysis.response.location.latitude)}</dd>
                <dt className="text-stone-500">longitude</dt>
                <dd>{formatCoordinate(activeAnalysis.response.location.longitude)}</dd>
                <dt className="text-stone-500">region_name</dt>
                <dd>{activeAnalysis.response.region_name ?? "null"}</dd>
              </dl>
              {activeAnalysis.request.weather && (
                <div className="border-t border-stone-200 pt-3">
                  <p className="mb-2 text-xs uppercase tracking-wide text-stone-500">Submitted weather</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
                    {(Object.keys(activeAnalysis.request.weather) as Array<keyof WeatherFeatures>).map((key) => (
                      <div className="contents" key={key}>
                        <dt className="text-stone-500">{key}</dt>
                        <dd>{formatNumber(activeAnalysis.request.weather?.[key] ?? null, 1)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              <Button onClick={() => navigate("/explainability")} type="button" variant="secondary">
                Open explanation
              </Button>
            </div>
          )}
        </Panel>

        {/* Grad-CAM satellite image upload panel */}
        <Panel
          description="Upload an INSAT satellite scene (PNG, JPEG, or TIFF) to run real Grad-CAM attribution via satellite_model_v1.pt. Results appear below — nothing is fabricated."
          title="Satellite image — Grad-CAM"
        >
          <div className="space-y-3">
            {/* File picker */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                accept="image/png,image/jpeg,image/tiff,image/*"
                aria-label="Upload INSAT satellite scene"
                className="hidden"
                id="gradcam-file-input"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setGradCamFile(file);
                  setGradCamResult(null);
                  setGradCamError(null);
                }}
                ref={fileInputRef}
                type="file"
              />
              <button
                className="border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:border-stone-500 hover:text-stone-900 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {gradCamFile ? gradCamFile.name : "Choose satellite scene…"}
              </button>
              {gradCamFile && (
                <Button
                  disabled={gradCamMutation.isPending}
                  onClick={() => gradCamMutation.mutate(gradCamFile)}
                  type="button"
                >
                  {gradCamMutation.isPending ? "Running Grad-CAM…" : "Run Grad-CAM"}
                </Button>
              )}
              {gradCamFile && (
                <button
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                  onClick={() => {
                    setGradCamFile(null);
                    setGradCamResult(null);
                    setGradCamError(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>

            {gradCamError && <ErrorState body={gradCamError} title="Grad-CAM failed" />}

            {/* Results */}
            {gradCamResult && (
              <div className="space-y-3 border-t border-stone-200 pt-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                    Real Grad-CAM · {gradCamResult.model_name} v{gradCamResult.model_version}
                  </p>
                  <label className="flex items-center gap-2 text-xs text-stone-600">
                    <input
                      checked={showGradCamOverlay}
                      onChange={(e) => setShowGradCamOverlay(e.target.checked)}
                      type="checkbox"
                    />
                    Overlay
                  </label>
                </div>
                <div className="relative max-w-md border border-stone-300 bg-stone-900">
                  <img
                    alt={showGradCamOverlay ? "Grad-CAM heatmap overlay" : "Grad-CAM heatmap"}
                    className="block w-full"
                    src={showGradCamOverlay ? gradCamResult.overlay_data_url : gradCamResult.heatmap_data_url}
                  />
                </div>
                {/* Colour scale legend */}
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">Attention scale</p>
                  <div className="flex h-3 overflow-hidden border border-stone-300">
                    <div className="flex-1 bg-[#3d5a6c]" />
                    <div className="flex-1 bg-[#c06a2c]" />
                    <div className="flex-1 bg-[#a33b32]" />
                  </div>
                  <div className="mt-1 flex justify-between font-mono text-[10px] text-stone-500">
                    <span>Lower attention</span>
                    <span>Higher attention</span>
                  </div>
                </div>
                {/* Metadata */}
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-xs">
                  <dt className="text-stone-500">Target layer</dt>
                  <dd>{gradCamResult.target_layer}</dd>
                  <dt className="text-stone-500">Predicted class</dt>
                  <dd>{gradCamResult.predicted_category}</dd>
                  <dt className="text-stone-500">Satellite risk</dt>
                  <dd>{(gradCamResult.satellite_risk_score * 100).toFixed(1)}%</dd>
                  <dt className="text-stone-500">Coverage</dt>
                  <dd>{gradCamResult.coverage_label} ({(gradCamResult.high_influence_coverage * 100).toFixed(1)}%)</dd>
                </dl>
                {/* Class probabilities */}
                {Object.keys(gradCamResult.class_probabilities).length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Class probabilities</p>
                    <div className="space-y-1.5">
                      {Object.entries(gradCamResult.class_probabilities).map(([label, prob]) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="w-24 flex-shrink-0 font-mono text-[10.5px] text-stone-600">{label}</span>
                          <div className="h-2 flex-1 overflow-hidden border border-stone-200">
                            <div
                              className="h-full bg-stone-700"
                              style={{ width: `${(prob * 100).toFixed(1)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right font-mono text-[10.5px] text-stone-700">{(prob * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Regions */}
                {gradCamResult.regions.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">High-attention regions</p>
                    <div className="space-y-1">
                      {gradCamResult.regions.map((region) => (
                        <div className="flex items-baseline gap-3 text-xs" key={region.name}>
                          <span className="font-mono text-stone-800">{region.name}</span>
                          <span className="text-stone-500">{region.position}</span>
                          <span className="ml-auto font-mono text-stone-600">
                            {(region.intensity * 100).toFixed(0)}% intensity
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Notes */}
                {gradCamResult.notes.length > 0 && (
                  <ul className="list-disc pl-4 text-[11px] text-stone-500 space-y-0.5">
                    {gradCamResult.notes.map((note, i) => <li key={i}>{note}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
