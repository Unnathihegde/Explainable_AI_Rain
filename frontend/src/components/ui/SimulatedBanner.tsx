export function SimulatedBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="border-2 border-amber-800 bg-amber-200 px-3 py-2 text-amber-950"
      data-testid="simulated-banner"
      role="status"
    >
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em]">
        Simulated — not a real model output
      </p>
      {!compact && (
        <p className="mt-1 text-xs leading-5">
          The rainfall model is not deployed (API returns HTTP 501). These values are generated locally so the
          workflow can be exercised. Do not use them for operations.
        </p>
      )}
    </div>
  );
}
