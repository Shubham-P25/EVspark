"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { EvMap, type Viewport, type MapTypeId, type StylePreset } from "@/components/map/ev-map";
import { ClusterLayer } from "@/components/map/cluster-layer";
import { UserLocation } from "@/components/map/user-location";
import { GhostLayer } from "@/components/map/ghost-layer";
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
import { PresentationSuite } from "./presentation-suite";
import { api } from "@/lib/api";
import { subscribeTiles, unsubscribeTiles } from "@/lib/socket";
import type { MarkerStation } from "@/components/map/station-marker";
import type { MarkerColor } from "@/lib/tokens";
import { PolylineF } from "@react-google-maps/api";
import type { RouteOption } from "./use-directions";
import { NavigationArrow, X, Lightning } from "@phosphor-icons/react";
import { km, mins } from "@/lib/format";

export function MapShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Geo & Map State
  const { me, status: geoStatus, showConsent, handleConsent } = useGeolocation();
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

  // Active Live Turn-by-Turn Navigation HUD
  const [activeNavigation, setActiveNavigation] = useState<{
    stationName: string;
    stationId: string;
    distanceKm: number;
    durationMin: number;
  } | null>(null);

  const initialCenteredRef = useRef(false);

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

  // REQUIREMENT B: Markers carry 3 colors: green (available), orange (moderate wait), and only 1-3 red stations (top worst waiting time)
  const markerStations: MarkerStation[] = React.useMemo(() => {
    // Find the top 1-3 stations with wait > 20 min to mark as red
    const highWaitList = [...filteredStations]
      .filter((s) => (s.waitMinutes ?? 0) > 20)
      .sort((a, b) => (b.waitMinutes ?? 0) - (a.waitMinutes ?? 0));
    const redIds = new Set(highWaitList.slice(0, 3).map((s) => s.id));

    return filteredStations.map((st) => {
      const wait = st.waitMinutes ?? 0;
      const isFree = (st.availableChargers ?? 1) > 0;

      let color: MarkerColor = "green";
      if (redIds.has(st.id)) {
        color = "red";
      } else if (!isFree && wait > 5) {
        color = "amber";
      } else {
        color = "green";
      }

      const totalChargers = st.chargers?.length || 3;
      const powerKw = st.chargers?.find((c: any) => c.powerKw)?.powerKw;

      return {
        id: st.id,
        lat: st.lat,
        lng: st.lng,
        name: st.name,
        color,
        photoUrl: st.photoUrl,
        isOverloaded: color === "red",
        waitLabel: isFree ? "Free station available" : `${wait}m wait`,
        availableChargers: st.availableChargers ?? 1,
        totalChargers,
        powerKw,
      };
    });
  }, [filteredStations]);

  // REQUIREMENT D: Press current location -> get user to location and zoom wide enough to see at least 1 station
  const handleLocateMe = useCallback(() => {
    if (!me || !mapInstanceRef.current) return;
    const userPos = { lat: me.lat, lng: me.lng };

    // Find nearest station
    let nearestDist = Infinity;
    let nearestStation: any = null;
    for (const st of stationsData) {
      const d =
        Math.hypot(
          st.lat - me.lat,
          (st.lng - me.lng) * Math.cos((me.lat * Math.PI) / 180)
        ) * 111;
      if (d < nearestDist) {
        nearestDist = d;
        nearestStation = st;
      }
    }

    if (nearestStation && nearestDist <= 40) {
      // Fit bounds to include both user and nearest station comfortably
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userPos);
      bounds.extend({ lat: nearestStation.lat, lng: nearestStation.lng });
      mapInstanceRef.current.fitBounds(bounds, {
        top: 100,
        bottom: 100,
        left: 80,
        right: selectedStationId ? 450 : 100,
      });
    } else {
      mapInstanceRef.current.panTo(userPos);
      mapInstanceRef.current.setZoom(14);
    }
  }, [me, stationsData, selectedStationId]);

  // REQUIREMENT A: As soon as map opens / user location is known, immediately go to user's current location
  useEffect(() => {
    if (me && mapInstanceRef.current && !initialCenteredRef.current) {
      initialCenteredRef.current = true;
      mapInstanceRef.current.panTo({ lat: me.lat, lng: me.lng });
      mapInstanceRef.current.setZoom(14);
    }
  }, [me]);

  // REQUIREMENT E: When Start button is clicked, calculate path between user and station, take user to current location on path, and start navigation
  const handleStartNavigation = useCallback(
    async (st: StationDetail) => {
      const originPos = me ? { lat: me.lat, lng: me.lng } : { lat: 18.5204, lng: 73.8567 };
      const destPos = { lat: st.lat, lng: st.lng };

      try {
        const svc = new google.maps.DirectionsService();
        const res = await svc.route({
          origin: originPos,
          destination: destPos,
          travelMode: google.maps.TravelMode.DRIVING,
          region: "in",
        });

        if (res.routes[0]) {
          const r = res.routes[0];
          const legs = r.legs;
          const distKm = legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0) / 1000;
          const durMin = legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0) / 60;
          const path = r.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));

          setComputedRoutes([
            {
              index: 0,
              summary: r.summary || "Fastest Route",
              distanceKm: distKm,
              durationMin: durMin,
              encoded: (r as any).overview_polyline?.points || "",
              path,
            },
          ]);
          setSelectedRouteIndex(0);

          // Focus user on the path like Google Maps Start Navigation
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(originPos);
            mapInstanceRef.current.setZoom(16);
          }

          setActiveNavigation({
            stationName: st.name,
            stationId: st.id,
            distanceKm: distKm,
            durationMin: durMin,
          });

          // Close other dialogs
          setDirectionsOpen(false);
          setFuelOpen(false);
        }
      } catch (err) {
        console.warn("Navigation route error:", err);
        // Fallback: still pan to user
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(originPos);
          mapInstanceRef.current.setZoom(16);
        }
      }
    },
    [me]
  );

  // REQUIREMENT G: When Fuel button is clicked, take user to the best nearby station, give waiting time, draw path, and show ghost cars
  const handleFuelButtonClick = useCallback(async () => {
    const userPos = me ? { lat: me.lat, lng: me.lng } : { lat: 18.5204, lng: 73.8567 };

    // Find best nearby station: shortest wait, available chargers, closest distance
    let bestStation: any = null;
    let minScore = Infinity;

    for (const st of stationsData) {
      const dist =
        Math.hypot(
          st.lat - userPos.lat,
          (st.lng - userPos.lng) * Math.cos((userPos.lat * Math.PI) / 180)
        ) * 111;
      const wait = st.waitMinutes ?? 0;
      // Score: distance weight + wait time weight
      const score = dist * 1.5 + wait;
      if (score < minScore) {
        minScore = score;
        bestStation = st;
      }
    }

    if (!bestStation && stationsData.length > 0) {
      bestStation = stationsData[0];
    }

    if (bestStation) {
      setSelectedStationId(bestStation.id);
      setDirectionsOpen(false);
      setFuelOpen(false);

      // Compute route to best station
      try {
        const svc = new google.maps.DirectionsService();
        const res = await svc.route({
          origin: userPos,
          destination: { lat: bestStation.lat, lng: bestStation.lng },
          travelMode: google.maps.TravelMode.DRIVING,
          region: "in",
        });
        if (res.routes[0]) {
          const path = res.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
          setComputedRoutes([
            {
              index: 0,
              summary: res.routes[0].summary || "Recommended",
              distanceKm: (res.routes[0].legs[0]?.distance?.value ?? 0) / 1000,
              durationMin: (res.routes[0].legs[0]?.duration?.value ?? 0) / 60,
              encoded: "",
              path,
            },
          ]);
        }
      } catch {}

      // Fit bounds to show user and recommended nearby station
      if (mapInstanceRef.current) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(userPos);
        bounds.extend({ lat: bestStation.lat, lng: bestStation.lng });
        mapInstanceRef.current.fitBounds(bounds, {
          top: 80,
          bottom: 80,
          left: 80,
          right: 440,
        });
      }
    } else {
      // Fallback: open recommend panel
      setFuelOpen(true);
    }
  }, [me, stationsData]);

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

  // Find currently selected station from cached list for zero-latency initial render
  const currentSelectedStation = stationsData.find((s) => s.id === selectedStationId);

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
          if (me && !initialCenteredRef.current) {
            initialCenteredRef.current = true;
            m.panTo({ lat: me.lat, lng: me.lng });
            m.setZoom(14);
          }
        }}
        onMapClick={() => {
          if (!activeNavigation) {
            setSelectedStationId(null);
          }
        }}
      >
        {/* User live blue dot */}
        <UserLocation me={me} />

        {/* REQUIREMENT G: Ghost car simulation layer */}
        <GhostLayer stations={stationsData} />

        {/* Stations and Clusters with 3 colors (green, orange, 1-3 red) */}
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
              strokeOpacity: i === selectedRouteIndex ? 0.95 : 0.6,
              zIndex: i === selectedRouteIndex ? 20 : 10,
            }}
            onClick={() => setSelectedRouteIndex(i)}
          />
        ))}
      </EvMap>

      {/* REQUIREMENT E: Navigation Live Turn-by-Turn HUD */}
      {activeNavigation && (
        <div className="absolute top-4 inset-x-4 max-w-xl mx-auto z-40 bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-4 shadow-2xl border border-white/10 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
              <NavigationArrow size={24} weight="fill" className="text-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                  Navigating
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-300">
                  {km(activeNavigation.distanceKm)} ({mins(activeNavigation.durationMin)})
                </span>
              </div>
              <h3 className="text-sm font-bold truncate text-white">
                {activeNavigation.stationName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedStationId(activeNavigation.stationId)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition cursor-pointer"
            >
              Details
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveNavigation(null);
                setComputedRoutes([]);
              }}
              title="End Navigation"
              className="size-9 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow transition cursor-pointer"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Top-Left Floating Controls: Search & Chips */}
      {!directionsOpen && !activePanel && !activeNavigation && (
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

      {/* REQUIREMENT 5: Presentation & Demo Guide Suite Hooked into Driver Map */}
      <PresentationSuite
        stations={stationsData}
        onSelectStation={(id) => setSelectedStationId(id)}
      />

      {/* 4. Bottom-Right: Zoom, Locate & Fuel Stack */}
      <div className="absolute bottom-6 right-4 z-20">
        <MapControls
          onZoomIn={() => mapInstanceRef.current?.setZoom((mapInstanceRef.current.getZoom() ?? 12) + 1)}
          onZoomOut={() => mapInstanceRef.current?.setZoom((mapInstanceRef.current.getZoom() ?? 12) - 1)}
          onLocateMe={handleLocateMe}
          onFuelRecommend={handleFuelButtonClick}
          heading={me?.heading}
        />
      </div>

      {/* 5. Overlays & Slide-out Panels */}
      {/* REQUIREMENT C: Station Card displayed on empty RIGHT PANEL of map */}
      {selectedStationId && (
        <StationCard
          stationId={selectedStationId}
          initialStation={currentSelectedStation}
          onClose={() => setSelectedStationId(null)}
          boundsRef={containerRef}
          userLocation={me ? { lat: me.lat, lng: me.lng } : null}
          onStartRoute={handleStartNavigation}
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

      {/* REQUIREMENT F: Directions Panel */}
      {directionsOpen && (
        <DirectionsPanel
          onClose={() => {
            setDirectionsOpen(false);
            setComputedRoutes([]);
          }}
          userLocation={me ? { lat: me.lat, lng: me.lng } : null}
          onSelectStation={(id) => setSelectedStationId(id)}
          onSearchStart={(origin) => {
            // Take user to start/current location like Google Maps
            if (mapInstanceRef.current) {
              const pos = typeof origin === "object" ? origin : me ? { lat: me.lat, lng: me.lng } : null;
              if (pos) {
                mapInstanceRef.current.panTo(pos);
                mapInstanceRef.current.setZoom(14);
              }
            }
          }}
          onRoutesComputed={(rts, idx) => {
            setComputedRoutes(rts);
            setSelectedRouteIndex(idx);
            // Fit route and current location in view
            if (mapInstanceRef.current && rts[idx]?.path?.length) {
              const bounds = new google.maps.LatLngBounds();
              for (const p of rts[idx].path) bounds.extend(p);
              mapInstanceRef.current.fitBounds(bounds, { top: 80, bottom: 80, left: 450, right: 80 });
            }
          }}
          batteryPct={profile?.driverProfile?.batteryPct ?? 80}
        />
      )}

      {/* Best Chargers (Fuel) Panel fallback */}
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

      {/* Location Permission Consent Dialog */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#DADCE0]">
            <h3 className="text-base font-bold text-[#202124] mb-2">Location Permission</h3>
            <p className="text-xs text-[#5F6368] mb-6 leading-relaxed">
              EVspark uses your location to show nearby chargers and calculate real-time queue wait times.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => handleConsent(false)}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-[#5F6368] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
              >
                Not now
              </button>
              <button
                type="button"
                onClick={() => handleConsent(true)}
                className="rounded-xl bg-[#1A73E8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1557B0] transition-colors shadow-sm cursor-pointer"
              >
                Allow Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
