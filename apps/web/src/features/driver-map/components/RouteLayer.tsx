'use client';

import React, { useEffect, useRef } from 'react';
import { useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useDriverMap } from '../store';
import { useRoute } from '../hooks/useRoute';

export function RouteLayer() {
  const map = useMap();
  const routeTo = useDriverMap((s) => s.routeTo);
  const user = useDriverMap((s) => s.user);
  const { data: route } = useRoute(user, routeTo);

  const casingRef = useRef<google.maps.Polyline | null>(null);
  const lineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !route?.path || route.path.length === 0) {
      if (casingRef.current) casingRef.current.setMap(null);
      if (lineRef.current) lineRef.current.setMap(null);
      return;
    }

    const gPath = route.path.map((p) => ({ lat: p.lat, lng: p.lng }));

    // Casing (underneath)
    if (!casingRef.current) {
      casingRef.current = new google.maps.Polyline({
        path: gPath,
        strokeColor: '#ffffff',
        strokeWeight: 10,
        strokeOpacity: 0.9,
        zIndex: 11,
      });
      casingRef.current.setMap(map);
    } else {
      casingRef.current.setPath(gPath);
      casingRef.current.setMap(map);
    }

    // Accent line (on top)
    if (!lineRef.current) {
      lineRef.current = new google.maps.Polyline({
        path: gPath,
        strokeColor: '#e5392a',
        strokeWeight: 6,
        strokeOpacity: 1.0,
        zIndex: 12,
      });
      lineRef.current.setMap(map);
    } else {
      lineRef.current.setPath(gPath);
      lineRef.current.setMap(map);
    }

    // Auto-fit bounds
    const bounds = new google.maps.LatLngBounds();
    for (const pt of gPath) {
      bounds.extend(pt);
    }
    // DECISION: padding around viewport
    map.fitBounds(bounds, {
      top: 96,
      bottom: 96,
      left: window.innerWidth > 1024 ? 416 : 48,
      right: 96,
    });

    return () => {
      if (casingRef.current) casingRef.current.setMap(null);
      if (lineRef.current) lineRef.current.setMap(null);
    };
  }, [map, route]);

  if (!route?.path || route.path.length < 2) return null;

  const origin = route.path[0];
  const destination = route.path[route.path.length - 1];

  return (
    <>
      {origin && (
        <AdvancedMarker position={origin} zIndex={50}>
          <div
            aria-label="Route start point"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white font-mono text-xs font-bold text-ev-accent shadow-pin border-2 border-ev-accent"
          >
            1
          </div>
        </AdvancedMarker>
      )}
      {destination && (
        <AdvancedMarker position={destination} zIndex={50}>
          <div
            aria-label="Route destination"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white font-mono text-xs font-bold text-ev-accent shadow-pin border-2 border-ev-accent"
          >
            2
          </div>
        </AdvancedMarker>
      )}
    </>
  );
}

