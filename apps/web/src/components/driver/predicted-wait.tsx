"use client";

import { useNow } from "@/hooks/use-now";
import { mmss } from "@/lib/format";
import { stationWait, type LiveCharger } from "@/lib/live";
import { useGhostSimulationStore } from "@/stores/ghost-simulation-store";
import { CheckCircle, Clock, Lightning, Users } from "@phosphor-icons/react";

interface PredictedWaitProps {
  stationId?: string;
  chargers: LiveCharger[];
  queueLength: number;
}

export function PredictedWait({ stationId, chargers, queueLength }: PredictedWaitProps) {
  const now = useNow(1000); // re-renders every second for live countdown
  const simOverride = useGhostSimulationStore((state) =>
    stationId ? state.stationOverrides[stationId] : undefined
  );

  // Compute live availability and wait
  const usableChargers = chargers.filter((c) => c.status === "FREE" || c.status === "BUSY");
  const fallbackAvailable = chargers.filter((c) => c.status === "FREE").length;

  const availableCount =
    simOverride !== undefined ? simOverride.availableChargers : fallbackAvailable;

  const isFree = availableCount > 0;

  // Wait time in minutes
  const w = stationWait(chargers, queueLength, now);
  const simWait = simOverride !== undefined ? simOverride.waitMinutes : 0;
  const effectiveWaitMinutes =
    simOverride !== undefined
      ? simWait
      : w.kind === "wait"
      ? Math.max(1, Math.round(w.seconds / 60))
      : 20;

  const queuedCarsCount =
    simOverride !== undefined ? simOverride.queueStack.length : queueLength;

  if (isFree) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <CheckCircle size={26} weight="fill" className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                Current Availability
              </p>
            </div>
            {/* REQUIREMENT 3: "if chargers are free then say free station avalible" */}
            <p className="text-lg font-black text-emerald-950 tracking-tight">
              Free station available
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs">
            {availableCount} {availableCount === 1 ? "Bay" : "Bays"} Free
          </span>
          <p className="text-[11px] font-medium text-emerald-700 mt-1">
            Instant plug-in
          </p>
        </div>
      </div>
    );
  }

  // All chargers occupied: display dynamic waiting time (15 / 20 / 25 / 30 mins)
  return (
    <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50/50 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
          <Clock size={26} weight="fill" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
              Estimated Wait Time
            </p>
          </div>
          {/* REQUIREMENT 3: "after every chargers occupied then say waiting time give values 15/20/25/30 after after a certain time we get less time" */}
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black font-mono text-amber-950 tabular-nums">
              {effectiveWaitMinutes} mins
            </p>
            <span className="text-[11px] font-bold text-amber-700">
              (Shrinks 5m every min)
            </span>
          </div>
        </div>
      </div>

      <div className="text-right">
        {queuedCarsCount > 0 ? (
          <div className="flex items-center gap-1 justify-end text-xs font-bold text-amber-900">
            <Users size={14} weight="bold" />
            <span>{queuedCarsCount} in stack</span>
          </div>
        ) : (
          <span className="text-xs font-bold text-amber-800">Next Bay Soon</span>
        )}
        <p className="text-[11px] text-amber-700 mt-0.5">
          {queuedCarsCount > 0 ? `+${queuedCarsCount * 15}m queue stack` : "All chargers in use"}
        </p>
      </div>
    </div>
  );
}
