"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { latLngToTile } from "@evspark/shared";
import { subscribeTiles } from "@/lib/socket";
import { StationSummary } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Zap, Crosshair } from "lucide-react";

interface StationMapProps {
  stations: StationSummary[];
  selectedStationId?: string | null;
  recommendedStationId?: string | null;
  onSelectStation: (station: StationSummary) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  highlightRoutePolyline?: Array<{ lat: number; lng: number }>;
  className?: string;
}

const DEFAULT_CENTER = { lat: 19.0657, lng: 72.8687 }; // Mumbai BKC
const DEFAULT_ZOOM = 13;

const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0B0F17" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B0F17" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9CA3AF" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#D1D5DB" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6B7280" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#111827" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0E1726" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E293B" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0F172A" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9CA3AF" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1E293B" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1E293B" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#060A10" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4B5563" }] },
];

export function StationMap({
  stations,
  selectedStationId,
  recommendedStationId,
  onSelectStation,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  highlightRoutePolyline,
  className,
}: StationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [userLocation, setUserLocation] = useState(center);

  // Initialize Google Maps
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
    if (!apiKey || apiKey === "mock") {
      setMapError(true);
      return;
    }

    try {
      setOptions({
        key: apiKey,
        v: "weekly",
      });

      Promise.all([
        importLibrary("maps"),
        importLibrary("geometry"),
      ])
        .then(([mapsLib]) => {
          if (!mapContainerRef.current) return;

          const MapConstructor = (mapsLib as any).Map || window.google?.maps?.Map;
          const map = new MapConstructor(mapContainerRef.current, {
            center,
            zoom,
            styles: DARK_MAP_STYLES,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
              position: (window.google?.maps?.ControlPosition?.RIGHT_BOTTOM) || 9,
            },
            backgroundColor: "#0B0F17",
          });

          mapInstanceRef.current = map;
          setMapLoaded(true);

          // Pan/zoom listener to subscribe to tiles
          const handleBoundsChanged = () => {
            const bounds = map.getBounds();
            const currentZoom = map.getZoom() || 12;
            if (!bounds) return;

            const ne = bounds.getNorthEast();
            const sw = bounds.getSouthWest();

            const tileNE = latLngToTile(ne.lat(), ne.lng(), Math.min(14, Math.max(10, currentZoom)));
            const tileSW = latLngToTile(sw.lat(), sw.lng(), Math.min(14, Math.max(10, currentZoom)));

            const tiles: string[] = [];
            for (let x = Math.min(tileSW.x, tileNE.x); x <= Math.max(tileSW.x, tileNE.x); x++) {
              for (let y = Math.min(tileNE.y, tileSW.y); y <= Math.max(tileNE.y, tileSW.y); y++) {
                tiles.push(`tile:${Math.min(14, Math.max(10, currentZoom))}:${x}:${y}`);
              }
            }

            subscribeTiles(tiles.slice(0, 12));
          };

          map.addListener("idle", handleBoundsChanged);
        })
        .catch((err: unknown) => {
          console.warn("[StationMap] Google Maps failed to load, switching to interactive fallback mode:", err);
          setMapError(true);
        });
    } catch (err: unknown) {
      console.warn("[StationMap] Google Maps init error, switching to interactive fallback mode:", err);
      setMapError(true);
    }
  }, []);

  // Update markers
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;

    const map = mapInstanceRef.current;
    const existingIds = new Set(markersRef.current.keys());
    const newIds = new Set(stations.map((s) => s.id));

    // Remove deleted markers
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        markersRef.current.get(id)?.setMap(null);
        markersRef.current.delete(id);
      }
    }

    // Add or update markers
    for (const station of stations) {
      const isSelected = station.id === selectedStationId;
      const pinColor =
        station.markerColor === "green"
          ? "#10B981"
          : station.markerColor === "yellow"
          ? "#F59E0B"
          : "#EF4444";

      // SVG Pin with Wait Time
      const svgIcon = {
        url: `data:image/svg+xml;utf-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            ${station.isOverloaded ? `<circle cx="24" cy="24" r="22" fill="none" stroke="${pinColor}" stroke-width="2" opacity="0.4" />` : ""}
            <circle cx="24" cy="24" r="${isSelected ? 18 : 15}" fill="#0B0F17" stroke="${pinColor}" stroke-width="${isSelected ? 4 : 2.5}" />
            <text x="24" y="27" font-family="-apple-system, sans-serif" font-size="10" font-weight="bold" fill="#F9FAFB" text-anchor="middle">${station.waitMinutes}m</text>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(48, 48),
        anchor: new google.maps.Point(24, 24),
      };

      let marker = markersRef.current.get(station.id);
      if (!marker) {
        marker = new google.maps.Marker({
          position: { lat: station.lat, lng: station.lng },
          map,
          title: station.name,
          icon: svgIcon,
          zIndex: isSelected ? 999 : 10,
        });

        marker.addListener("click", () => {
          onSelectStation(station);
        });

        markersRef.current.set(station.id, marker);
      } else {
        marker.setIcon(svgIcon);
        marker.setZIndex(isSelected ? 999 : 10);
      }
    }
  }, [mapLoaded, stations, selectedStationId, onSelectStation]);

  // Update Polyline
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (highlightRoutePolyline && highlightRoutePolyline.length > 1) {
      polylineRef.current = new google.maps.Polyline({
        path: highlightRoutePolyline,
        geodesic: true,
        strokeColor: "#10B981",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        map,
      });

      // Fit bounds to polyline
      const bounds = new google.maps.LatLngBounds();
      highlightRoutePolyline.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds);
    }
  }, [mapLoaded, highlightRoutePolyline]);

  // Pan to selected station if selected
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !selectedStationId) return;
    const selected = stations.find((s) => s.id === selectedStationId);
    if (selected) {
      mapInstanceRef.current.panTo({ lat: selected.lat, lng: selected.lng });
    }
  }, [mapLoaded, selectedStationId, stations]);

  const locateUser = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.panTo(loc);
            mapInstanceRef.current.setZoom(14);
          }
        },
        () => {
          // fallback to default BKC
          if (mapInstanceRef.current) mapInstanceRef.current.panTo(DEFAULT_CENTER);
        }
      );
    }
  }, []);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#0B0F17]", className)}>
      {/* Google Map Container */}
      {!mapError ? (
        <div ref={mapContainerRef} className="h-full w-full" />
      ) : (
        /* Interactive Obsidian Fallback Vector Grid */
        <div className="relative h-full w-full bg-[#0B0F17] flex items-center justify-center overflow-hidden">
          {/* Subtle grid lines */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(to right, #1E293B 1px, transparent 1px), linear-gradient(to bottom, #1E293B 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          {/* Interactive fallback station nodes */}
          <div className="relative h-full w-full max-w-5xl max-h-[800px] p-8">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-medium text-gray-300">
                Live Maharashtra Network ({stations.length} Active Hubs)
              </span>
            </div>

            <div className="relative h-full w-full">
              {stations.map((s, idx) => {
                // Map lat/lng coordinates to percentage offsets
                const minLat = 18.5, maxLat = 20.2;
                const minLng = 72.7, maxLng = 74.2;
                const topPct = Math.min(90, Math.max(10, 100 - ((s.lat - minLat) / (maxLat - minLat)) * 100));
                const leftPct = Math.min(90, Math.max(10, ((s.lng - minLng) / (maxLng - minLng)) * 100));
                const isSelected = s.id === selectedStationId;
                const isRecommended = s.id === recommendedStationId;

                const colorClass = isRecommended
                  ? "border-amber-400 text-amber-300 shadow-amber-400/50 ring-4 ring-amber-400/30"
                  : s.markerColor === "green"
                  ? "border-emerald-500 text-emerald-400 shadow-emerald-500/30"
                  : s.markerColor === "yellow"
                  ? "border-amber-500 text-amber-400 shadow-amber-500/30"
                  : "border-rose-500 text-rose-400 shadow-rose-500/30";

                return (
                  <button
                    key={s.id}
                    onClick={() => onSelectStation(s)}
                    style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-transform hover:scale-125 z-10 ${
                      isSelected || isRecommended ? "scale-125 z-30" : ""
                    }`}
                  >
                    {isRecommended && (
                      <span className="absolute -inset-2 rounded-full border-2 border-amber-400 animate-ping pointer-events-none" />
                    )}
                    {s.isOverloaded && (
                      <span className="absolute -inset-2 rounded-full border border-rose-500/50 animate-ping pointer-events-none" />
                    )}
                    <div
                      className={`flex h-8 items-center gap-1.5 rounded-full border-2 bg-[#0B0F17]/95 px-2.5 shadow-lg backdrop-blur-md transition-all ${colorClass}`}
                    >
                      <Zap className="h-3 w-3 fill-current" />
                      <span className="text-[11px] font-mono font-bold">{s.waitMinutes}m</span>
                    </div>

                    <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-slate-900/90 px-2 py-1 text-[10px] text-white shadow-xl backdrop-blur-md group-hover:block">
                      {s.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Map Controls */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        <button
          onClick={locateUser}
          title="Locate my position"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-gray-300 shadow-xl backdrop-blur-xl transition hover:border-emerald-500/50 hover:text-emerald-400"
        >
          <Crosshair className="h-4 w-4" />
        </button>
      </div>

      {/* Live Map Legend */}
      <div className="absolute bottom-6 left-6 z-20 hidden sm:flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-gray-300">&le; 5m (Available)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="text-gray-300">6–15m (Busy)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="text-gray-300">&gt; 15m (Overloaded)</span>
        </div>
      </div>
    </div>
  );
}
