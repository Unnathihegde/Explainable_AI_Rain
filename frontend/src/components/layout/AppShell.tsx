import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getHealth } from "../../api/healthApi";
import { getModelInfo } from "../../api/predictionsApi";
import { useUiStore } from "../../store/uiStore";
import { cn } from "../../lib/cn";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/alerts", label: "Alerts" },
  { to: "/analysis", label: "Analysis" },
  { to: "/explainability", label: "Explainability" },
  { to: "/history", label: "History" },
  { to: "/status", label: "System Status" },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const simulatorMode = useUiStore((s) => s.simulatorMode);

  const healthQuery = useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 30000 });
  const modelQuery = useQuery({ queryKey: ["model-info"], queryFn: getModelInfo, refetchInterval: 30000 });

  const modelLoaded = modelQuery.data?.model_loaded === true;
  const apiDown = healthQuery.isError;

  let statusLabel = "API unreachable";
  let statusTone = "text-red-800 border-red-800/40 bg-red-50";
  if (!apiDown && simulatorMode === "forced") {
    statusLabel = "Simulator Mode";
    statusTone = "border-amber-800 bg-amber-200 text-amber-950";
  } else if (!apiDown && !modelLoaded) {
    statusLabel = "Simulator Mode";
    statusTone = "border-amber-800 bg-amber-100 text-amber-950";
  } else if (!apiDown && modelLoaded && simulatorMode !== "forced") {
    statusLabel = "Live";
    statusTone = "border-stone-400 bg-white text-stone-700";
  }

  return (
    <div className="min-h-screen bg-canvas text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-300 bg-paper">
        <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-4 px-4">
          <p className="shrink-0 font-semibold tracking-[0.12em] text-stone-900">VARUNA AI</p>

          <nav aria-label="Primary" className="hidden flex-1 items-center gap-5 md:flex">
            {NAV.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "border-b-2 pb-0.5 text-[13px] tracking-wide",
                    isActive
                      ? "border-stone-900 font-semibold text-stone-900"
                      : "border-transparent text-stone-600 hover:text-stone-900",
                  )
                }
                end={item.end}
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn("hidden rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider sm:inline", statusTone)}
            >
              {statusLabel}
            </span>
            <button
              aria-expanded={menuOpen}
              aria-label="Open navigation"
              className="border border-stone-300 px-2 py-1 text-xs md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              Menu
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Mobile" className="border-t border-stone-200 px-4 py-2 md:hidden">
            {NAV.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn("block py-1.5 text-sm", isActive ? "font-semibold text-stone-900" : "text-stone-600")
                }
                end={item.end}
                key={item.to}
                onClick={() => setMenuOpen(false)}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-4">
        <Outlet />
      </main>
    </div>
  );
}
