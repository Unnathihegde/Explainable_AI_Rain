import { useMemo, useRef, useState } from "react";
import {
  analyzeCloudConditions,
  conditionPresets,
  emptyWeatherForm,
  sampleScenes,
} from "../services/cloudAnalysisDemo.js";

const riskStyles = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-800",
  moderate: "border-amber-200 bg-amber-50 text-amber-800",
  substantial: "border-orange-200 bg-orange-50 text-orange-800",
  extreme: "border-red-200 bg-red-50 text-red-800",
};

const fields = [
  ["location", "Location", "Mumbai, Maharashtra", "text"],
  ["date", "Scene date", "2005-06-23", "date"],
  ["cloudType", "Cloud input", "Deep convective cloud mass", "text"],
  ["temperature", "Temperature (C)", "27", "number"],
  ["humidity", "Humidity (%)", "91", "number"],
  ["pressure", "Pressure (hPa)", "996", "number"],
  ["windSpeed", "Wind speed (m/s)", "12", "number"],
  ["cloudCover", "Cloud cover (%)", "88", "number"],
  ["rainfall", "Recent rainfall (mm)", "142", "number"],
];

const processingSteps = [
  "Reading satellite scene",
  "Normalizing weather vectors",
  "Running rainfall inference",
  "Generating Grad-CAM attention map",
  "Matching historical analogs",
];

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export default function Dashboard() {
  const [weather, setWeather] = useState(emptyWeatherForm);
  const [imagePreview, setImagePreview] = useState("");
  const [sampleGradcam, setSampleGradcam] = useState("");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingTimer = useRef(null);

  const canAnalyze = imagePreview && weather.location && weather.cloudCover;

  const sortedDrivers = useMemo(() => analysis?.drivers ?? [], [analysis]);

  function updateField(name, value) {
    window.clearTimeout(processingTimer.current);
    setWeather((current) => ({ ...current, [name]: value }));
    setAnalysis(null);
    setIsProcessing(false);
  }

  function applyPreset(values) {
    window.clearTimeout(processingTimer.current);
    setWeather(values);
    setAnalysis(null);
    setIsProcessing(false);
  }

  function applySampleScene(scene) {
    window.clearTimeout(processingTimer.current);
    setWeather(scene.values);
    setImagePreview(scene.inputImage);
    setSampleGradcam(scene.gradcamImage);
    setFileName(scene.name);
    setAnalysis(null);
    setIsProcessing(false);
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    window.clearTimeout(processingTimer.current);
    setFileName(file.name);
    setImagePreview(URL.createObjectURL(file));
    setSampleGradcam("");
    setAnalysis(null);
    setIsProcessing(false);
  }

  function handleAnalyze() {
    if (!canAnalyze) return;

    window.clearTimeout(processingTimer.current);
    setAnalysis(null);
    setIsProcessing(true);
    processingTimer.current = window.setTimeout(() => {
      setAnalysis(analyzeCloudConditions(weather));
      setIsProcessing(false);
    }, 1900);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Cloud Risk Analysis
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Satellite texture and weather signals are evaluated together, then
                highlighted regions show which cloud structures carried the
                highest influence for the prediction.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {conditionPresets.map((preset) => (
              <button
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-400 hover:bg-white"
                key={preset.id}
                onClick={() => applyPreset(preset.values)}
                type="button"
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {preset.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {preset.summary}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              Use Existing Satellite Scenes
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {sampleScenes.map((scene) => (
                <button
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition hover:border-slate-400"
                  key={scene.id}
                  onClick={() => applySampleScene(scene)}
                  type="button"
                >
                  <img
                    alt={`${scene.name} satellite scene`}
                    className="h-24 w-full object-cover"
                    src={scene.inputImage}
                  />
                  <span className="block p-3">
                    <span className="block text-sm font-semibold text-slate-900">
                      {scene.name}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      {scene.summary}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center transition hover:border-slate-500">
              {imagePreview ? (
                <img
                  alt="Uploaded satellite scene preview"
                  className="h-60 w-full rounded-md object-cover"
                  src={imagePreview}
                />
              ) : (
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Upload satellite image
                  </span>
                  <span className="mt-2 block text-xs text-slate-500">
                    PNG, JPG, or WEBP cloud scene
                  </span>
                </span>
              )}
              <input
                accept="image/*"
                className="sr-only"
                onChange={handleImageChange}
                type="file"
              />
              {fileName && (
                <span className="mt-2 max-w-full truncate text-xs text-slate-500">
                  {fileName}
                </span>
              )}
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fields.map(([name, label, placeholder, type]) => (
                <label className="text-sm" key={name}>
                  <span className="mb-1 block font-medium text-slate-700">{label}</span>
                  <input
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-700"
                    onChange={(event) => updateField(name, event.target.value)}
                    placeholder={placeholder}
                    type={type}
                    value={weather[name]}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!canAnalyze || isProcessing}
              onClick={handleAnalyze}
              type="button"
            >
              {isProcessing ? "Processing..." : "Analyze Image"}
            </button>
            {!canAnalyze && (
              <p className="text-sm text-slate-500">
                Add an image, location, and cloud cover to run analysis.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Output</h2>
              <p className="mt-1 text-sm text-slate-600">
                Original scene and Grad-CAM influence overlay.
              </p>
            </div>
            {analysis && !isProcessing && (
              <span
                className={`rounded border px-2 py-1 text-xs font-semibold capitalize ${
                  riskStyles[analysis.riskLevel]
                }`}
              >
                {analysis.riskLevel}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Input
              </p>
              <div className="aspect-square rounded-lg border border-slate-200 bg-slate-50">
                {imagePreview ? (
                  <img
                    alt="Satellite input"
                    className="h-full w-full rounded-lg object-cover"
                    src={imagePreview}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                    Uploaded image appears here.
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Grad-CAM Output
              </p>
              <div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {imagePreview && analysis && !isProcessing ? (
                  <>
                    <img
                      alt="Grad-CAM influence overlay"
                      className="h-full w-full object-cover"
                      src={sampleGradcam || imagePreview}
                    />
                    {!sampleGradcam && (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(220,38,38,0.72),rgba(234,179,8,0.55)_18%,rgba(34,197,94,0.35)_33%,rgba(59,130,246,0.22)_58%,rgba(30,64,175,0.18)_100%)] mix-blend-multiply" />
                    )}
                    <div className="absolute right-[14%] top-[9%] h-[20%] w-[32%] border-2 border-white/90" />
                    <div className="absolute right-[5%] top-[18%] h-[58%] w-[28%] border-2 border-white/90" />
                    <span className="absolute right-[16%] top-[10%] bg-slate-900/70 px-2 py-1 text-xs text-white">
                      cloud_cluster_area_2
                    </span>
                    <span className="absolute right-[6%] top-[19%] bg-slate-900/70 px-2 py-1 text-xs text-white">
                      cloud_cluster_area_1
                    </span>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                    {isProcessing
                      ? "Generating influence overlay..."
                      : "Influence overlay appears after analysis."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isProcessing && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Backend processing
              </p>
              <div className="mt-3 space-y-2">
                {processingSteps.map((step, index) => (
                  <div className="flex items-center gap-2 text-xs text-slate-600" key={step}>
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>
                      {index + 1}. {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysis && !isProcessing && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Risk score" value={formatPercent(analysis.probability)} />
              <Metric label="Confidence" value={formatPercent(analysis.confidence)} />
              <Metric label="Heat coverage" value="22%" />
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Explainability</h2>
          {isProcessing ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The model is combining cloud-region attention with humidity,
              pressure, wind, cloud cover, and recent rainfall before returning
              a risk summary.
            </p>
          ) : analysis ? (
            <>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {analysis.explanation}
              </p>
              <div className="mt-4 space-y-3">
                {sortedDrivers.map((driver) => (
                  <div key={driver.label}>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>{driver.label}</span>
                      <span>{driver.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-slate-700"
                        style={{ width: formatPercent(driver.impact) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Run analysis to see which weather and cloud signals are driving the
              classification.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Similar Historical Conditions
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {isProcessing ? (
              <p className="text-sm text-slate-600 md:col-span-2 xl:col-span-5">
                Searching historical analogs with similar cloud cover, humidity,
                pressure, and rainfall signatures.
              </p>
            ) : (analysis?.similarCases ?? []).length > 0 ? (
              analysis.similarCases.map((item) => (
                <article
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  key={`${item.location}-${item.date}`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {item.location}
                  </p>
                  <p className="text-xs text-slate-500">{item.date}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    {item.match}% match
                  </p>
                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    {item.conditions}
                  </p>
                  <p className="mt-3 text-xs font-medium text-slate-800">
                    {item.outcome}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-600 md:col-span-2 xl:col-span-5">
                Similar cases appear after the image and weather conditions are
                analyzed.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
