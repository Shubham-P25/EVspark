"use client";

import React from "react";
import { Plus, Minus, NavigationArrow, GasPump } from "@phosphor-icons/react";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocateMe: () => void;
  onFuelRecommend: () => void;
  heading?: number | null;
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocateMe,
  onFuelRecommend,
  heading,
}: MapControlsProps) {
  return (
    <div className="flex flex-col gap-2.5 items-end">
      {/* Fuel recommendation button */}
      <button
        type="button"
        title="Find best charger now"
        aria-label="Best charger now"
        onClick={onFuelRecommend}
        className="size-11 rounded-2xl bg-white border border-[#DADCE0] shadow-md hover:bg-[#F8F9FA] flex items-center justify-center text-[#1E8E3E] hover:scale-105 transition active:scale-95 cursor-pointer"
      >
        <GasPump size={22} weight="fill" />
      </button>

      {/* Recenter / Compass button */}
      <button
        type="button"
        title="Recenter on my location"
        aria-label="Recenter on me"
        onClick={onLocateMe}
        className="size-11 rounded-2xl bg-white border border-[#DADCE0] shadow-md hover:bg-[#F8F9FA] flex items-center justify-center text-[#1A73E8] hover:scale-105 transition active:scale-95 cursor-pointer"
      >
        <NavigationArrow
          size={22}
          weight="fill"
          style={{
            transform: typeof heading === "number" ? `rotate(${heading}deg)` : undefined,
            transition: "transform 0.3s ease",
          }}
        />
      </button>

      {/* Zoom stack */}
      <div className="flex flex-col rounded-2xl bg-white border border-[#DADCE0] shadow-md overflow-hidden">
        <button
          type="button"
          title="Zoom in"
          aria-label="Zoom in"
          onClick={onZoomIn}
          className="size-11 flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] border-b border-[#DADCE0] transition active:bg-slate-100 cursor-pointer"
        >
          <Plus size={20} weight="bold" />
        </button>
        <button
          type="button"
          title="Zoom out"
          aria-label="Zoom out"
          onClick={onZoomOut}
          className="size-11 flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] transition active:bg-slate-100 cursor-pointer"
        >
          <Minus size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
}
