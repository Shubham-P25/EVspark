import { useEffect } from 'react';
import { useDriverMap } from '../store';

export function useUserLocation() {
  const setUser = useDriverMap((s) => s.setUser);
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) =>
        setUser({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          heading: p.coords.heading ?? undefined,
        }),
      () => setUser(null),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [setUser]);
}

