import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { OverviewPage } from "./features/overview/OverviewPage";
import { AlertsPage } from "./features/alerts/AlertsPage";
import { AnalysisPage } from "./features/analysis/AnalysisPage";
import { ExplainabilityPage } from "./features/explainability/ExplainabilityPage";
import { HistoryPage } from "./features/history/HistoryPage";
import { SystemStatusPage } from "./features/system-status/SystemStatusPage";
import { useUiStore } from "./store/uiStore";

export default function App() {
  const loadHistoryFromStorage = useUiStore((s) => s.loadHistoryFromStorage);

  useEffect(() => {
    loadHistoryFromStorage();
  }, [loadHistoryFromStorage]);

  return (
    <Routes>
      <Route element={<AppShell />} path="/">
        <Route element={<OverviewPage />} index />
        <Route element={<AlertsPage />} path="alerts" />
        <Route element={<AnalysisPage />} path="analysis" />
        <Route element={<ExplainabilityPage />} path="explainability" />
        <Route element={<HistoryPage />} path="history" />
        <Route element={<SystemStatusPage />} path="status" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}
