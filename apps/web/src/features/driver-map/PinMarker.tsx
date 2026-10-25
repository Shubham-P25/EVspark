"use client";

import React, { memo } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";
import { PIN_HEX, type Pin } from "@evspark/shared";
import { usePinStore } from "./stores/pin-store";
import { useMapUiStore } from "./stores/map-ui-store";

interface PinMarkerProps {
  id: string;
  selected: boolean;
  zoom?: number;
}

export const PinMarker = memo(function PinMarker({ id, selected, zoom = 13 }: PinMarkerProps) {
  const pin = usePinStore((s) => s.pins.get(id));
  const setSelectedId = useMapUiStore((s) => s.setSelectedId);
  const demoOpen = useMapUiStore((s) => s.demoOpen);

  if (!pin) return null;

  const hexColor = PIN_HEX[pin.color] || "#80868B";
  const showChipAlways = selected || zoom >= 15;

  return (
    <AdvancedMarker
      position={{ lat: pin.lat, lng: pin.lng }}
      zIndex={selected ? 9999 : 10}
      onClick={() => {
        if (!demoOpen) setSelectedId(id);
      }}
      title={`${pin.free}/${pin.total} available`}
    >
      <div
        className={`group relative flex flex-col items-center select-none transition-all duration-200 ease-out ${
          demoOpen ? "opacity-35 pointer-events-none cursor-default" : "cursor-pointer"
        }`}
        style={{
          transform: selected ? "scale(1.18)" : "scale(1)",
          transformOrigin: "bottom center",
          filter: selected ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
        }}
      >
        {/* Label Chip - Pure CSS show/hide via opacity and transform, no mount/unmount */}
        <div
          className={`absolute -top-7 px-2 py-0.5 rounded-full bg-white border border-[#DADCE0] text-[11px] font-semibold text-[#202124] shadow-sm whitespace-nowrap pointer-events-none transition-all duration-150 ${
            showChipAlways
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
          }`}
        >
          <span>{pin.free}/{pin.total} free</span>
          {pin.maxKw > 0 && <span className="ml-1 text-[#5F6368] font-normal">· {pin.maxKw}kW</span>}
        </div>

        {/* Google-style solid teardrop SVG pin */}
        <svg
          width="30"
          height="38"
          viewBox="0 0 30 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          {/* Teardrop Body */}
          <path
            d="M15 37.5C13 32 3 24 3 15C3 8.37258 8.37258 3 15 3C21.6274 3 27 8.37258 27 15C27 24 17 32 15 37.5Z"
            fill={hexColor}
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Bolt Glyph */}
          <path
            d="M16 7L9.5 16.5H14.5L13.5 24L20.5 14H15.5L16 7Z"
            fill="#FFFFFF"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </AdvancedMarker>
  );
});
