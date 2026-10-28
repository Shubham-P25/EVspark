"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePinStore } from "../stores/pin-store";
import { getSocket } from "@/lib/socket";
import { apiFetch } from "@/lib/api";

interface LiveStats {
  callsToday: number;
  dailyCap: number;
  circuitBreakerOpen: boolean;
}

export function PerfOverlay() {
  const [visible, setVisible] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const pins = usePinStore((s) => s.pins);
  const metrics = usePinStore((s) => s.metrics);

  // Keyboard shortcut listener: Shift+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "P" || e.key === "p")) {
        // Prevent typing into input if focused
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }
        e.preventDefault();
        setVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Poll socket connection state when visible
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      try {
        const s = getSocket();
        setSocketConnected(Boolean(s?.connected));
      } catch {
        setSocketConnected(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  // Query dev-only live stats
  const { data: liveStats } = useQuery<LiveStats>({
    queryKey: ["live-stats"],
    queryFn: () => apiFetch<LiveStats>("/api/stations/live-stats"),
    enabled: visible && process.env.NODE_ENV !== "production",
    refetchInterval: 5000,
  });

  // Only render in non-production environments
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (!visible) {
    return (
      <div className="fixed bottom-2 left-2 z-50 pointer-events-auto">
        <button
          type="button"
          onClick={() => setVisible(true)}
          title="Press Shift+P to toggle Perf Overlay"
          className="px-2 py-1 rounded bg-[#202124]/70 hover:bg-[#202124] text-[10px] font-mono text-white/80 hover:text-white transition-opacity select-none cursor-pointer"
        >
          ⚡ Shift+P
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-50 w-72 rounded-xl bg-[#202124] text-white p-3.5 shadow-2xl border border-white/10 font-mono text-xs select-none pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-[#1E8E3E] animate-pulse" />
          <span className="font-semibold text-white tracking-wide">PERF METRICS</span>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-white/60 hover:text-white text-sm font-bold px-1 rounded cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Metrics List */}
      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between items-center">
          <span className="text-white/60">Pins in Store:</span>
          <span className="font-bold text-[#8AB4F8]">{pins.size}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/60">Markers Rendered:</span>
          <span className="font-bold text-[#81C995]">{metrics.renderedCount} / 150</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/60">Last Tile Fetch:</span>
          <span className="font-bold text-white">
            {metrics.lastFetchMs > 0 ? `${metrics.lastFetchMs} ms` : "cached"}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/60">Cache Hits / Misses:</span>
          <span className="font-bold text-white">
            {metrics.cacheHits} / {metrics.cacheMisses}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-white/60">Socket.io Delta:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
              socketConnected
                ? "bg-[#1E8E3E]/30 text-[#81C995]"
                : "bg-[#D93025]/30 text-[#F28B82]"
            }`}
          >
            {socketConnected ? "CONNECTED" : "DISCONNECTED"}
          </span>
        </div>

        <div className="flex justify-between items-center pt-1 border-t border-white/10">
          <span className="text-white/60">Google Live Calls:</span>
          <span className="font-bold text-[#FDD663]">
            {liveStats?.callsToday ?? 0} / {liveStats?.dailyCap ?? 300}
          </span>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
        <span>Toggle: Shift+P</span>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.removeItem("evspark:pins:v1");
              usePinStore.getState().clearPins();
            }
          }}
          className="text-white/60 hover:text-white underline cursor-pointer"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}

export default PerfOverlay;
