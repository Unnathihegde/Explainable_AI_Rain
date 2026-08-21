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

  return (
    <div className="space-y-3">
      {active.simulated && <SimulatedBanner />}
      <div className="flex flex-wrap items-center gap-3 border border-stone-300 bg-paper px-4 py-2 text-sm">
        <RiskChip level={active.response.risk_level} />
        <span className="font-mono tabular-nums">{formatProbability(active.response.probability)}</span>
        <span className="text-stone-500">{active.response.region_name ?? "unnamed location"}</span>
        <span className="ml-auto text-xs text-stone-500">
          model_version {active.response.model_version} ·{" "}
          <Link className="underline" to="/analysis">
            Analysis
          </Link>
        </span>
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

      <Panel title="Similar historical cases">
        {/* TODO: backend endpoint missing — similar historical cases are not on Explanation or any route */}
        <EmptyState
          body="The Explanation schema has feature_attributions, image_explanation, and narrative only. No similar-cases field or endpoint exists."
          title="Not available"
        />
      </Panel>
    </div>
  );
}
