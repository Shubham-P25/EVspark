"use client";

import { useNow } from "@/hooks/use-now";
import { mmss } from "@/lib/format";
import { stationWait, type LiveCharger } from "@/lib/live";

export function PredictedWait({
  chargers,
  queueLength,
}: {
  chargers: LiveCharger[];
  queueLength: number;
}) {
  const now = useNow(1000); // re-renders every second => visibly counts down
  const w = stationWait(chargers, queueLength, now);

  return (
    <div className="flex items-center justify-between rounded-xl border border-[#DADCE0] bg-[#F8F9FA] px-4 py-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[#5F6368]">
          Predicted wait
        </p>
        <p
          className="font-mono text-3xl font-semibold tabular-nums text-[#202124]"
          aria-live="off"
        >
          {w.kind === "free" ? "–" : w.kind === "wait" ? mmss(w.seconds) : "n/a"}
        </p>
      </div>
      <p className="max-w-[10rem] text-right text-xs text-[#5F6368]">
        {w.kind === "free" && "A charger is free right now"}
        {w.kind === "wait" &&
          `Until next charger frees${w.queue > 0 ? ` · ${w.queue} in queue` : ""}`}
        {w.kind === "unavailable" && "No charger in service"}
      </p>
    </div>
  );
}
