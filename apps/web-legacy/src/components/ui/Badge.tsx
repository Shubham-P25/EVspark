import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "green" | "yellow" | "red" | "blue" | "primary" | "default" | "outline";
  dot?: boolean;
}

export function Badge({ variant = "default", dot = false, className, children, ...props }: BadgeProps) {
  const styles: Record<string, string> = {
    green: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    yellow: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    red: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
    blue: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
    primary: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    default: "bg-white/10 text-gray-300 border border-white/10",
    outline: "border border-white/20 text-gray-300 bg-transparent",
  };

  const dotColors: Record<string, string> = {
    green: "bg-emerald-400",
    yellow: "bg-amber-400",
    red: "bg-rose-400",
    blue: "bg-cyan-400",
    default: "bg-gray-400",
    outline: "bg-gray-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide backdrop-blur-sm",
        styles[variant] || styles.default,
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", dotColors[variant] || dotColors.default)} />}
      {children}
    </span>
  );
}