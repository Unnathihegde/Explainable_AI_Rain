import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { getActiveAlerts } from "../../api/alertsApi";
import { getHealth } from "../../api/healthApi";
import { getModelInfo } from "../../api/predictionsApi";
import { IndiaMap } from "../../components/map/IndiaMap";
import { Panel } from "../../components/ui/Panel";
import { RiskChip } from "../../components/ui/RiskChip";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { formatDateTime, formatProbability } from "../../lib/format";
import { useUiStore } from "../../store/uiStore";
import type { AlertResponse, RiskLevel } from "../../types/api";

function countByRisk(alerts: AlertResponse[]): Record<RiskLevel, number> {
  return {
    low: alerts.filter((a) => a.risk_level === "low").length,
    moderate: alerts.filter((a) => a.risk_level === "moderate").length,
    heavy: alerts.filter((a) => a.risk_level === "heavy").length,
    extreme: alerts.filter((a) => a.risk_level === "extreme").length,
  };
}

export function OverviewPage() {
  const navigate = useNavigate();
  const applyAlert = useUiStore((s) => s.applyAlert);
  const selectedAlertId = useUiStore((s) => s.selectedAlertId);
  const setSelectedAlertId = useUiStore((s) => s.setSelectedAlertId);

  const alertsQuery = useQuery({ queryKey: ["alerts"], queryFn: getActiveAlerts, refetchInterval: 30000 });
  const healthQuery = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 30000 });
  const modelQuery = useQuery({ queryKey: ["model-info"], queryFn: getModelInfo, refetchInterval: 30000 });

  const alerts = alertsQuery.data ?? [];
  const counts = countByRisk(alerts);
  const ranked = [...alerts].sort((a, b) => {
    const order: Record<RiskLevel, number> = { extreme: 0, heavy: 1, moderate: 2, low: 3 };
    return order[a.risk_level] - order[b.risk_level];
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border border-stone-300 bg-paper px-4 py-2 text-xs">
        <span>
          Active alerts <span className="font-mono">{alerts.length}</span>
        </span>
        <span className="text-stone-500">
          Extreme {counts.extreme} · Heavy {counts.heavy} · Moderate {counts.moderate} · Low {counts.low}
        </span>
        <span className="text-stone-500">
          API {healthQuery.data?.status ?? (healthQuery.isError ? "unreachable" : "…")}
          {healthQuery.data ? ` · v${healthQuery.data.version}` : ""}
        </span>
        <span className="text-stone-500">
          Model {modelQuery.data?.model_loaded ? "loaded" : "not deployed"}
        </span>
        <span className="ml-auto font-mono text-stone-500">
          {healthQuery.dataUpdatedAt ? `Health ${formatDateTime(new Date(healthQuery.dataUpdatedAt).toISOString())}` : "—"}
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
        <IndiaMap
          alerts={alerts}
          className="min-h-[28rem] lg:min-h-[36rem]"
          onSelectAlert={(alert) => setSelectedAlertId(alert.id)}
          selectedId={selectedAlertId}
        />

        <Panel
          description="Newest first from GET /api/v1/alerts. Empty until the pipeline writes real alerts."
          title="Active warnings"
        >
          {alertsQuery.isLoading && <Skeleton className="h-40" />}
          {alertsQuery.isError && (
            <ErrorState
              body={alertsQuery.error instanceof Error ? alertsQuery.error.message : "Request failed"}
              title="Alerts could not be loaded"
            />
          )}
          {alertsQuery.isSuccess && alerts.length === 0 && (
            <EmptyState
              body="GET /api/v1/alerts returned an empty list. There are no active early-warning alerts in the database."
              title="No active alerts"
            />
          )}
          {ranked.length > 0 && (
            <ul className="divide-y divide-stone-200">
              {ranked.slice(0, 8).map((alert) => (
                <li key={alert.id}>
                  <button
                    className="flex w-full flex-col gap-1 py-2.5 text-left hover:bg-stone-50"
                    onClick={() => {
                      applyAlert(alert);
                      navigate("/alerts");
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{alert.region_name}</span>
                      <RiskChip level={alert.risk_level} />
                    </div>
                    <p className="font-mono text-[11px] text-stone-500">
                      {formatProbability(alert.probability)} · {formatDateTime(alert.issued_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-stone-500">
            <Link className="underline" to="/alerts">
              Open full alerts table
            </Link>
          </p>
        </Panel>
      </div>
    </div>
  );
}
