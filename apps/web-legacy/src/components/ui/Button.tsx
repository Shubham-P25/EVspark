import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "glass" | "link";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 active:scale-[0.98]",
    secondary:
      "bg-white/10 hover:bg-white/15 text-white border border-white/15 active:scale-[0.98]",
    danger:
      "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 active:scale-[0.98]",
    ghost:
      "text-gray-400 hover:text-white hover:bg-white/5 active:scale-[0.98]",
    glass:
      "bg-slate-900/60 hover:bg-slate-800/80 text-white border border-white/10 backdrop-blur-md active:scale-[0.98]",
    link:
      "text-emerald-500 hover:underline p-0 h-auto bg-transparent shadow-none active:scale-100",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-12 px-6 text-base rounded-xl",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}