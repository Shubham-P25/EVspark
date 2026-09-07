import { cn } from "@/lib/utils";

export function Badge({ variant = "default", children }: { variant?: "green" | "yellow" | "red" | "primary" | "default"; children: React.ReactNode }) {
  const styles = { green: "bg-green-dim text-green", yellow: "bg-yellow-dim text-yellow", red: "bg-red-dim text-red", primary: "bg-primary-dim text-primary", default: "bg-surface-3 text-muted" };
  return <span className={cn("inline-flex rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-wider", styles[variant])}>{children}</span>;
}