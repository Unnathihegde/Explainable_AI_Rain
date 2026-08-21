import { useQuery } from "@tanstack/react-query";
import { getHealth } from "../../api/healthApi";
import { getModelInfo } from "../../api/predictionsApi";
import { Panel } from "../../components/ui/Panel";
import { ErrorState, Skeleton } from "../../components/ui/States";
import { useUiStore } from "../../store/uiStore";
import type { SimulatorMode } from "../../store/uiStore";

export function SystemStatusPage() {
  const healthQuery = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 15000 });
  const modelQuery = useQuery({ queryKey: ["model-info"], queryFn: getModelInfo, refetchInterval: 15000 });
  const simulatorMode = useUiStore((s) => s.simulatorMode);
  const setSimulatorMode = useUiStore((s) => s.setSimulatorMode);
  const lastDetail = useUiStore((s) => s.lastModelUnavailableDetail);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel description="GET /api/v1/health" title="Service health">
        {healthQuery.isLoading && <Skeleton className="h-24" />}
        {healthQuery.isError && (
          <ErrorState
            body={healthQuery.error instanceof Error ? healthQuery.error.message : "Request failed"}
            title="Health endpoint unreachable"
          />
        )}
        {healthQuery.data && (
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 font-mono text-xs">
            <dt className="text-stone-500 font-sans tracking-wider uppercase text-[10px] font-bold">status</dt>
            <dd className="font-semibold text-stone-900">{healthQuery.data.status}</dd>
            <dt className="text-stone-500 font-sans tracking-wider uppercase text-[10px] font-bold">service</dt>
            <dd>{healthQuery.data.service}</dd>
            <dt className="text-stone-500 font-sans tracking-wider uppercase text-[10px] font-bold">version</dt>
            <dd>{healthQuery.data.version}</dd>
            <dt className="text-stone-500 font-sans tracking-wider uppercase text-[10px] font-bold">environment</dt>
            <dd>{healthQuery.data.environment}</dd>
          </dl>
        )}
        <p className="mt-4 text-xs leading-relaxed text-stone-500">
          Last data ingestion time is not returned by /health or /predictions/model-info.
        </p>
      </Panel>

      <Panel description="GET /api/v1/predictions/model-info" title="Model">
        {modelQuery.isLoading && <Skeleton className="h-24" />}
        {modelQuery.isError && (
          <ErrorState
            body={modelQuery.error instanceof Error ? modelQuery.error.message : "Request failed"}
            title="model-info unreachable"
          />
        )}
        {modelQuery.data && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 font-mono text-xs">
              <dt className="text-stone-500 font-sans tracking-wider uppercase text-[10px] font-bold">model_loaded</dt>
              <dd className="font-semibold text-stone-900">{String(modelQuery.data.model_loaded).toUpperCase()}</dd>
              <dt className="text-stone-500 font-sans tracking-wider uppercase text-[10px] font-bold">artifact_dir</dt>
              <dd className="text-stone-700">{modelQuery.data.artifact_dir}</dd>
            </dl>
            <div className="border-t border-stone-200 pt-3">
              <span className="text-[10px] font-bold tracking-wider uppercase text-stone-500">Expected architectures</span>
              <dl className="grid grid-cols-[8rem_1fr] gap-y-1.5 font-mono text-xs mt-2">
                <dt className="text-stone-500">tabular</dt>
                <dd className="text-stone-700">{modelQuery.data.expected_models.tabular}</dd>
                <dt className="text-stone-500">vision</dt>
                <dd className="text-stone-700">{modelQuery.data.expected_models.vision}</dd>
                <dt className="text-stone-500">hybrid</dt>
                <dd className="text-stone-700">{modelQuery.data.expected_models.hybrid}</dd>
              </dl>
            </div>
            {!modelQuery.data.model_loaded && (
              <p className="border border-amber-250 bg-amber-50/50 px-3 py-2 text-xs leading-5 text-amber-900">
                POST /api/v1/predictions returns HTTP 501 until a trained artifact is loaded.{" "}
                {lastDetail ? lastDetail : null}
              </p>
            )}
          </div>
        )}
      </Panel>

      <Panel
        className="lg:col-span-2"
        description="Controls how the Analysis workspace treats HTTP 501 (model not deployed)."
        title="Simulator"
      >
        <fieldset className="space-y-3 text-xs">
          <legend className="sr-only">Simulator mode</legend>
          {(
            [
              ["auto", "Auto — use the API; on 501, run a labeled local simulation"],
              ["forced", "Forced — never call the live model; always simulate"],
              ["off", "Off — show the 501 error and do not simulate"],
            ] as Array<[SimulatorMode, string]>
          ).map(([value, label]) => (
            <label className="flex items-center gap-2.5 cursor-pointer text-stone-700 hover:text-stone-900 transition-colors" key={value}>
              <input
                checked={simulatorMode === value}
                name="simulatorMode"
                onChange={() => setSimulatorMode(value)}
                type="radio"
                value={value}
                className="accent-stone-900 h-3.5 w-3.5 border-stone-300 text-stone-900 focus:ring-0 focus:ring-offset-0"
              />
              <span className="font-medium">{label}</span>
            </label>
          ))}
        </fieldset>
      </Panel>
    </div>
  );
}
