import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-block animate-pulse rounded-lg bg-white/5", className)}
      aria-hidden="true"
      {...props}
    />
  );
}