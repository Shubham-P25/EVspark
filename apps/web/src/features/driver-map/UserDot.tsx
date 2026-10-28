"use client";

import React, { memo } from "react";
import { AdvancedMarker } from "@vis.gl/react-google-maps";

interface UserDotProps {
  location?: { lat: number; lng: number } | null;
  heading?: number | null;
}

export const UserDot = memo(function UserDot({ location, heading }: UserDotProps) {
  if (!location) return null;

  return (
    <AdvancedMarker
      position={{ lat: location.lat, lng: location.lng }}
      zIndex={100}
      title="Your Location"
    >
      <div className="relative flex items-center justify-center select-none pointer-events-none">
        {/* Soft accuracy aura (transform scale, no blur) */}
        <div className="absolute w-8 h-8 rounded-full bg-[#1A73E8]/20 animate-pulse" />

        {/* Heading cone/indicator if available */}
        {heading !== null && heading !== undefined && (
          <div
            className="absolute -top-3 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-[#1A73E8]"
            style={{ transform: `rotate(${heading}deg)` }}
          />
        )}

        {/* Core blue dot with crisp 2px white outline */}
        <div className="relative w-4 h-4 rounded-full bg-[#1A73E8] border-2 border-white shadow-md" />
      </div>
    </AdvancedMarker>
  );
});
