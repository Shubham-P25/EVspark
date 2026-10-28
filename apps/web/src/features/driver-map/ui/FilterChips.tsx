"use client";

import React from "react";
import { useMapUiStore, type PinFilter } from "../stores/map-ui-store";

const FILTERS: Array<{ id: PinFilter; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "AVAILABLE", label: "Available now" },
  { id: "FAST_DC", label: "Fast DC (≥50 kW)" },
  { id: "CCS2", label: "CCS2" },
  { id: "Type 2", label: "Type 2" },
  { id: "CHAdeMO", label: "CHAdeMO" },
];

export function FilterChips() {
  const currentFilter = useMapUiStore((s) => s.filter);
  const setFilter = useMapUiStore((s) => s.setFilter);

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 pointer-events-auto">
      {FILTERS.map((f) => {
        const isActive = currentFilter === f.id;

        return (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap active:scale-95 shadow-2xs cursor-pointer ${
              isActive
                ? "bg-[#1A73E8] text-white shadow-xs"
                : "bg-white border border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
