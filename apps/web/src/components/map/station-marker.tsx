"use client";

import { memo, useState } from "react";
import { OverlayViewF, OverlayView } from "@react-google-maps/api";
import { Lightning, Clock, CheckCircle } from "@phosphor-icons/react";
import type { MarkerColor } from "@/lib/tokens";
import { useGhostSimulationStore } from "@/stores/ghost-simulation-store";
import { getPrimaryStationPhoto } from "@/lib/station-photos";

export interface MarkerStation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  color: MarkerColor;
  photoUrl?: string | null;
  isOverloaded?: boolean;
  waitLabel?: string;
  availableChargers?: number;
  totalChargers?: number;
  powerKw?: number;
}

const COLOR_THEMES: Record<
  MarkerColor,
  {
    bgGradient: string;
    pinFill: string;
    neonGlow: string;
    haloBg: string;
    badgeBg: string;
    badgeText: string;
    dotColor: string;
  }
> = {
  green: {
    bgGradient: "from-emerald-400 via-emerald-500 to-teal-600",
    pinFill: "#10B981",
    neonGlow: "0 0 28px rgba(16, 185, 129, 0.6), 0 8px 20px rgba(0, 0, 0, 0.35)",
    haloBg: "bg-emerald-500/25",
    badgeBg: "bg-emerald-950/85 border-emerald-400/40 text-emerald-200",
    badgeText: "text-emerald-400",
    dotColor: "bg-emerald-400",
  },
  amber: {
    bgGradient: "from-amber-400 via-amber-500 to-orange-500",
    pinFill: "#F59E0B",
    neonGlow: "0 0 28px rgba(245, 158, 11, 0.6), 0 8px 20px rgba(0, 0, 0, 0.35)",
    haloBg: "bg-amber-500/25",
    badgeBg: "bg-amber-950/85 border-amber-400/40 text-amber-200",
    badgeText: "text-amber-400",
    dotColor: "bg-amber-400",
  },
  red: {
    bgGradient: "from-rose-500 via-red-500 to-pink-600",
    pinFill: "#EF4444",
    neonGlow: "0 0 32px rgba(239, 68, 68, 0.7), 0 8px 20px rgba(0, 0, 0, 0.4)",
    haloBg: "bg-rose-500/30",
    badgeBg: "bg-rose-950/85 border-rose-400/40 text-rose-200",
    badgeText: "text-rose-400",
    dotColor: "bg-rose-400",
  },
  grey: {
    bgGradient: "from-slate-500 to-slate-700",
    pinFill: "#64748B",
    neonGlow: "0 0 16px rgba(100, 116, 139, 0.4), 0 6px 14px rgba(0, 0, 0, 0.25)",
    haloBg: "bg-slate-500/20",
    badgeBg: "bg-slate-900/85 border-slate-400/40 text-slate-200",
    badgeText: "text-slate-400",
    dotColor: "bg-slate-400",
  },
};

function StationMarkerBase({
  s,
  selected,
  showLabel,
  onSelect,
}: {
  s: MarkerStation;
  selected: boolean;
  showLabel: boolean;
  onSelect: (id: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Read real-time live override from ghost simulation store
  const simOverride = useGhostSimulationStore((state) => state.stationOverrides[s.id]);

  const liveAvailable =
    simOverride !== undefined ? simOverride.availableChargers : s.availableChargers ?? 1;
  const liveWait = simOverride !== undefined ? simOverride.waitMinutes : 0;
  const isFree = liveAvailable > 0;

  // Determine color dynamically
  let effectiveColor: MarkerColor = "green";
  if (!isFree) {
    if (liveWait > 25 || s.color === "red") {
      effectiveColor = "red";
    } else {
      effectiveColor = "amber";
    }
  } else {
    effectiveColor = "green";
  }

  const theme = COLOR_THEMES[effectiveColor];
  const photo = getPrimaryStationPhoto({
    id: s.id,
    name: s.name,
    photoUrl: s.photoUrl,
  });

  return (
    <OverlayViewF
      position={{ lat: s.lat, lng: s.lng }}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h })}
    >
      <div
        className="group relative flex flex-col items-center select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          aria-label={`${s.name}, ${isFree ? "Free station available" : `${liveWait}m wait`}`}
          onClick={() => onSelect(s.id)}
          className="relative flex flex-col items-center outline-none cursor-pointer transition-transform duration-200"
          style={{
            transform: selected ? "scale(1.22)" : isHovered ? "scale(1.15)" : undefined,
            zIndex: selected ? 60 : isHovered ? 55 : 20,
          }}
        >
          {/* Ground Neon Halo / Underglow */}
          <div
            className={`absolute -bottom-2 size-12 rounded-full ${theme.haloBg} blur-md pointer-events-none transition-all duration-300`}
            style={{
              opacity: selected || isHovered ? 1 : 0.75,
              transform: selected || isHovered ? "scale(1.3)" : "scale(1)",
            }}
          />

          {/* Overload / Pulsing Radar Ring for Full or Selected Stations */}
          {(effectiveColor === "red" || selected) && (
            <span
              className="absolute -top-1 size-13 rounded-full animate-ping pointer-events-none opacity-40"
              style={{
                backgroundColor: effectiveColor === "red" ? "rgba(239, 68, 68, 0.5)" : "rgba(16, 185, 129, 0.4)",
              }}
            />
          )}

          {/* Futuristic Metallic & Acrylic Pin Body */}
          <div
            className={`relative flex items-center justify-center size-11 rounded-2xl bg-gradient-to-br ${theme.bgGradient} p-0.5 border-2 border-white/95 transition-all duration-300`}
            style={{
              boxShadow: selected
                ? "0 0 35px rgba(26, 115, 232, 0.8), 0 10px 25px rgba(0, 0, 0, 0.4)"
                : theme.neonGlow,
            }}
          >
            {/* Inner glass layer */}
            <div className="flex items-center justify-center size-full rounded-xl bg-black/20 backdrop-blur-xs">
              <Lightning size={22} weight="fill" className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
            </div>

            {/* Fast Power Tag (top-right corner pill) */}
            <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-white/40 shadow-md text-[9px] font-black text-amber-300 tracking-wider">
              {s.powerKw ? `${s.powerKw}k` : "FAST"}
            </div>

            {/* Free Charger Counter Bubble (bottom-left) */}
            <div
              className={`absolute -bottom-1 -left-1.5 size-4.5 rounded-full border border-white/80 flex items-center justify-center text-[10px] font-extrabold shadow-md ${
                isFree ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
              }`}
            >
              {liveAvailable}
            </div>

            {/* Geometric Teardrop Pin Tail */}
            <div
              className="absolute -bottom-1.5 size-3 rotate-45 border-r-2 border-b-2 border-white/90"
              style={{
                backgroundColor: theme.pinFill,
              }}
            />
          </div>

          {/* REQUIREMENT 3: Dynamic Waiting Time vs Free Station Available Label */}
          {(showLabel || isHovered || selected) && (
            <div
              className={`mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-xl shadow-xl border text-[11px] font-extrabold tracking-tight whitespace-nowrap transition-all duration-200 ${theme.badgeBg}`}
              style={{
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
              }}
            >
              {isFree ? (
                <>
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34D399]" />
                  <span className="text-emerald-300 font-bold">
                    Free station available
                    {liveAvailable > 1 && (
                      <span className="text-emerald-400/90 font-medium ml-1">
                        • {liveAvailable} free
                      </span>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <Clock size={12} weight="fill" className="text-amber-400 shrink-0" />
                  <span className="text-amber-300 font-bold">
                    {liveWait > 0 ? `${liveWait}m wait` : "Queue Full"}
                  </span>
                  {simOverride && simOverride.queueStack.length > 0 && (
                    <span className="text-rose-300 text-[10px] font-medium">
                      (+{simOverride.queueStack.length} queued)
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </button>

        {/* Hover Micro-Preview Card with Real Station Photo */}
        {isHovered && !selected && (
          <div className="absolute bottom-18 z-50 w-52 p-2 rounded-2xl bg-slate-900/95 backdrop-blur-2xl text-white shadow-2xl border border-white/20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
            {/* Station Image */}
            <div className="relative h-24 w-full rounded-xl overflow-hidden mb-2 bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt={s.name} className="size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-emerald-400">
                Verified Hub
              </span>
            </div>

            <h4 className="text-xs font-bold truncate text-white leading-tight mb-1">
              {s.name}
            </h4>

            <div className="flex items-center justify-between text-[10px]">
              <span className={isFree ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                {isFree ? "Free station available" : `⏱ ${liveWait} min wait`}
              </span>
              <span className="text-slate-400 font-mono">
                {liveAvailable} chargers
              </span>
            </div>
          </div>
        )}
      </div>
    </OverlayViewF>
  );
}

export const StationMarker = memo(StationMarkerBase);
