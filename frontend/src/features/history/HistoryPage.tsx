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
        <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-stone-200 pb-3">
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-stone-600">
            <span>Risk Level</span>
            <select
              className="rounded-sm border border-stone-300 bg-white px-2 py-1 text-xs text-stone-850 outline-none focus:border-stone-700"
              onChange={(e) => setRisk(e.target.value as RiskLevel | "all")}
              value={risk}
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="heavy">Heavy</option>
              <option value="extreme">Extreme</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-stone-600">
            <span>Region Name</span>
            <input
              className="rounded-sm border border-stone-300 px-2.5 py-1 font-mono text-xs text-stone-850 outline-none placeholder:text-stone-400 focus:border-stone-700"
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Search region..."
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
              <thead className="border-b border-stone-300 text-[10.5px] uppercase tracking-wider text-stone-500 bg-stone-50/50">
                <tr>
                  <th className="px-4 py-2.5 font-bold">stored_at</th>
                  <th className="px-4 py-2.5 font-bold">region</th>
                  <th className="px-4 py-2.5 font-bold">risk_level</th>
                  <th className="px-4 py-2.5 font-bold">probability</th>
                  <th className="px-4 py-2.5 font-bold">source</th>
                  <th className="px-4 py-2.5 font-bold"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-250">
                {filtered.map((item) => (
                  <tr className="hover:bg-stone-50 transition-colors" key={item.id}>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-stone-600">{formatDateTime(item.stored_at)}</td>
                    <td className="px-4 py-2.5 font-medium text-stone-900">{item.response.region_name ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <RiskChip level={item.response.risk_level} />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-stone-900">{formatProbability(item.response.probability)}</td>
                    <td className="px-4 py-2.5">
                      {item.simulated ? (
                        <span className="font-mono text-[10px] font-semibold uppercase text-amber-800">Simulated</span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase text-stone-500">API</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
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
