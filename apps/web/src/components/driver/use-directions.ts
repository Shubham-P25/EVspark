"use client";

import { useCallback, useState } from "react";

export interface RouteOption {
  index: number;
  summary: string;
  distanceKm: number;
  durationMin: number;
  encoded: string;
  path: google.maps.LatLngLiteral[];
}

export function useDirections() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plan = useCallback(
    async (
      origin: google.maps.LatLngLiteral | string,
      destination: google.maps.LatLngLiteral | string,
      via?: google.maps.LatLngLiteral
    ) => {
      setLoading(true);
      setError(null);
      try {
        const svc = new google.maps.DirectionsService();
        const res = await svc.route({
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: !via,
          waypoints: via ? [{ location: via, stopover: true }] : undefined,
          region: "in",
        });

        const opts = res.routes.slice(0, 3).map((r, i): RouteOption => {
          const legs = r.legs;
          const overviewPolyline = (r as any).overview_polyline;
          const encoded =
            typeof overviewPolyline === "string"
              ? overviewPolyline
              : overviewPolyline?.points || "";

          return {
            index: i,
            summary: r.summary || `Route ${i + 1}`,
            distanceKm: legs.reduce((s, l) => s + (l.distance?.value ?? 0), 0) / 1000,
            durationMin: legs.reduce((s, l) => s + (l.duration?.value ?? 0), 0) / 60,
            encoded,
            path: r.overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() })),
          };
        });

        setRoutes(opts);
        setSelected(0);
      } catch {
        setError("No route found between these places.");
        setRoutes([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    routes,
    selected,
    setSelected,
    plan,
    clear: () => setRoutes([]),
    loading,
    error,
  };
}
