import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "border-stone-900 bg-stone-900 text-stone-50 hover:bg-stone-800",
        variant === "secondary" && "border-stone-300 bg-white text-stone-900 hover:bg-stone-50",
        variant === "ghost" && "border-transparent bg-transparent text-stone-700 hover:bg-stone-100",
        className,
      )}
      {...props}
    />
  );
}
