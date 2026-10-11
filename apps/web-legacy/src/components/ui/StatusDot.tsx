import { cn } from "@/lib/utils";

export function StatusDot({ status, pulse = false, size = "md" }: { status: "green" | "yellow" | "red" | "primary"; pulse?: boolean; size?: "sm" | "md" }) {
  const colors = { green: "bg-green", yellow: "bg-yellow", red: "bg-red", primary: "bg-primary" };
  return <span className={cn("relative inline-flex rounded-full", size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5", colors[status], pulse && "live-pulse")} aria-label={`${status} status`} />;
}