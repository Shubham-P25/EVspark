import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export function GlassCard({ className, hoverEffect = false, children, ...props }: GlassCardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          "glass-card p-4 transition-all duration-200",
          hoverEffect && "glass-card-hover",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
