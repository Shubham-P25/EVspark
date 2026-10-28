"use client";

import React, { useState } from "react";
import { Stack, TrafficSignal, Check } from "@phosphor-icons/react";
import { useMapUiStore } from "../stores/map-ui-store";

export function MapLayers() {
  const [open, setOpen] = useState(false);
  const mapType = useMapUiStore((s) => s.mapType);
  const setMapType = useMapUiStore((s) => s.setMapType);
  const showTraffic = useMapUiStore((s) => s.showTraffic);
  const toggleTraffic = useMapUiStore((s) => s.toggleTraffic);

  return (
    <div className="relative pointer-events-auto">
      {/* Layers Button */}
      <button
        type="button"
        title="Map layers"
        aria-label="Map layers"
        onClick={() => setOpen(!open)}
        className="w-11 h-11 rounded-2xl bg-white border border-[#DADCE0] shadow-md hover:bg-[#F8F9FA] flex items-center justify-center text-[#202124] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Stack size={22} weight="bold" className="text-[#1A73E8]" />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute bottom-14 right-0 w-64 bg-white rounded-2xl border border-[#DADCE0] shadow-xl p-4 z-50 space-y-3 text-[#202124]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DADCE0]">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#5F6368]">Map Type</span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-[#5F6368] hover:text-[#202124]"
            >
              Close
            </button>
          </div>

          {/* Roadmap vs Satellite */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMapType("roadmap")}
              className={`p-2.5 rounded-xl border text-[13px] font-medium flex items-center justify-between transition-colors ${
                mapType === "roadmap"
                  ? "border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]"
                  : "border-[#DADCE0] hover:bg-[#F8F9FA]"
              }`}
            >
              <span>Default</span>
              {mapType === "roadmap" && <Check size={16} weight="bold" />}
            </button>

            <button
              onClick={() => setMapType("satellite")}
              className={`p-2.5 rounded-xl border text-[13px] font-medium flex items-center justify-between transition-colors ${
                mapType === "satellite"
                  ? "border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]"
                  : "border-[#DADCE0] hover:bg-[#F8F9FA]"
              }`}
            >
              <span>Satellite</span>
              {mapType === "satellite" && <Check size={16} weight="bold" />}
            </button>
          </div>

          {/* Traffic Toggle */}
          <div className="pt-2 border-t border-[#DADCE0]">
            <button
              onClick={toggleTraffic}
              className={`w-full p-2.5 rounded-xl border text-[13px] font-medium flex items-center justify-between transition-colors ${
                showTraffic
                  ? "border-[#1E8E3E] bg-[#E6F4EA] text-[#137333]"
                  : "border-[#DADCE0] hover:bg-[#F8F9FA]"
              }`}
            >
              <div className="flex items-center gap-2">
                <TrafficSignal size={18} weight="fill" />
                <span>Live Traffic</span>
              </div>
              {showTraffic && <Check size={16} weight="bold" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
