import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/States";
import { Panel } from "../../components/ui/Panel";
import { RiskChip } from "../../components/ui/RiskChip";
import { SimulatedBanner } from "../../components/ui/SimulatedBanner";
import { formatDateTime, formatProbability } from "../../lib/format";
import type { RiskLevel } from "../../types/api";

export function HistoryPage() {
  const history = useUiStore((s) => s.history);
  const setActiveAnalysis = useUiStore((s) => s.setActiveAnalysis);
  const navigate = useNavigate();

  const [risk, setRisk] = useState<RiskLevel | "all">("all");
  const [region, setRegion] = useState("");

  const filtered = useMemo(() => {
    const q = region.trim().toLowerCase();
    return history.filter((item) => {
      if (risk !== "all" && item.response.risk_level !== risk) return false;
      if (q && !(item.response.region_name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [history, region, risk]);

  return (
    <div className="space-y-3">
      <Panel
        description="No history API exists. Sessions are stored in this browser only (localStorage) after a prediction is run."
        title="Local analysis sessions"
      >
        <div className="mb-3 flex flex-wrap gap-3">
          <label className="text-xs">
            <span className="mb-1 block text-stone-600">risk_level</span>
            <select
              className="rounded-sm border border-stone-300 px-2 py-1.5 text-sm"
              onChange={(e) => setRisk(e.target.value as RiskLevel | "all")}
              value={risk}
            >
              <option value="all">All</option>
              <option value="low">low</option>
              <option value="moderate">moderate</option>
              <option value="heavy">heavy</option>
              <option value="extreme">extreme</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-stone-600">region_name</span>
            <input
              className="rounded-sm border border-stone-300 px-2 py-1.5 font-mono text-sm"
              onChange={(e) => setRegion(e.target.value)}
              value={region}
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            body="Run a prediction from Analysis to record a session here. This list is not a server archive."
            title="No stored sessions"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-stone-300 text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="py-2 pr-3">stored_at</th>
                  <th className="py-2 pr-3">region_name</th>
                  <th className="py-2 pr-3">risk_level</th>
                  <th className="py-2 pr-3">probability</th>
                  <th className="py-2 pr-3">source</th>
                  <th className="py-2"> </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr className="border-b border-stone-200" key={item.id}>
                    <td className="py-2 pr-3 font-mono text-xs">{formatDateTime(item.stored_at)}</td>
                    <td className="py-2 pr-3">{item.response.region_name ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <RiskChip level={item.response.risk_level} />
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums">{formatProbability(item.response.probability)}</td>
                    <td className="py-2 pr-3">
                      {item.simulated ? (
                        <span className="font-mono text-[10px] font-semibold uppercase text-amber-950">Simulated</span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase text-stone-500">API</span>
                      )}
                    </td>
                    <td className="py-2">
                      <Button
                        onClick={() => {
                          setActiveAnalysis({
                            request: item.request,
                            response: item.response,
                            simulated: item.simulated,
                          });
                          navigate("/explainability");
                        }}
                        type="button"
                        variant="secondary"
                      >
                        Replay
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {filtered.some((item) => item.simulated) && <SimulatedBanner compact />}
    </div>
  );
}
