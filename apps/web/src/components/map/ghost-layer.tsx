"use client";

import { useEffect, useRef, useState } from "react";
import { OverlayViewF, OverlayView } from "@react-google-maps/api";
import { useGhostSimulationStore, type GhostCar } from "@/stores/ghost-simulation-store";
import { Lightning, Clock, ArrowRight } from "@phosphor-icons/react";

interface GhostLayerProps {
  stations?: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    availableChargers?: number;
    chargers?: any[];
  }[];
}

export function GhostLayer({ stations = [] }: GhostLayerProps) {
  const {
    ghosts,
    showGhostLayer,
    isPaused,
    simSpeed,
    tickSimulation,
    shrinkWaitTimes,
    spawnGhostCar,
    initOrGetStationState,
  } = useGhostSimulationStore();

  const [hoveredGhostId, setHoveredGhostId] = useState<string | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const shrinkTimerRef = useRef<number>(0);
  const initializedStationsRef = useRef<boolean>(false);

  // Initialize station states in store
  useEffect(() => {
    if (!stations.length) return;
    for (const st of stations) {
      initOrGetStationState(st);
    }

    // Auto-seed initial 4 ghost cars heading to nearby stations if none exist
    if (!initializedStationsRef.current && ghosts.length === 0 && stations.length > 0) {
      initializedStationsRef.current = true;
      const count = Math.min(4, stations.length);
      for (let i = 0; i < count; i++) {
        spawnGhostCar(stations[i]);
      }
    }
  }, [stations, initOrGetStationState, ghosts.length, spawnGhostCar]);

  // Main animation and physics tick loop
  useEffect(() => {
    let animFrame = 0;

    const frameLoop = (now: number) => {
      const delta = Math.min(100, now - lastTimeRef.current);
      lastTimeRef.current = now;

      if (!isPaused) {
        tickSimulation(delta);

        // Dynamic 5-minute wait time shrinkage timer
        // At 1x speed: every 60,000ms (1 min). At 5x speed: every 12,000ms. At 10x: every 6,000ms.
        const shrinkIntervalMs = 60_000 / Math.max(1, simSpeed);
        shrinkTimerRef.current += delta;
        if (shrinkTimerRef.current >= shrinkIntervalMs) {
          shrinkTimerRef.current = 0;
          shrinkWaitTimes(5); // "waiting time will be srink 5 min every minutes or random time"
        }
      }

      animFrame = requestAnimationFrame(frameLoop);
    };

    animFrame = requestAnimationFrame(frameLoop);
    return () => cancelAnimationFrame(animFrame);
  }, [isPaused, simSpeed, tickSimulation, shrinkWaitTimes]);

  if (!showGhostLayer) return null;

  return (
    <>
      {ghosts.map((g) => {
        const isHovered = hoveredGhostId === g.id;
        const isDocked = g.status === "docked_charging";
        const isWaiting = g.status === "waiting_in_stack";

        return (
          <OverlayViewF
            key={g.id}
            position={g.currentPos}
            mapPaneName={OverlayView.OVERLAY_LAYER}
            getPixelPositionOffset={(w, h) => ({ x: -w / 2, y: -h / 2 })}
          >
            <div
              className="relative flex items-center justify-center cursor-pointer select-none transition-all duration-150"
              onMouseEnter={() => setHoveredGhostId(g.id)}
              onMouseLeave={() => setHoveredGhostId(null)}
              style={{
                zIndex: isHovered ? 40 : 15,
                transform: `scale(${isHovered ? 1.25 : 1})`,
              }}
            >
              {/* Headlight Beams */}
              {!isDocked && !isWaiting && (
                <div
                  className="absolute pointer-events-none origin-bottom"
                  style={{
                    transform: `rotate(${g.heading}deg) translateY(-22px)`,
                    width: 0,
                    height: 0,
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderTop: "24px solid rgba(254, 240, 138, 0.25)",
                    filter: "blur(2px)",
                  }}
                />
              )}

              {/* Cyan / Blue Ground Underglow */}
              <div
                className={`absolute -inset-1.5 rounded-full pointer-events-none blur-xs transition-opacity ${
                  isDocked
                    ? "bg-emerald-500/30 animate-pulse"
                    : isWaiting
                    ? "bg-amber-500/30"
                    : "bg-blue-500/30"
                }`}
              />

              {/* Top-Down Aerodynamic EV Car Graphic */}
              <div
                className={`relative w-6 h-10 rounded-[7px] border shadow-xl flex flex-col items-center justify-between p-0.5 overflow-hidden transition-transform duration-100 ${
                  isDocked
                    ? "bg-emerald-700 border-emerald-300"
                    : isWaiting
                    ? "bg-amber-700 border-amber-300"
                    : "bg-[#1A73E8] border-white/95"
                }`}
                style={{
                  transform: `rotate(${g.heading}deg)`,
                  boxShadow: isDocked
                    ? "0 0 14px rgba(16, 185, 129, 0.7)"
                    : isWaiting
                    ? "0 0 14px rgba(245, 158, 11, 0.7)"
                    : "0 0 12px rgba(26, 115, 232, 0.6)",
                }}
              >
                {/* Front Windshield Glass */}
                <div className="w-4.5 h-2 rounded-t-[3px] bg-sky-200/90 shadow-inner" />

                {/* Roof & Battery Status Badge */}
                <div className="size-2.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                  <Lightning size={8} weight="fill" className="text-amber-500" />
                </div>

                {/* Rear Windshield Glass */}
                <div className="w-4.5 h-2 rounded-b-[3px] bg-slate-900/70" />

                {/* Dual Front Headlights */}
                <span className="absolute top-0.5 left-0.5 size-1 rounded-full bg-yellow-200 shadow-[0_0_6px_#FEF08A]" />
                <span className="absolute top-0.5 right-0.5 size-1 rounded-full bg-yellow-200 shadow-[0_0_6px_#FEF08A]" />

                {/* Dual Rear Taillights */}
                <span className="absolute bottom-0.5 left-0.5 size-1 rounded-full bg-rose-500 shadow-[0_0_4px_#F43F5E]" />
                <span className="absolute bottom-0.5 right-0.5 size-1 rounded-full bg-rose-500 shadow-[0_0_4px_#F43F5E]" />
              </div>

              {/* Status Floating Pill (shown on hover or when queued/docked) */}
              {(isHovered || isWaiting || isDocked) && (
                <div className="absolute -top-9 whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-950/95 backdrop-blur-md border border-white/20 text-white shadow-xl flex items-center gap-1.5 pointer-events-none animate-in fade-in duration-150">
                  {isDocked ? (
                    <>
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-extrabold text-emerald-300">
                        ⚡ Charging Docked
                      </span>
                    </>
                  ) : isWaiting ? (
                    <>
                      <Clock size={11} weight="fill" className="text-amber-400" />
                      <span className="text-[10px] font-extrabold text-amber-300">
                        Queued #{g.queueIndex || 1} (+15m)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-slate-200">
                        {g.plate}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-semibold">
                        {g.batterySoc}%
                      </span>
                      <ArrowRight size={10} className="text-slate-400" />
                      <span className="text-[10px] text-blue-300 truncate max-w-[90px]">
                        {g.targetStationName}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </OverlayViewF>
        );
      })}
    </>
  );
}
