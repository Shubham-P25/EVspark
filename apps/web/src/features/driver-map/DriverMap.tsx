"use client";

import React, { useState, useCallback } from "react";
import { MapsProvider } from "./MapsProvider";
import { MapCanvas } from "./MapCanvas";
import { PinLayer } from "./PinLayer";
import { UserDot } from "./UserDot";
import { RouteLine } from "./RouteLine";
import { DemoSlot } from "./DemoSlot";
import { useViewportTiles, type ViewportBounds } from "./hooks/useViewportTiles";
import { useTilePins } from "./hooks/useTilePins";
import { useLiveDeltas } from "./hooks/useLiveDeltas";
import { useRoute } from "./hooks/useRoute";
import { useMapUiStore } from "./stores/map-ui-store";
import { SearchBar } from "./ui/SearchBar";
import { FilterChips } from "./ui/FilterChips";
import { MapControls } from "./ui/MapControls";
import { StationCard } from "./ui/StationCard";
import { DemoButton } from "./ui/DemoButton";
import { ProfileButton } from "./ui/ProfileButton";
import { PerfOverlay } from "./ui/PerfOverlay";
import { DemoPanel } from "../map-demo/ui/DemoPanel";

export function DriverMap() {
  const [bounds, setBounds] = useState<ViewportBounds | null>(null);
  const [zoom, setZoom] = useState<number | null>(13);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const filter = useMapUiStore((s) => s.filter);
  const demoOpen = useMapUiStore((s) => s.demoOpen);

  const { path: routePath, calculateRoute } = useRoute();

  const handleIdleChange = useCallback(
    (newBounds: ViewportBounds | null, newZoom: number | null) => {
      setBounds(newBounds);
      setZoom(newZoom);
    },
    []
  );

  // 1. Debounced viewport tiles math (snapped z=10..14, capped to 12)
  const tiles = useViewportTiles(bounds, zoom);

  // 2. Fast stations viewport load (SWR + IndexedDB)
  useTilePins(tiles, filter, bounds);

  // 3. Socket.io delta updates for current viewport tile rooms (map:join)
  useLiveDeltas(tiles, bounds);

  // Direction handler from station card
  const handleDirections = useCallback(
    (target: { lat: number; lng: number }) => {
      if (userLocation) {
        calculateRoute(userLocation, { lat: target.lat, lng: target.lng });
      } else {
        // Fallback default center to destination
        calculateRoute({ lat: 19.076, lng: 72.8777 }, { lat: target.lat, lng: target.lng });
      }
    },
    [userLocation, calculateRoute]
  );

  return (
    <MapsProvider>
      <div className="relative w-full h-[100dvh] overflow-hidden bg-[#F8F9FA]">
        {/* Core Vector Map Canvas */}
        <MapCanvas onIdleChange={handleIdleChange}>
          <PinLayer bounds={bounds} zoom={zoom} />
          <UserDot location={userLocation} />
          <RouteLine path={routePath} />
          <DemoSlot />
        </MapCanvas>

        {/* Top Left: Search & Filter Chips (Elevation 2) */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 max-w-[calc(100vw-120px)] sm:max-w-[360px] pointer-events-none">
          <SearchBar />
          <FilterChips />
        </div>

        {/* Top Center: Simulated demo banner during simulation */}
        {demoOpen && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-sm border border-[#DADCE0] shadow-md rounded-full text-xs font-bold text-[#1A73E8]">
              <span className="size-2 rounded-full bg-[#1A73E8] animate-pulse" />
              Simulated demo
            </div>
          </div>
        )}

        {/* Top Right: Demo & Profile Actions (safe-area insets respected) */}
        <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-20 flex items-center gap-2 pointer-events-auto">
          <DemoButton />
          <ProfileButton />
        </div>

        {/* Bottom Right: Map Controls Stack */}
        <div className="absolute bottom-6 right-4 z-20 pointer-events-none">
          <MapControls
            userLocation={userLocation}
            onLocationFound={setUserLocation}
            onRouteRequested={handleDirections}
          />
        </div>

        {/* Station Detail Card (Slide panel desktop, bottom sheet mobile) */}
        <StationCard onDirections={handleDirections} />

        {/* Simulated Demo Control & Diagnostics Panel */}
        <DemoPanel />

        {/* Dev-only Perf Metrics Overlay (Shift+P) */}
        <PerfOverlay />
      </div>
    </MapsProvider>
  );
}

export default DriverMap;
