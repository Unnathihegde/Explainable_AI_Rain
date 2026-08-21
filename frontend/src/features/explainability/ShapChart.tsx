import type { FeatureAttribution } from "../../types/api";
import { featureLabel, featureUnit } from "../../lib/featureLabels";
import { formatNumber } from "../../lib/format";

export function ShapChart({ attributions }: { attributions: FeatureAttribution[] }) {
  const sorted = [...attributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const max = Math.max(...sorted.map((a) => Math.abs(a.contribution)), 0.001);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto] text-[10px] uppercase tracking-wide text-stone-500">
        <span>Decreases risk ← → Increases risk</span>
        <span>contribution</span>
      </div>
      {sorted.map((item) => {
        const width = (Math.abs(item.contribution) / max) * 50;
        const positive = item.contribution >= 0;
        const unit = featureUnit(item.feature);
        return (
          <div className="grid grid-cols-[minmax(8rem,0.4fr)_minmax(0,1fr)_5.5rem] items-center gap-2" key={item.feature}>
            <div>
              <p className="text-xs text-stone-800">{featureLabel(item.feature)}</p>
              <p className="font-mono text-[10px] text-stone-500">
                {item.feature}
                {item.value === null || item.value === undefined
                  ? " · value omitted"
                  : ` · ${formatNumber(item.value, 2)}${unit ? ` ${unit}` : ""}`}
              </p>
            </div>
            <div className="relative h-4 border border-stone-200 bg-stone-50">
              <div className="absolute inset-y-0 left-1/2 w-px bg-stone-400" />
              <div
                className={positive ? "absolute top-0.5 h-3 bg-risk-heavy" : "absolute top-0.5 h-3 bg-info"}
                style={{
                  width: `${width}%`,
                  left: positive ? "50%" : `${50 - width}%`,
                }}
              />
            </div>
            <p className="text-right font-mono text-xs tabular-nums">
              {item.contribution >= 0 ? "+" : ""}
              {item.contribution.toFixed(4)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
