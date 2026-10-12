"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowsDownUp,
  X,
  NavigationArrow,
  MapPin,
  Clock,
  GasPump,
  Plus,
  ArrowSquareOut,
  Lightning,
} from "@phosphor-icons/react";
import { useDirections, type RouteOption } from "./use-directions";
import { stationsAlongRoute, type RouteStation } from "@/lib/queries/along-route";
import { inr, km, mins } from "@/lib/format";
import { Button } from "@/components/ui/button";

interface DirectionsPanelProps {
  onClose: () => void;
  userLocation?: { lat: number; lng: number } | null;
  initialDestination?: { lat: number; lng: number; name: string } | null;
  onSelectStation?: (stationId: string) => void;
  onRoutesComputed?: (routes: RouteOption[], selectedIndex: number) => void;
  onSearchStart?: (origin: any) => void;
  batteryPct?: number;
  batteryRangeKm?: number;
}

export function DirectionsPanel({
  onClose,
  userLocation,
  initialDestination,
  onSelectStation,
  onRoutesComputed,
  onSearchStart,
  batteryPct = 80,
  batteryRangeKm = 250,
}: DirectionsPanelProps) {
  const [originText, setOriginText] = useState("Your location");
  const [destinationText, setDestinationText] = useState(
    initialDestination ? initialDestination.name : ""
  );
  const [originCoord, setOriginCoord] = useState<google.maps.LatLngLiteral | string>(
    userLocation || "Mumbai, India"
  );
  const [destinationCoord, setDestinationCoord] = useState<google.maps.LatLngLiteral | string>(
    initialDestination ? { lat: initialDestination.lat, lng: initialDestination.lng } : ""
  );
  const [viaCoord, setViaCoord] = useState<google.maps.LatLngLiteral | undefined>(undefined);
  const [viaName, setViaName] = useState<string | null>(null);

  const { routes, selected, setSelected, plan, clear, loading, error } = useDirections();

  useEffect(() => {
    if (initialDestination) {
      setDestinationText(initialDestination.name);
      setDestinationCoord({ lat: initialDestination.lat, lng: initialDestination.lng });
      plan(userLocation || "Mumbai, India", {
        lat: initialDestination.lat,
        lng: initialDestination.lng,
      });
    }
  }, [initialDestination, plan, userLocation]);

  useEffect(() => {
    if (routes.length > 0) {
      onRoutesComputed?.(routes, selected);
    }
  }, [routes, selected, onRoutesComputed]);

  const activeRoute = routes[selected];

  // Fetch stations along active route
  const { data: alongStations = [], isLoading: loadingAlong } = useQuery<RouteStation[]>({
    queryKey: ["along-route", activeRoute?.encoded],
    queryFn: () => stationsAlongRoute(activeRoute!.encoded, 3000),
    enabled: !!activeRoute?.encoded,
  });

  const handleSwap = () => {
    const tmpText = originText;
    setOriginText(destinationText);
    setDestinationText(tmpText);

    const tmpCoord = originCoord;
    setOriginCoord(destinationCoord);
    setDestinationCoord(tmpCoord);

    if (destinationCoord && tmpCoord) {
      plan(destinationCoord, tmpCoord, viaCoord);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originText || !destinationText) return;
    const orig = originText === "Your location" && userLocation ? userLocation : originText;
    onSearchStart?.(orig);
    plan(orig, destinationText, viaCoord);
  };

  const handleAddStop = (st: RouteStation) => {
    setViaCoord({ lat: st.lat, lng: st.lng });
    setViaName(st.name);
    const orig = originText === "Your location" && userLocation ? userLocation : originCoord;
    plan(orig, destinationCoord || destinationText, { lat: st.lat, lng: st.lng });
  };

  const estimatedTripRangeRemaining =
    batteryRangeKm * (batteryPct / 100) - (activeRoute?.distanceKm ?? 0);
  const needsCharging =
    activeRoute && activeRoute.distanceKm > 50 && estimatedTripRangeRemaining < 30;

  return (
    <div className="absolute top-4 left-4 z-20 w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex flex-col bg-white rounded-2xl shadow-xl border border-[#DADCE0] overflow-hidden">
      {/* Header & Inputs */}
      <div className="p-4 border-b border-[#DADCE0] bg-white">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <NavigationArrow size={20} weight="fill" className="text-[#1A73E8]" />
            <h2 className="text-base font-bold text-[#202124]">Directions</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[#5F6368] hover:bg-[#F1F3F4] transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSearch} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1 shrink-0 pt-1">
              <span className="size-3 rounded-full border-2 border-[#1A73E8] bg-white" />
              <span className="w-0.5 h-6 bg-slate-300" />
              <span className="size-3 rounded-full bg-[#D93025]" />
            </div>

            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={originText}
                onChange={(e) => setOriginText(e.target.value)}
                placeholder="Choose starting point"
                className="w-full text-xs h-9 px-3 rounded-lg border border-[#DADCE0] outline-none focus:border-[#1A73E8]"
              />
              <input
                type="text"
                value={destinationText}
                onChange={(e) => setDestinationText(e.target.value)}
                placeholder="Choose destination"
                className="w-full text-xs h-9 px-3 rounded-lg border border-[#DADCE0] outline-none focus:border-[#1A73E8]"
              />
            </div>

            <button
              type="button"
              onClick={handleSwap}
              title="Swap start and destination"
              className="p-2 rounded-xl text-[#5F6368] hover:bg-[#F1F3F4] border border-[#DADCE0] transition cursor-pointer"
            >
              <ArrowsDownUp size={16} />
            </button>
          </div>

          {viaName && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-[#1A73E8]">
              <span>Stop: <b>{viaName}</b></span>
              <button
                type="button"
                onClick={() => {
                  setViaCoord(undefined);
                  setViaName(null);
                  const orig =
                    originText === "Your location" && userLocation ? userLocation : originCoord;
                  plan(orig, destinationCoord || destinationText);
                }}
                className="hover:underline font-medium"
              >
                Remove
              </button>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#1A73E8] hover:bg-blue-600 text-white text-xs h-8 rounded-lg mt-1"
            disabled={loading}
          >
            {loading ? "Finding routes…" : "Find route"}
          </Button>
        </form>
      </div>

      {/* Routes & Along-Route Stations */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-xs text-[#D93025] rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* Route options */}
        {routes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6368]">
              Available Routes
            </h3>
            <div className="space-y-2">
              {routes.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`w-full text-left p-3 rounded-xl border transition cursor-pointer ${
                    selected === i
                      ? "border-[#1A73E8] bg-blue-50/50 shadow-sm"
                      : "border-[#DADCE0] hover:bg-[#F8F9FA]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#202124]">
                      {mins(r.durationMin)}
                    </span>
                    <span className="text-xs font-mono text-[#5F6368]">{km(r.distanceKm)}</span>
                  </div>
                  <p className="text-xs text-[#5F6368] mt-0.5">{r.summary}</p>
                </button>
              ))}
            </div>

            {/* Range check alert */}
            {needsCharging && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-[#B06000] flex items-center gap-2">
                <Lightning size={18} weight="fill" className="shrink-0 text-[#F9AB00]" />
                <div>
                  <p className="font-semibold">Charging stop recommended</p>
                  <p className="text-[11px] mt-0.5">
                    Your estimated battery ({batteryPct}%) might fall below 15% during this trip.
                  </p>
                </div>
              </div>
            )}

            {/* Deep link */}
            <div className="pt-1">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                  originText
                )}&destination=${encodeURIComponent(destinationText)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs text-[#1A73E8] hover:underline font-medium p-2 rounded-xl bg-[#F8F9FA] border border-[#DADCE0]"
              >
                <span>Open in Google Maps</span>
                <ArrowSquareOut size={14} />
              </a>
            </div>
          </div>
        )}

        {/* Stations along route */}
        {activeRoute && (
          <div className="space-y-2.5 pt-2 border-t border-[#DADCE0]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#5F6368]">
                Stations Along Route ({alongStations.length})
              </h3>
              {loadingAlong && <span className="text-[11px] text-[#5F6368]">Searching…</span>}
            </div>

            {alongStations.length === 0 && !loadingAlong ? (
              <p className="text-xs text-[#5F6368] py-2">
                No EV charging stations found within 3 km of this route.
              </p>
            ) : (
              <div className="space-y-2">
                {alongStations.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-[#DADCE0] bg-white hover:border-[#1A73E8] transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div
                      className="cursor-pointer flex-1"
                      onClick={() => onSelectStation?.(st.id)}
                    >
                      <h4 className="font-bold text-[#202124] hover:text-[#1A73E8]">{st.name}</h4>
                      <div className="flex items-center gap-2 text-[#5F6368] mt-1 text-[11px]">
                        <span>At {km(st.distanceAlongRouteKm)}</span>
                        <span>•</span>
                        <span>{km(st.detourKm)} detour</span>
                        <span>•</span>
                        <span className="font-semibold text-[#1E8E3E]">
                          {st.waitMinutes === 0 ? "Free now" : `${st.waitMinutes}m wait`}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddStop(st)}
                      className="h-7 text-[11px] px-2.5 shrink-0 border-[#DADCE0] text-[#1A73E8] hover:bg-blue-50"
                    >
                      <Plus size={12} className="mr-1" />
                      Add stop
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
