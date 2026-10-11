"use client";

import { useCallback, useState } from "react";
import type { LatLng } from "@/hooks/useGeolocation";

export interface RouteResult {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
}

export function useRoute() {
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoute = useCallback(async (from: LatLng, to: LatLng) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`);
      if (!response.ok) throw new Error("Unable to load directions");
      const data = await response.json();
      if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("Route not found");
      const selectedRoute = data.routes[0];
      setRoute({
        coordinates: selectedRoute.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]),
        distanceKm: +(selectedRoute.distance / 1000).toFixed(1),
        durationMin: Math.round(selectedRoute.duration / 60),
      });
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : "Unable to load directions");
    } finally {
      setLoading(false);
    }
  }, []);

  return { route, loading, error, fetchRoute, clearRoute: useCallback(() => setRoute(null), []) };
}