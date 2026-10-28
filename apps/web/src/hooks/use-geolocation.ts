"use client";

import { useEffect, useState, useRef } from "react";

export interface Me {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
}

export type GeoStatus = "idle" | "ok" | "denied" | "unavailable";

export function useGeolocation() {
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [showConsent, setShowConsent] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startWatching = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
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
  };

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    const consent = localStorage.getItem("evspark-location-consent");
    if (consent === "not_now") {
      setStatus("denied");
      return;
    }

    startWatching();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleConsent = (allow: boolean) => {
    setShowConsent(false);
    if (allow) {
      localStorage.setItem("evspark-location-consent", "allow");
      startWatching();
    } else {
      localStorage.setItem("evspark-location-consent", "not_now");
      setStatus("denied");
    }
  };

  return { me, status, showConsent, handleConsent };
}
