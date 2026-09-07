"use client";

import { useEffect, useState } from "react";

export interface LatLng {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    const watch = navigator.geolocation.watchPosition(({ coords }) => {
      setPosition({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
      setError(null);
    }, ({ message }) => setError(message), { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  return { position, error };
}