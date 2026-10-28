"use client";

import { useState, useCallback, useRef } from "react";

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  route: google.maps.DirectionsRoute | null;
  path: LatLngPoint[] | null;
  distanceKm: number;
  durationMin: number;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
}

export function useRoute() {
  const [result, setResult] = useState<RouteResult>({
    route: null,
    path: null,
    distanceKm: 0,
    durationMin: 0,
    status: "idle",
    error: null,
  });

  const activeRequestIdRef = useRef<number>(0);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);

  const calculateRoute = useCallback(
    async (
      origin: LatLngPoint | string,
      destination: LatLngPoint | string,
      travelMode: google.maps.TravelMode = google.maps.TravelMode.DRIVING
    ) => {
      const requestId = ++activeRequestIdRef.current;

      if (!window.google?.maps?.DirectionsService) {
        setResult((prev) => ({
          ...prev,
          status: "error",
          error: "Google Maps DirectionsService not available yet",
        }));
        return;
      }

      if (!directionsServiceRef.current) {
        directionsServiceRef.current = new google.maps.DirectionsService();
      }

      setResult((prev) => ({ ...prev, status: "loading", error: null }));

      try {
        const response = await directionsServiceRef.current.route({
          origin,
          destination,
          travelMode,
        });

        // Cancel if a newer request was made in the meantime
        if (requestId !== activeRequestIdRef.current) return;

        const primaryRoute = response.routes[0];
        if (!primaryRoute) {
          setResult({
            route: null,
            path: null,
            distanceKm: 0,
            durationMin: 0,
            status: "error",
            error: "No route found",
          });
          return;
        }

        // Extract path coordinates for RouteLine polyline
        const path: LatLngPoint[] = primaryRoute.overview_path.map((point) => ({
          lat: point.lat(),
          lng: point.lng(),
        }));

        const leg = primaryRoute.legs[0];
        const distanceKm = leg ? (leg.distance?.value || 0) / 1000 : 0;
        const durationMin = leg ? Math.round((leg.duration?.value || 0) / 60) : 0;

        setResult({
          route: primaryRoute,
          path,
          distanceKm,
          durationMin,
          status: "success",
          error: null,
        });
      } catch (err: any) {
        if (requestId !== activeRequestIdRef.current) return;
        setResult({
          route: null,
          path: null,
          distanceKm: 0,
          durationMin: 0,
          status: "error",
          error: err?.message || "Failed to calculate directions",
        });
      }
    },
    []
  );

  const clearRoute = useCallback(() => {
    activeRequestIdRef.current++;
    setResult({
      route: null,
      path: null,
      distanceKm: 0,
      durationMin: 0,
      status: "idle",
      error: null,
    });
  }, []);

  return {
    ...result,
    calculateRoute,
    clearRoute,
  };
}
