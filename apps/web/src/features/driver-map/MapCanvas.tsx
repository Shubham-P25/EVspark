"use client";

import React, { useState, useEffect, useCallback, ReactNode } from "react";
import { Map, useMap, useApiLoadingStatus, APILoadingStatus } from "@vis.gl/react-google-maps";
import { useMapUiStore } from "./stores/map-ui-store";
import { EvLoader } from "@/components/feedback/EvLoader";
import { EvError } from "@/components/feedback/EvError";
import type { ViewportBounds } from "./hooks/useViewportTiles";

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

const INDIA_RESTRICTION: google.maps.MapRestriction = {
  latLngBounds: { north: 37.5, south: 6.0, west: 68.0, east: 98.0 },
  strictBounds: false,
};

const DEFAULT_CENTER = { lat: 19.076, lng: 72.8777 };
const DEFAULT_ZOOM = 13;

// Inner helper component to manage traffic layer imperatively
function TrafficLayerController({ showTraffic }: { showTraffic: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const trafficLayer = new google.maps.TrafficLayer();
    if (showTraffic) {
      trafficLayer.setMap(map);
    } else {
      trafficLayer.setMap(null);
    }
    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, showTraffic]);

  return null;
}

interface MapCanvasProps {
  onIdleChange?: (bounds: ViewportBounds | null, zoom: number | null) => void;
  children?: ReactNode;
}

export function MapCanvas({ onIdleChange, children }: MapCanvasProps) {
  const map = useMap();
  const apiStatus = useApiLoadingStatus();
  const [isReady, setIsReady] = useState(false);
  const mapType = useMapUiStore((s) => s.mapType);
  const showTraffic = useMapUiStore((s) => s.showTraffic);

  const handleIdle = useCallback(() => {
    if (!map) return;
    setIsReady(true);

    const rawBounds = map.getBounds();
    const zoom = map.getZoom() ?? null;

    if (rawBounds && onIdleChange) {
      const json = rawBounds.toJSON();
      onIdleChange(
        {
          north: json.north,
          south: json.south,
          east: json.east,
          west: json.west,
        },
        zoom
      );
    }
  }, [map, onIdleChange]);

  // Sync mapTypeId with UI store only when different from default
  useEffect(() => {
    if (!map) return;
    if (mapType !== "roadmap") {
      map.setMapTypeId(mapType);
    }
  }, [map, mapType]);

  // Check for Maps API loading errors or missing keys
  if (
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-[#f8f9fa] p-4">
        <EvError
          kind="map-key"
          onRetry={() => window.location.reload()}
          details={`Google Maps API status: ${apiStatus}`}
          className="max-w-md w-full shadow-md"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#f8f9fa] overflow-hidden select-none">
      <Map
        mapId={MAP_ID}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        disableDefaultUI={true}
        gestureHandling="greedy"
        clickableIcons={false}
        minZoom={5}
        maxZoom={19}
        restriction={INDIA_RESTRICTION}
        renderingType="RASTER"
        onIdle={handleIdle}
        className="w-full h-full outline-none"
      >
        <TrafficLayerController showTraffic={showTraffic} />
        {children}
      </Map>

      {/* EvLoader overlay until first idle paint */}
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#f8f9fa] transition-opacity duration-300">
          <EvLoader variant="map" />
        </div>
      )}
    </div>
  );
}

export default MapCanvas;
