"use client";

import React from "react";
import { Plus, Minus, NavigationArrow, GasPump } from "@phosphor-icons/react";
import { useMap } from "@vis.gl/react-google-maps";
import { useMapActions } from "../hooks/useMapActions";
import { MapLayers } from "./MapLayers";

interface MapControlsProps {
  userLocation?: { lat: number; lng: number } | null;
  onLocationFound?: (loc: { lat: number; lng: number }) => void;
  onRouteRequested?: (dest: { lat: number; lng: number }) => void;
  heading?: number | null;
}

export function MapControls({
  userLocation,
  onLocationFound,
  onRouteRequested,
  heading,
}: MapControlsProps) {
  const map = useMap();
  const { locateMe, fuel } = useMapActions();

  const handleZoomIn = () => {
    if (!map) return;
    map.setZoom((map.getZoom() || 13) + 1);
  };

  const handleZoomOut = () => {
    if (!map) return;
    map.setZoom((map.getZoom() || 13) - 1);
  };

  return (
    <div className="flex flex-col gap-2.5 items-end pointer-events-auto">
      {/* Map Layers (Satellite / Traffic) */}
      <MapLayers />

      {/* Fuel Button (Best Station Pick) */}
      <button
        type="button"
        title="Find best station now"
        aria-label="Best station now"
        onClick={() => fuel(userLocation, onRouteRequested)}
        className="w-11 h-11 rounded-2xl bg-white border border-[#DADCE0] shadow-md hover:bg-[#F8F9FA] flex items-center justify-center text-[#1E8E3E] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <GasPump size={22} weight="fill" />
      </button>

      {/* Locate Me Button */}
      <button
        type="button"
        title="Locate me"
        aria-label="Locate me"
        onClick={() => locateMe(onLocationFound)}
        className="w-11 h-11 rounded-2xl bg-white border border-[#DADCE0] shadow-md hover:bg-[#F8F9FA] flex items-center justify-center text-[#1A73E8] hover:scale-105 active:scale-95 transition-all cursor-pointer"
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

      {/* Zoom Controls */}
      <div className="flex flex-col rounded-2xl bg-white border border-[#DADCE0] shadow-md overflow-hidden">
        <button
          type="button"
          title="Zoom in"
          aria-label="Zoom in"
          onClick={handleZoomIn}
          className="w-11 h-11 flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] border-b border-[#DADCE0] active:bg-[#E8EAED] transition-colors cursor-pointer"
        >
          <Plus size={18} weight="bold" />
        </button>
        <button
          type="button"
          title="Zoom out"
          aria-label="Zoom out"
          onClick={handleZoomOut}
          className="w-11 h-11 flex items-center justify-center text-[#202124] hover:bg-[#F8F9FA] active:bg-[#E8EAED] transition-colors cursor-pointer"
        >
          <Minus size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}
