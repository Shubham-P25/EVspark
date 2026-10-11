"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  GoogleMap,
  TrafficLayer,
  TransitLayer,
  BicyclingLayer,
  useJsApiLoader,
} from "@react-google-maps/api";

const LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"]; // module-level constant: never inline
export type MapTypeId = "roadmap" | "satellite" | "terrain";
export type StylePreset = "default" | "clean" | "silver";

const STYLES: Record<StylePreset, google.maps.MapTypeStyle[] | undefined> = {
  default: undefined,
  clean: [
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ],
  silver: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d6e2" }] },
  ],
};

export interface Viewport {
  bounds: [number, number, number, number]; // west, south, east, north
  zoom: number;
  center: { lat: number; lng: number };
}

const MUMBAI = { lat: 19.076, lng: 72.8777 };

export function EvMap({
  center,
  mapTypeId,
  stylePreset,
  traffic,
  transit,
  bicycling,
  onViewport,
  onMapReady,
  onMapClick,
  children,
}: {
  center?: { lat: number; lng: number };
  mapTypeId: MapTypeId;
  stylePreset: StylePreset;
  traffic: boolean;
  transit: boolean;
  bicycling: boolean;
  onViewport: (v: Viewport) => void;
  onMapReady?: (m: google.maps.Map) => void;
  onMapClick?: (ll: google.maps.LatLngLiteral) => void;
  children?: ReactNode;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useJsApiLoader({
    id: "evspark-gmaps",
    googleMapsApiKey: key ?? "",
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opts] = useState<google.maps.MapOptions>({
    disableDefaultUI: true,
    gestureHandling: "greedy",
    clickableIcons: false,
    minZoom: 4,
    maxZoom: 20,
  });

  const emit = useCallback(() => {
    const m = mapRef.current;
    const b = m?.getBounds();
    const c = m?.getCenter();
    if (!m || !b || !c) return;
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    onViewport({
      bounds: [sw.lng(), sw.lat(), ne.lng(), ne.lat()],
      zoom: m.getZoom() ?? 12,
      center: { lat: c.lat(), lng: c.lng() },
    });
  }, [onViewport]);

  const onIdle = useCallback(() => {
    // debounce 400 ms => one request per idle
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(emit, 400);
  }, [emit]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    mapRef.current?.setOptions({ styles: STYLES[stylePreset] });
  }, [stylePreset]);

  if (!key) {
    return (
      <MapError text="NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing. Add it to apps/web/.env.local." />
    );
  }
  if (loadError) {
    return (
      <MapError text="Google Maps failed to load. Check the API key, billing and allowed referrers." />
    );
  }
  if (!isLoaded) {
    return (
      <div className="grid h-full place-items-center bg-[#F8F9FA] text-sm text-[#5F6368]">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 rounded-full border-2 border-[#1A73E8] border-t-transparent animate-spin" />
          <span>Loading map…</span>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={center ?? MUMBAI}
      zoom={12}
      mapTypeId={mapTypeId}
      options={opts}
      onLoad={(m) => {
        mapRef.current = m;
        m.setOptions({ styles: STYLES[stylePreset] });
        onMapReady?.(m);
      }}
      onIdle={onIdle}
      onClick={(e) =>
        e.latLng && onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      }
    >
      {traffic && <TrafficLayer />}
      {transit && <TransitLayer />}
      {bicycling && <BicyclingLayer />}
      {children}
    </GoogleMap>
  );
}

function MapError({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center bg-[#F8F9FA] p-6">
      <div className="max-w-sm rounded-2xl bg-white p-6 text-sm text-[#D93025] shadow-lg border border-red-200 text-center">
        <p className="font-semibold mb-2">Map Configuration Notice</p>
        <p className="text-[#5F6368]">{text}</p>
      </div>
    </div>
  );
}
