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
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-5 px-4">
          {/* Wordmark — strong, readable, not shouty uppercase */}
          <span className="shrink-0 text-base font-semibold tracking-[0.08em] text-stone-950">
            VARUNA AI
          </span>

          <div className="h-4 w-px bg-stone-300 hidden md:block" />

          {/* Desktop nav — sentence-case, normal tracking */}
          <nav aria-label="Primary" className="hidden h-full items-center gap-1 md:flex">
            {NAV.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "h-full flex items-center px-3 border-b-[1.5px] text-[13.5px] tracking-normal transition-colors",
                    isActive
                      ? "border-stone-800 font-semibold text-stone-900"
                      : "border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800",
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

          {/* Status indicator — right-aligned, subtle */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 text-[11px] text-stone-500 sm:flex">
              <span
                className={cn(
                  "h-[7px] w-[7px] rounded-full flex-shrink-0",
                  statusLabel === "Live" && "bg-emerald-600",
                  statusLabel === "Simulator Mode" && "bg-amber-500 animate-pulse",
                  statusLabel === "API unreachable" && "bg-rose-600",
                )}
              />
              <span className="font-medium">{statusLabel}</span>
            </div>
            <button
              aria-expanded={menuOpen}
              aria-label="Open navigation"
              className="border border-stone-300 px-2.5 py-1 text-[13px] text-stone-600 hover:border-stone-400 hover:text-stone-800 transition-colors md:hidden"
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
                  cn("block py-2 text-[13.5px]", isActive ? "font-semibold text-stone-950" : "text-stone-500")
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
