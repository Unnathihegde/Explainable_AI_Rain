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
  if (!apiDown && simulatorMode === "forced") {
    statusLabel = "Simulator Mode";
  } else if (!apiDown && !modelLoaded) {
    statusLabel = "Simulator Mode";
  } else if (!apiDown && modelLoaded && simulatorMode !== "forced") {
    statusLabel = "Live";
  }

  return (
    <div className="min-h-screen bg-canvas text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-300 bg-paper">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4">
          <span className="shrink-0 font-bold text-sm tracking-[0.16em] text-stone-950 uppercase">
            VARUNA AI
          </span>

          <div className="h-4 w-px bg-stone-300 hidden md:block" />

          <nav aria-label="Primary" className="hidden h-full items-center gap-6 md:flex">
            {NAV.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "h-full flex items-center border-b-2 text-[12.5px] uppercase tracking-wider transition-colors pt-[2px]",
                    isActive
                      ? "border-stone-950 font-semibold text-stone-950"
                      : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-950",
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

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-stone-600 sm:flex">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  statusLabel === "Live" && "bg-emerald-600",
                  statusLabel === "Simulator Mode" && "bg-amber-500 animate-pulse",
                  statusLabel === "API unreachable" && "bg-rose-600",
                )}
              />
              <span>{statusLabel}</span>
            </div>
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
                  cn("block py-2 text-sm uppercase tracking-wider font-mono", isActive ? "font-semibold text-stone-950" : "text-stone-500")
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
