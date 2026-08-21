export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
      <p className="text-sm font-medium text-stone-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-stone-600">{body}</p>
    </div>
  );
}

export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-red-800/40 bg-red-50 px-4 py-4" role="alert">
      <p className="text-sm font-medium text-red-950">{title}</p>
      <p className="mt-1 font-mono text-xs leading-5 text-red-900">{body}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-200 ${className ?? "h-4 w-full"}`} />;
}
