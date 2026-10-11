"use client";

import React, { useState } from "react";
import { Stack, Check } from "@phosphor-icons/react";
import type { MapTypeId, StylePreset } from "./ev-map";

interface MapLayersProps {
  mapTypeId: MapTypeId;
  onMapTypeIdChange: (type: MapTypeId) => void;
  stylePreset: StylePreset;
  onStylePresetChange: (preset: StylePreset) => void;
  traffic: boolean;
  onTrafficChange: (val: boolean) => void;
  transit: boolean;
  onTransitChange: (val: boolean) => void;
  bicycling: boolean;
  onBicyclingChange: (val: boolean) => void;
}

export function MapLayers({
  mapTypeId,
  onMapTypeIdChange,
  stylePreset,
  onStylePresetChange,
  traffic,
  onTrafficChange,
  transit,
  onTransitChange,
  bicycling,
  onBicyclingChange,
}: MapLayersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Map layers"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-[#DADCE0] shadow-md hover:bg-[#F8F9FA] text-[#202124] text-sm font-medium transition cursor-pointer"
      >
        <Stack size={18} className="text-[#1A73E8]" weight="bold" />
        <span className="hidden sm:inline">Layers</span>
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 w-72 bg-white rounded-2xl border border-[#DADCE0] shadow-2xl p-4 z-30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#DADCE0]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6368]">Map Type</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-[#5F6368] hover:text-[#202124]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "roadmap" as const, label: "Default" },
              { id: "satellite" as const, label: "Satellite" },
              { id: "terrain" as const, label: "Terrain" },
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => onMapTypeIdChange(type.id)}
                className={`py-2 px-1 text-xs rounded-xl font-medium border text-center transition cursor-pointer ${
                  mapTypeId === type.id
                    ? "border-[#1A73E8] bg-blue-50 text-[#1A73E8]"
                    : "border-[#DADCE0] text-[#5F6368] hover:bg-[#F8F9FA]"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] mb-2">Overlays</h3>
            <div className="space-y-1.5">
              {[
                { label: "Traffic", value: traffic, toggle: onTrafficChange },
                { label: "Transit", value: transit, toggle: onTransitChange },
                { label: "Bicycling", value: bicycling, toggle: onBicyclingChange },
              ].map((item) => (
                <label
                  key={item.label}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8F9FA] cursor-pointer text-xs font-medium text-[#202124]"
                >
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.value}
                    onChange={(e) => item.toggle(e.target.checked)}
                    className="size-4 rounded text-[#1A73E8] focus:ring-[#1A73E8]"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6368] mb-2">Style Preset</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "default" as const, label: "Default" },
                { id: "clean" as const, label: "Clean" },
                { id: "silver" as const, label: "Silver" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onStylePresetChange(preset.id)}
                  className={`py-1.5 px-1 text-xs rounded-xl font-medium border text-center transition cursor-pointer ${
                    stylePreset === preset.id
                      ? "border-[#1A73E8] bg-blue-50 text-[#1A73E8]"
                      : "border-[#DADCE0] text-[#5F6368] hover:bg-[#F8F9FA]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
