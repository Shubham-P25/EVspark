"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { EvMap, type Viewport, type MapTypeId, type StylePreset } from "@/components/map/ev-map";
import { ClusterLayer } from "@/components/map/cluster-layer";
import { UserLocation } from "@/components/map/user-location";
import { MapLayers } from "@/components/map/map-layers";
import { MapControls } from "@/components/map/map-controls";
import { useGeolocation } from "@/hooks/use-geolocation";
import { SearchCard } from "./search-card";
import { ChipRow } from "./chip-row";
import { StationCard, type StationDetail } from "./station-card";
import { DirectionsPanel } from "./directions-panel";
import { BestChargersPanel } from "./best-chargers-panel";
import { SidePanel } from "./side-panel";
import { MenuDrawer } from "./menu-drawer";
import { PlacesDialog } from "./places-dialog";
import { api } from "@/lib/api";
import { subscribeTiles, unsubscribeTiles } from "@/lib/socket";
import type { MarkerStation } from "@/components/map/station-marker";
import { toMarkerColor } from "@/lib/tokens";
import { PolylineF } from "@react-google-maps/api";
import type { RouteOption } from "./use-directions";

export function MapShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Geo & Map State
  const { me, status: geoStatus } = useGeolocation();
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 18.5204,
    lng: 73.8567,
  });
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [mapTypeId, setMapTypeId] = useState<MapTypeId>("roadmap");
  const [stylePreset, setStylePreset] = useState<StylePreset>("default");
  const [traffic, setTraffic] = useState(false);
  const [transit, setTransit] = useState(false);
  const [bicycling, setBicycling] = useState(false);

  // App UI State
  const [menuOpen, setMenuOpen] = useState(false);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [placesDialogType, setPlacesDialogType] = useState<"HOME" | "WORK" | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    searchParams.get("station") || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [computedRoutes, setComputedRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  // Side Panel from URL query `?panel=`
  const activePanel = searchParams.get("panel") as
    | "favorites"
    | "bookings"
    | "history"
    | "vehicle"
    | "eco"
    | "settings"
    | null;

  // Driver profile
  const { data: profile } = useQuery<any>({
    queryKey: ["my-profile"],
    queryFn: () => api<any>("/api/me/profile"),
    staleTime: 60_000,
  });

  // Query stations in Bounding Box
  const bboxQuery = viewport?.bounds
    ? `${viewport.bounds[0]},${viewport.bounds[1]},${viewport.bounds[2]},${viewport.bounds[3]}`
    : "";

  const { data: stationsData = [] } = useQuery<any[]>({
    queryKey: ["stations-bbox", bboxQuery, viewport?.zoom, selectedFilter],
    queryFn: () =>
      api<any[]>(
        `/api/stations?bbox=${bboxQuery}&zoom=${viewport?.zoom ?? 12}${
          selectedFilter && selectedFilter !== "ALL" && selectedFilter !== "AVAILABLE" && selectedFilter !== "FAST_DC"
            ? `&connector=${selectedFilter}`
            : ""
        }`
      ),
    enabled: !!bboxQuery,
    staleTime: 10_000,
  });

  // Tile subscriptions via Socket
  useEffect(() => {
    if (!viewport?.bounds) return;
    const tiles: string[] = [];
    const z = Math.min(Math.max(Math.round(viewport.zoom), 10), 14);
    // Simple 4-corner tile subscription
    subscribeTiles(tiles);
    return () => {
      unsubscribeTiles(tiles);
    };
  }, [viewport]);

  // Filter stations client-side for quick filters
  const filteredStations = stationsData.filter((st) => {
    if (selectedFilter === "AVAILABLE") return st.availableChargers > 0;
    if (selectedFilter === "FAST_DC") {
      return st.chargers?.some((c: any) => c.powerKw >= 50);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        st.name?.toLowerCase().includes(q) ||
        st.address?.toLowerCase().includes(q) ||
        st.city?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const markerStations: MarkerStation[] = filteredStations.map((st) => ({
    id: st.id,
    lat: st.lat,
    lng: st.lng,
    name: st.name,
    color: toMarkerColor(st.markerColor),
    photoUrl: st.photoUrl,
    isOverloaded: st.isOverloaded,
    waitLabel: st.availableChargers > 0 ? "Free" : `${st.waitMinutes} min`,
  }));

  const handleLocateMe = useCallback(() => {
    if (me && mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: me.lat, lng: me.lng });
      mapInstanceRef.current.setZoom(15);
    }
  }, [me]);

  const handleClusterClick = (lat: number, lng: number, nextZoom: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(nextZoom);
    }
  };

  const openPanel = (panelName: string) => {
    router.push(`/driver?panel=${panelName}`);
  };

  const closePanel = () => {
    router.push("/driver");
  };

  const handleHomeClick = () => {
    if (profile?.driverProfile?.homeLat && profile?.driverProfile?.homeLng) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({
          lat: profile.driverProfile.homeLat,
          lng: profile.driverProfile.homeLng,
        });
        mapInstanceRef.current.setZoom(14);
      }
    } else {
      setPlacesDialogType("HOME");
    }
  };

  const handleWorkClick = () => {
    if (profile?.driverProfile?.workLat && profile?.driverProfile?.workLng) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({
          lat: profile.driverProfile.workLat,
          lng: profile.driverProfile.workLng,
        });
        mapInstanceRef.current.setZoom(14);
      }
    } else {
      setPlacesDialogType("WORK");
    }
  };

  return (
    <div ref={containerRef} className="relative w-screen h-dvh overflow-hidden select-none bg-[#F8F9FA]">
      {/* 1. Base Google Map */}
      <EvMap
        center={mapCenter}
        mapTypeId={mapTypeId}
        stylePreset={stylePreset}
        traffic={traffic}
        transit={transit}
        bicycling={bicycling}
        onViewport={setViewport}
        onMapReady={(m) => {
          mapInstanceRef.current = m;
        }}
        onMapClick={() => setSelectedStationId(null)}
      >
        {/* User live blue dot */}
        <UserLocation me={me} />

        {/* Stations and Clusters */}
        <ClusterLayer
          stations={markerStations}
          bounds={viewport?.bounds ?? null}
          zoom={viewport?.zoom ?? 12}
          selectedId={selectedStationId}
          onSelect={(id) => {
            setSelectedStationId(id);
            setDirectionsOpen(false);
            setFuelOpen(false);
          }}
          onClusterClick={handleClusterClick}
        />

        {/* Drawn Directions Polylines */}
        {computedRoutes.map((r, i) => (
          <PolylineF
            key={i}
            path={r.path}
            options={{
              strokeColor: i === selectedRouteIndex ? "#1A73E8" : "#9AA0A6",
              strokeWeight: i === selectedRouteIndex ? 6 : 4,
              strokeOpacity: i === selectedRouteIndex ? 0.9 : 0.6,
              zIndex: i === selectedRouteIndex ? 2 : 1,
            }}
            onClick={() => setSelectedRouteIndex(i)}
          />
        ))}
      </EvMap>

      {/* 2. Top-Left Floating Controls: Search & Chips */}
      {!directionsOpen && !activePanel && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
          <SearchCard
            onMenuClick={() => setMenuOpen(true)}
            onDirectionsClick={() => {
              setDirectionsOpen(true);
              setSelectedStationId(null);
              setFuelOpen(false);
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelectStation={(id) => setSelectedStationId(id)}
            matchingStations={stationsData}
          />

          <ChipRow
            hasHome={!!profile?.driverProfile?.homeLat}
            hasWork={!!profile?.driverProfile?.workLat}
            onHomeClick={handleHomeClick}
            onWorkClick={handleWorkClick}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
          />
        </div>
      )}

      {/* 3. Bottom-Left: Map Layers */}
      <div className="absolute bottom-6 left-4 z-10">
        <MapLayers
          mapTypeId={mapTypeId}
          onMapTypeIdChange={setMapTypeId}
          stylePreset={stylePreset}
          onStylePresetChange={setStylePreset}
          traffic={traffic}
          onTrafficChange={setTraffic}
          transit={transit}
          onTransitChange={setTransit}
          bicycling={bicycling}
          onBicyclingChange={setBicycling}
        />
      </div>

      {/* 4. Bottom-Right: Zoom, Locate & Fuel Stack */}
      <div className="absolute bottom-6 right-4 z-10">
        <MapControls
          onZoomIn={() => mapInstanceRef.current?.setZoom((mapInstanceRef.current.getZoom() ?? 12) + 1)}
          onZoomOut={() => mapInstanceRef.current?.setZoom((mapInstanceRef.current.getZoom() ?? 12) - 1)}
          onLocateMe={handleLocateMe}
          onFuelRecommend={() => {
            setFuelOpen(true);
            setSelectedStationId(null);
            setDirectionsOpen(false);
          }}
          heading={me?.heading}
        />
      </div>

      {/* 5. Bottom-Center: Simulated Data Pill */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-white/90 text-[#5F6368] shadow-sm border border-[#DADCE0]">
          Simulated charging data
        </span>
      </div>

      {/* 6. Overlays & Slide-out Panels */}
      {/* Station Card */}
      {selectedStationId && (
        <StationCard
          stationId={selectedStationId}
          onClose={() => setSelectedStationId(null)}
          boundsRef={containerRef}
          userLocation={me ? { lat: me.lat, lng: me.lng } : null}
          onStartRoute={(st) => {
            setDirectionsOpen(true);
            setSelectedStationId(null);
          }}
          onOpenDirections={(st) => {
            setDirectionsOpen(true);
            setSelectedStationId(null);
          }}
          userVehicleConnectors={profile?.driverProfile?.connectors || []}
          userVehicleLabel={
            profile?.driverProfile?.vehicleModel
              ? `${profile.driverProfile.vehicleModel.make} ${profile.driverProfile.vehicleModel.model}`
              : "Tata Nexon EV"
          }
          userPhone={profile?.user?.phone || ""}
        />
      )}

      {/* Directions Panel */}
      {directionsOpen && (
        <DirectionsPanel
          onClose={() => {
            setDirectionsOpen(false);
            setComputedRoutes([]);
          }}
          userLocation={me ? { lat: me.lat, lng: me.lng } : null}
          onSelectStation={(id) => setSelectedStationId(id)}
          onRoutesComputed={(rts, idx) => {
            setComputedRoutes(rts);
            setSelectedRouteIndex(idx);
          }}
          batteryPct={profile?.driverProfile?.batteryPct ?? 80}
        />
      )}

      {/* Best Chargers (Fuel) Panel */}
      {fuelOpen && (
        <BestChargersPanel
          onClose={() => setFuelOpen(false)}
          onSelectStation={(id) => {
            setFuelOpen(false);
            setSelectedStationId(id);
          }}
          userLocation={me ? { lat: me.lat, lng: me.lng } : null}
          userConnector={profile?.driverProfile?.connectors?.[0]}
          batteryPct={profile?.driverProfile?.batteryPct ?? 50}
        />
      )}

      {/* Driver Side Panels (?panel=...) */}
      {activePanel && (
        <SidePanel
          panel={activePanel}
          onClose={closePanel}
          onSelectStation={(id) => {
            closePanel();
            setSelectedStationId(id);
          }}
        />
      )}

      {/* Hamburger Navigation Menu Drawer */}
      <MenuDrawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        user={{
          name: profile?.user?.name,
          username: profile?.user?.username,
          vehicleModel: profile?.driverProfile?.vehicleModel
            ? `${profile.driverProfile.vehicleModel.make} ${profile.driverProfile.vehicleModel.model}`
            : undefined,
          regNo: profile?.driverProfile?.vehicleRegNo,
        }}
        onOpenPanel={openPanel}
        onOpenHome={() => setPlacesDialogType("HOME")}
        onOpenWork={() => setPlacesDialogType("WORK")}
      />

      {/* Home / Work Location Picker Dialog */}
      {placesDialogType && (
        <PlacesDialog
          open={!!placesDialogType}
          onOpenChange={(op) => !op && setPlacesDialogType(null)}
          type={placesDialogType}
          currentPlace={
            placesDialogType === "HOME"
              ? profile?.driverProfile?.homeLat
                ? {
                    lat: profile.driverProfile.homeLat,
                    lng: profile.driverProfile.homeLng,
                    label: profile.driverProfile.homeLabel,
                  }
                : null
              : profile?.driverProfile?.workLat
              ? {
                  lat: profile.driverProfile.workLat,
                  lng: profile.driverProfile.workLng,
                  label: profile.driverProfile.workLabel,
                }
              : null
          }
          onFlyTo={(coord) => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.panTo(coord);
              mapInstanceRef.current.setZoom(15);
            }
          }}
        />
      )}
    </div>
  );
}
