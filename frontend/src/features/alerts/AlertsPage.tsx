import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getActiveAlerts } from "../../api/alertsApi";
import { IndiaMap } from "../../components/map/IndiaMap";
import { Button } from "../../components/ui/Button";
import { Panel } from "../../components/ui/Panel";
import { RiskChip } from "../../components/ui/RiskChip";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui/States";
import { formatCoordinate, formatDateTime, formatProbability, RISK_LABELS } from "../../lib/format";
import { useUiStore } from "../../store/uiStore";
import type { AlertResponse, RiskLevel } from "../../types/api";

type SortKey = "issued_at" | "risk_level" | "region_name" | "probability";

const RISK_ORDER: Record<RiskLevel, number> = { extreme: 0, heavy: 1, moderate: 2, low: 3 };

export function AlertsPage() {
  const navigate = useNavigate();
  const applyAlert = useUiStore((s) => s.applyAlert);
  const selectedAlertId = useUiStore((s) => s.selectedAlertId);
  const setSelectedAlertId = useUiStore((s) => s.setSelectedAlertId);

  const [severity, setSeverity] = useState<RiskLevel | "all">("all");
  const [regionQuery, setRegionQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("issued_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const alertsQuery = useQuery({ queryKey: ["alerts"], queryFn: getActiveAlerts, refetchInterval: 30000 });
  const alerts = alertsQuery.data ?? [];

  const selected = alerts.find((a) => a.id === selectedAlertId) ?? null;

  const filtered = useMemo(() => {
    const q = regionQuery.trim().toLowerCase();
    return alerts
      .filter((a) => (severity === "all" ? true : a.risk_level === severity))
      .filter((a) => (q ? a.region_name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "risk_level") cmp = RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level];
        else if (sortKey === "probability") cmp = a.probability - b.probability;
        else if (sortKey === "region_name") cmp = a.region_name.localeCompare(b.region_name);
        else cmp = new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [alerts, regionQuery, severity, sortDir, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "region_name" ? "asc" : "desc");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 border border-stone-300 bg-paper px-4 py-3">
        <label className="text-xs">
          <span className="mb-1 block text-stone-600">Severity</span>
          <select
            className="rounded-sm border border-stone-300 bg-white px-2 py-1.5 text-sm"
            onChange={(e) => setSeverity(e.target.value as RiskLevel | "all")}
            value={severity}
          >
            <option value="all">All</option>
            {(Object.keys(RISK_LABELS) as RiskLevel[]).map((level) => (
              <option key={level} value={level}>
                {RISK_LABELS[level]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-stone-600">Region</span>
          <input
            className="rounded-sm border border-stone-300 px-2 py-1.5 font-mono text-sm"
            onChange={(e) => setRegionQuery(e.target.value)}
            placeholder="Filter region_name"
            value={regionQuery}
          />
        </label>
        <p className="ml-auto text-xs text-stone-500">
          Server has no filter query parameters; filtering is client-side.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-3">
          {alertsQuery.isLoading && <Skeleton className="h-64" />}
          {alertsQuery.isError && (
            <ErrorState
              body={alertsQuery.error instanceof Error ? alertsQuery.error.message : "Request failed"}
              title="Alerts could not be loaded"
            />
          )}
          {alertsQuery.isSuccess && alerts.length === 0 && (
            <EmptyState
              body="There are currently no active early-warning alerts. The listing endpoint is live and returns an empty array until the prediction pipeline writes records."
              title="No active alerts"
            />
          )}
          {filtered.length > 0 && (
            <div className="overflow-x-auto border border-stone-300 bg-paper">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="border-b border-stone-300 bg-stone-50 text-xs uppercase tracking-wide text-stone-600">
                  <tr>
                    {([
                      ["region_name", "region_name"],
                      ["risk_level", "risk_level"],
                      ["probability", "probability"],
                      ["issued_at", "issued_at"],
                    ] as const).map(([key, label]) => (
                      <th className="px-3 py-2 font-medium" key={key}>
                        <button className="hover:text-stone-900" onClick={() => toggleSort(key)} type="button">
                          {label}
                          {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-2 font-medium">is_active</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((alert) => (
                    <tr
                      className={`cursor-pointer border-b border-stone-200 ${selectedAlertId === alert.id ? "bg-stone-100" : "hover:bg-stone-50"}`}
                      key={alert.id}
                      onClick={() => setSelectedAlertId(alert.id)}
                    >
                      <td className="px-3 py-2">{alert.region_name}</td>
                      <td className="px-3 py-2">
                        <RiskChip level={alert.risk_level} />
                      </td>
                      <td className="px-3 py-2 font-mono tabular-nums">{formatProbability(alert.probability)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{formatDateTime(alert.issued_at)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{String(alert.is_active)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <IndiaMap
            alerts={filtered}
            className="min-h-[18rem]"
            onSelectAlert={(alert) => setSelectedAlertId(alert.id)}
            selectedId={selectedAlertId}
          />
          <Panel title="Alert detail">
            {!selected && (
              <EmptyState body="Select a row or a map marker to inspect the AlertResponse fields." title="No alert selected" />
            )}
            {selected && <AlertDetail alert={selected} onAnalyze={() => {
              applyAlert(selected);
              navigate("/analysis");
            }} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function AlertDetail({ alert, onAnalyze }: { alert: AlertResponse; onAnalyze: () => void }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{alert.region_name}</h3>
        <RiskChip level={alert.risk_level} />
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-xs">
        <dt className="text-stone-500">id</dt>
        <dd>{alert.id}</dd>
        <dt className="text-stone-500">latitude</dt>
        <dd>{formatCoordinate(alert.location.latitude)}</dd>
        <dt className="text-stone-500">longitude</dt>
        <dd>{formatCoordinate(alert.location.longitude)}</dd>
        <dt className="text-stone-500">probability</dt>
        <dd>{formatProbability(alert.probability)}</dd>
        <dt className="text-stone-500">valid_from</dt>
        <dd>{formatDateTime(alert.valid_from)}</dd>
        <dt className="text-stone-500">valid_until</dt>
        <dd>{formatDateTime(alert.valid_until)}</dd>
        <dt className="text-stone-500">issued_at</dt>
        <dd>{formatDateTime(alert.issued_at)}</dd>
        <dt className="text-stone-500">is_active</dt>
        <dd>{String(alert.is_active)}</dd>
      </dl>
      <p className="text-sm leading-6 text-stone-800">{alert.message}</p>
      <Button onClick={onAnalyze} type="button">
        Open in Analysis
      </Button>
    </div>
  );
}
