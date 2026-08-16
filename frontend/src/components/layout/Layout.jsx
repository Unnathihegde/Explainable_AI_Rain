// Application shell for the rainfall intelligence workspace.
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">VARUNA AI</h1>
            <p className="text-xs text-slate-500">
              Explainable AI - Extreme Rainfall Intelligence &amp; Early Warning System
            </p>
          </div>
          <span className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500">
            Rainfall Intelligence
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
