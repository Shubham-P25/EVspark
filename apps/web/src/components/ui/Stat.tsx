"use client";

import { useCountUp } from "@/hooks/useCountUp";
import { Card } from "@/components/ui/Card";

export function Stat({ label, value, prefix = "", suffix = "", delta }: { label: string; value: number; prefix?: string; suffix?: string; delta?: number }) {
  const animated = useCountUp(value);
  return <Card className="p-5"><p className="text-xs text-muted">{label}</p><p className="mt-3 font-mono text-2xl text-text">{prefix}{animated.toLocaleString()}{suffix}</p>{delta !== undefined && <p className={`mt-2 text-xs ${delta >= 0 ? "text-green" : "text-red"}`}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs yesterday</p>}</Card>;
}