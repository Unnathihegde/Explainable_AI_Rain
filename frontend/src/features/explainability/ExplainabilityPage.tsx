import { useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../../components/ui/Panel";
import { RiskChip } from "../../components/ui/RiskChip";
import { SimulatedBanner } from "../../components/ui/SimulatedBanner";
import { EmptyState } from "../../components/ui/States";
import { formatProbability } from "../../lib/format";
import { useUiStore } from "../../store/uiStore";
import { ShapChart } from "./ShapChart";

export function ExplainabilityPage() {
  const active = useUiStore((s) => s.activeAnalysis);
  const [showOverlay, setShowOverlay] = useState(true);

  if (!active) {
    return (
      <EmptyState
        body="Run a prediction in Analysis, or open a stored session from History. There is no GET /api/v1/predictions/{id} endpoint."
        title="No prediction selected"
      />
    );
  }

  const explanation = active.response.explanation ?? null;
  const attributions = explanation?.feature_attributions ?? [];
  const image = explanation?.image_explanation ?? null;
  const narrative = explanation?.narrative ?? "";
  const historical = explanation?.historical_explanation ?? null;
  const confidenceExp = explanation?.confidence_explanation ?? null;
  const caveats = explanation?.caveats ?? [];

  return (
    <div className="space-y-3">
      {active.simulated && <SimulatedBanner />}
      {caveats.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/50 px-4 py-3 text-xs text-amber-900 space-y-1.5">
          <h4 className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber-800">
            Operational Caveats & Limitations
          </h4>
          <ul className="list-disc pl-4 space-y-1 text-[11.5px] leading-relaxed text-amber-900">
            {caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-6 border border-stone-300 bg-paper px-4 py-3 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Risk Assessment</span>
          <RiskChip level={active.response.risk_level} />
        </div>
        <div className="h-6 w-px bg-stone-200 hidden sm:block" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Probability</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-stone-900">
            {formatProbability(active.response.probability)}
          </span>
        </div>
        <div className="h-6 w-px bg-stone-200 hidden sm:block" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Location</span>
          <span className="font-medium text-stone-900">{active.response.region_name ?? "Unnamed location"}</span>
        </div>
        <div className="h-6 w-px bg-stone-200 hidden md:block" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Model Version</span>
          <span className="font-mono text-stone-600">v{active.response.model_version}</span>
        </div>
        <div className="ml-auto">
          <Link
            className="rounded-sm border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-stone-500 hover:text-stone-900 transition-colors"
            to="/analysis"
          >
            Analysis Workspace
          </Link>
        </div>
      </div>

      <Panel
        description="Signed SHAP values as returned in explanation.feature_attributions (probability or log-odds units per the schema)."
        title="SHAP feature attributions"
      >
        {attributions.length === 0 ? (
          <EmptyState
            body="This prediction has no feature_attributions. The field may be an empty list, or explanation was omitted."
            title="SHAP unavailable"
          />
        ) : (
          <ShapChart attributions={attributions} />
        )}
      </Panel>

      <Panel
        actions={
          image ? (
            <label className="flex items-center gap-2 text-xs">
              <input
                checked={showOverlay}
                onChange={(e) => setShowOverlay(e.target.checked)}
                type="checkbox"
              />
              Overlay
            </label>
          ) : null
        }
        description="ImageExplanation.heatmap_url from the prediction payload. POST /api/v1/predictions does not accept an image upload."
        title="Grad-CAM"
      >
        {!image ? (
          <EmptyState
            body="explanation.image_explanation is null. Grad-CAM is only present when the vision branch returns an overlay."
            title="Grad-CAM unavailable"
          />
        ) : (
          <div className="space-y-3">
            <div className="relative max-w-md border border-stone-300 bg-stone-900">
              {showOverlay ? (
                <img alt="Grad-CAM heatmap" className="block w-full" src={image.heatmap_url} />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-stone-100 px-6 text-center text-sm text-stone-600">
                  Original satellite scene is not in the API response. Only heatmap_url is provided.
                </div>
              )}
            </div>
            <div>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-stone-500">Attention scale (typical)</p>
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
            <dl className="grid grid-cols-[10rem_1fr] gap-y-1 text-xs">
              <dt className="text-stone-500">satellite_image_id</dt>
              <dd className="font-mono">{image.satellite_image_id}</dd>
              <dt className="text-stone-500">description</dt>
              <dd>{image.description}</dd>
            </dl>
          </div>
        )}
      </Panel>

      <Panel title="Narrative explanation">
        {!narrative.trim() ? (
          <EmptyState
            body="explanation.narrative is empty."
            title="Narrative unavailable"
          />
        ) : (
          <p className="max-w-3xl text-sm leading-7 text-stone-800">{narrative}</p>
        )}
      </Panel>

      {confidenceExp && (
        <Panel
          description="Detailed factors contributing to the final model confidence score."
          title="Confidence breakdown"
        >
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="border border-stone-200 bg-stone-50/50 p-3.5">
              <p className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-stone-500">Overall confidence</p>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-stone-900">{confidenceExp.confidence_pct}%</p>
              <p className="mt-0.5 text-[11px] text-stone-500">Label: {confidenceExp.confidence}</p>
            </div>
            <div className="border border-stone-200 bg-stone-50/50 p-3.5">
              <p className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-stone-500">Model agreement</p>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-stone-900">
                {confidenceExp.factors.model_agreement !== null && confidenceExp.factors.model_agreement !== undefined
                  ? `${(confidenceExp.factors.model_agreement * 100).toFixed(1)}%`
                  : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500">Agreement score between branches</p>
            </div>
            <div className="border border-stone-200 bg-stone-50/50 p-3.5">
              <p className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-stone-500">Historical similarity</p>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-stone-900">
                {confidenceExp.factors.historical_similarity !== null && confidenceExp.factors.historical_similarity !== undefined
                  ? `${(confidenceExp.factors.historical_similarity * 100).toFixed(1)}%`
                  : "—"}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500">Closest match score</p>
            </div>
            <div className="border border-stone-200 bg-stone-50/50 p-3.5">
              <p className="text-[9.5px] font-bold tracking-[0.1em] uppercase text-stone-500">Input Data quality</p>
              <p className="mt-1.5 font-mono text-2xl font-semibold text-stone-900">{confidenceExp.factors.data_quality}</p>
              <p className="mt-0.5 text-[11px] text-stone-500">
                Score: {(confidenceExp.factors.data_quality_score * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </Panel>
      )}

      <Panel
        description="Matched nearest analogues from observed past rainfall events."
        title="Similar historical cases"
      >
        {!historical || !historical.matches || historical.matches.length === 0 ? (
          <EmptyState
            body="No historical analogues were matched for this prediction payload."
            title="No historical cases available"
          />
        ) : (
          <div className="overflow-x-auto border border-stone-200 bg-stone-50">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="border-b border-stone-300 bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Event description</th>
                  <th className="px-3 py-2 font-medium">Region</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Observed rainfall</th>
                  <th className="px-3 py-2 font-medium text-right">Similarity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-mono text-xs">
                {historical.matches.map((match, idx) => (
                  <tr className="hover:bg-stone-100" key={idx}>
                    <td className="px-3 py-2 font-sans text-sm text-stone-900 font-medium">{match.event}</td>
                    <td className="px-3 py-2 text-stone-700">{match.region}</td>
                    <td className="px-3 py-2 text-stone-700">{match.date}</td>
                    <td className="px-3 py-2 text-stone-700">{match.observed_rainfall_mm} mm</td>
                    <td className="px-3 py-2 text-right text-stone-900 font-semibold">{match.similarity_pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
