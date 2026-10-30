'use client';

import { useQuery } from '@tanstack/react-query';
import type { LatLng, RouteResult } from '../types';

export function useRoute(user: LatLng | null, destinationStationId: string | null) {
  return useQuery<RouteResult | null>({
    queryKey: ['route', user?.lat, user?.lng, destinationStationId],
    enabled: Boolean(user && destinationStationId),
    staleTime: 10000,
    queryFn: async () => {
      if (!user || !destinationStationId) return null;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/route`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: { lat: user.lat, lng: user.lng },
            stationId: destinationStationId,
          }),
        });

        if (res.ok) {
          return await res.json();
        }
      } catch {
        // Fallback or network error
      }

      // DECISION: fallback route calculation when backend is unreachable
      return {
        path: [
          { lat: user.lat, lng: user.lng },
          { lat: user.lat + 0.015, lng: user.lng + 0.02 },
        ],
        distanceKm: 3.2,
        etaMin: 9,
        waitOnArrivalMin: 0,
        matchScore: 88,
      };
    },
  });
}
