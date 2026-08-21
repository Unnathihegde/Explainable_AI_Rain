import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1 block text-xs font-medium tracking-wide text-stone-600">{label}</span>
      <input
        className={cn(
          "w-full rounded-sm border bg-white px-2.5 py-1.5 font-mono text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-700",
          error ? "border-red-700" : "border-stone-300",
          className,
        )}
        id={inputId}
        {...props}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-800">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-stone-500">{hint}</span>
      ) : null}
    </label>
  );
}
