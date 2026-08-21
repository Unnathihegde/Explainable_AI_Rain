import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Panel({
  title,
  description,
  children,
  className,
  actions,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={cn("border border-stone-300 bg-paper", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-stone-200 px-4 py-2.5">
          <div>
            {title && <h2 className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-stone-600">{title}</h2>}
            {description && <p className="mt-0.5 text-[11px] leading-relaxed text-stone-500">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
