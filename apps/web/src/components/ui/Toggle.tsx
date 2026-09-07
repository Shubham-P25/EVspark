import type { ChargerStatus } from "@/types";
import { cn } from "@/lib/utils";

export function Toggle({ status, onChange }: { status: ChargerStatus; onChange: (status: ChargerStatus) => void }) {
  const next: Record<ChargerStatus, ChargerStatus> = { free: "busy", busy: "maintenance", maintenance: "free" };
  return <button type="button" aria-label={`Set charger ${next[status]}`} onClick={() => onChange(next[status])} className={cn("relative h-6 w-11 rounded-full border border-border p-0.5 transition-colors", status === "free" ? "bg-green-dim" : status === "busy" ? "bg-red-dim" : "bg-yellow-dim")}><span className={cn("block h-4 w-4 rounded-full transition-transform", status === "free" ? "translate-x-5 bg-green" : status === "busy" ? "translate-x-0 bg-red" : "translate-x-2.5 bg-yellow")} /></button>;
}