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
            <dt className="text-stone-500">status</dt>
            <dd>{healthQuery.data.status}</dd>
            <dt className="text-stone-500">service</dt>
            <dd>{healthQuery.data.service}</dd>
            <dt className="text-stone-500">version</dt>
            <dd>{healthQuery.data.version}</dd>
            <dt className="text-stone-500">environment</dt>
            <dd>{healthQuery.data.environment}</dd>
          </dl>
        )}
        <p className="mt-4 text-xs leading-5 text-stone-500">
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
          <div className="space-y-3 text-sm">
            <p>
              model_loaded:{" "}
              <span className="font-mono">{String(modelQuery.data.model_loaded)}</span>
            </p>
            <p className="font-mono text-xs">artifact_dir: {modelQuery.data.artifact_dir}</p>
            <ul className="space-y-1 text-xs leading-5 text-stone-700">
              <li>
                <span className="font-medium">tabular — </span>
                {modelQuery.data.expected_models.tabular}
              </li>
              <li>
                <span className="font-medium">vision — </span>
                {modelQuery.data.expected_models.vision}
              </li>
              <li>
                <span className="font-medium">hybrid — </span>
                {modelQuery.data.expected_models.hybrid}
              </li>
            </ul>
            {!modelQuery.data.model_loaded && (
              <p className="border border-amber-800/40 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950">
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
        <fieldset className="space-y-2 text-sm">
          <legend className="sr-only">Simulator mode</legend>
          {(
            [
              ["auto", "Auto — use the API; on 501, run a labeled local simulation"],
              ["forced", "Forced — never call the live model; always simulate"],
              ["off", "Off — show the 501 error and do not simulate"],
            ] as Array<[SimulatorMode, string]>
          ).map(([value, label]) => (
            <label className="flex items-start gap-2" key={value}>
              <input
                checked={simulatorMode === value}
                className="mt-0.5"
                name="simulatorMode"
                onChange={() => setSimulatorMode(value)}
                type="radio"
                value={value}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      </Panel>
    </div>
  );
}
