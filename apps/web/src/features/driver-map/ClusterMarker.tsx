"use client";

import React, { memo } from "react";
import { AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { PIN_HEX, type PinColor } from "@evspark/shared";
import { useMapUiStore } from "./stores/map-ui-store";

interface ClusterMarkerProps {
  clusterId: number;
  count: number;
  lat: number;
  lng: number;
  worstColor: PinColor;
  onExpand?: (clusterId: number, lat: number, lng: number) => void;
}

export const ClusterMarker = memo(function ClusterMarker({
  clusterId,
  count,
  lat,
  lng,
  worstColor,
  onExpand,
}: ClusterMarkerProps) {
  const map = useMap();
  const demoOpen = useMapUiStore((s) => s.demoOpen);
  const hexBorder = PIN_HEX[worstColor] || "#1E8E3E";

  const handleClick = () => {
    if (demoOpen) return;
    if (onExpand) {
      onExpand(clusterId, lat, lng);
      return;
    }
    if (map) {
      const currentZoom = map.getZoom() || 12;
      map.panTo({ lat, lng });
      map.setZoom(currentZoom + 2);
    }
  };

  return (
    <AdvancedMarker
      position={{ lat, lng }}
      zIndex={50}
      onClick={handleClick}
      title={`${count} chargers cluster`}
    >
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md select-none transition-all duration-200 ${
          demoOpen
            ? "opacity-35 pointer-events-none cursor-default"
            : "cursor-pointer active:scale-95 hover:scale-105"
        }`}
        style={{
          border: `3px solid ${hexBorder}`,
        }}
      >
        <span className="text-[13px] font-bold text-[#202124] leading-none">
          {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      </div>
    </AdvancedMarker>
  );
});
