"use client";

import { useCallback } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { haversineKm } from "@evspark/shared";
import { usePinStore } from "../stores/pin-store";
import { useMapUiStore } from "../stores/map-ui-store";

export function useMapActions() {
  const map = useMap();
  const setSelectedId = useMapUiStore((s) => s.setSelectedId);

  const flyTo = useCallback(
    (lat: number, lng: number, zoom = 15) => {
      if (!map) return;
      map.panTo({ lat, lng });
      map.setZoom(zoom);
    },
    [map]
  );

  const fitBounds = useCallback(
    (bounds: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral, padding = 60) => {
      if (!map) return;
      map.fitBounds(bounds, padding);
    },
    [map]
  );

  const locateMe = useCallback(
    (onLocationFound?: (loc: { lat: number; lng: number }) => void) => {
      if (!map || typeof window === "undefined" || !navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          onLocationFound?.({ lat: userLat, lng: userLng });

          const pins = Array.from(usePinStore.getState().pins.values());
          if (pins.length > 0) {
            // Find closest station
            let closest = pins[0];
            let minDistance = haversineKm(userLat, userLng, closest.lat, closest.lng);

            for (let i = 1; i < pins.length; i++) {
              const d = haversineKm(userLat, userLng, pins[i].lat, pins[i].lng);
              if (d < minDistance) {
                minDistance = d;
                closest = pins[i];
              }
            }

            // Zoom so user and nearest station are visible
            const bounds = new google.maps.LatLngBounds();
            bounds.extend({ lat: userLat, lng: userLng });
            bounds.extend({ lat: closest.lat, lng: closest.lng });
            map.fitBounds(bounds, 90);
          } else {
            map.panTo({ lat: userLat, lng: userLng });
            map.setZoom(14);
          }
        },
        (err) => {
          console.warn("Geolocation failed:", err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    },
    [map]
  );

  const fuel = useCallback(
    (
      userLocation?: { lat: number; lng: number } | null,
      onRoute?: (dest: { lat: number; lng: number }) => void
    ) => {
      if (!map) return;

      const pins = Array.from(usePinStore.getState().pins.values()).filter((p) => p.usable > 0);
      if (pins.length === 0) return;

      const center = userLocation || map.getCenter()?.toJSON() || { lat: 19.076, lng: 72.8777 };

      // Score = distanceKm * 1.5 + predicted wait
      // Where wait is 0 if free > 0, otherwise ~15 mins
      let bestPin = pins[0];
      let bestScore = Infinity;

      for (const p of pins) {
        const distanceKm = haversineKm(center.lat, center.lng, p.lat, p.lng);
        const waitMin = p.free > 0 ? 0 : 15;
        const score = distanceKm * 1.5 + waitMin;

        if (score < bestScore) {
          bestScore = score;
          bestPin = p;
        }
      }

      if (bestPin) {
        map.panTo({ lat: bestPin.lat, lng: bestPin.lng });
        map.setZoom(15);
        setSelectedId(bestPin.id);
        onRoute?.({ lat: bestPin.lat, lng: bestPin.lng });
      }
    },
    [map, setSelectedId]
  );

  return {
    flyTo,
    fitBounds,
    locateMe,
    fuel,
  };
}
