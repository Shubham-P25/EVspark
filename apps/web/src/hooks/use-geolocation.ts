"use client";

import { useEffect, useState } from "react";
import type { Me } from "@/components/map/user-location";

export type GeoStatus = "idle" | "ok" | "denied" | "unavailable";

export function useGeolocation() {
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (p) => {
        setMe({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy,
          heading: p.coords.heading,
        });
        setStatus("ok");
      },
      (e) => setStatus(e.code === e.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { me, status };
}
