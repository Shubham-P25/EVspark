'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import Supercluster from 'supercluster';
import { useDriverMap } from '../store';
import { StationPin } from './StationPin';
import { ClusterBubble } from './ClusterBubble';
import { UserMarker } from './UserMarker';
import { RouteLayer } from './RouteLayer';
import { DemoCarMarker } from './DemoCarMarker';
import { LIGHT_MAP_STYLE } from '../map-style';
import type { Station, DemoCar } from '../types';

type Props = {
  stations: Station[];
  cars: DemoCar[];
  onBoundsChange: (b: google.maps.LatLngBoundsLiteral, zoom: number) => void;
};

function clusterBounds(
  index: Supercluster<{ id: string }, { free: number }>,
  clusterId: number
): google.maps.LatLngBoundsLiteral {
  const leaves = index.getLeaves(clusterId, Infinity);
  let n = -90;
  let s = 90;
  let e = -180;
  let w = 180;
  for (const l of leaves) {
    const [lng, lat] = l.geometry.coordinates;
    n = Math.max(n, lat);
    s = Math.min(s, lat);
    e = Math.max(e, lng);
    w = Math.min(w, lng);
  }
  return { north: n, south: s, east: e, west: w };
}

function Inner({ stations, cars, onBoundsChange }: Props) {
  const map = useMap();
  const [view, setView] = useState<{ bbox: [number, number, number, number]; zoom: number }>({
    bbox: [-180, -85, 180, 85],
    zoom: 13,
  });
  const { selectedId, select, user, hover, routeTo, setMapInstance } = useDriverMap();
  const geofenceCircleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    setMapInstance(map ?? null);
    return () => setMapInstance(null);
  }, [map, setMapInstance]);

  const index = useMemo(() => {
    const sc = new Supercluster<{ id: string }, { free: number }>({
      radius: 60,
      maxZoom: 16,
      minPoints: 3,
      map: () => ({ free: 0 }),
      reduce: () => {},
    });
    sc.load(
      stations.map((s) => ({
        type: 'Feature' as const,
        properties: { id: s.id },
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
      }))
    );
    return sc;
  }, [stations]);

  const byId = useMemo(() => new globalThis.Map(stations.map((s) => [s.id, s])), [stations]);
  const items = useMemo(() => index.getClusters(view.bbox, Math.round(view.zoom)), [index, view]);

  const handleIdle = useCallback(() => {
    const b = map?.getBounds();
    const z = map?.getZoom();
    if (!b || z == null) return;
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    setView({ bbox: [sw.lng(), sw.lat(), ne.lng(), ne.lat()], zoom: z });
    onBoundsChange({ north: ne.lat(), east: ne.lng(), south: sw.lat(), west: sw.lng() }, z);
  }, [map, onBoundsChange]);

  // DECISION: replace useMemo with useEffect and proper listener cleanup
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', handleIdle);
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, handleIdle]);

  // Render geofence around selected station
  const selectedStation = selectedId ? byId.get(selectedId) : null;
  useEffect(() => {
    if (!map) return;
    if (selectedStation) {
      const radius = selectedStation.geofence?.radiusM || 100;
      if (!geofenceCircleRef.current) {
        geofenceCircleRef.current = new google.maps.Circle({
          center: { lat: selectedStation.lat, lng: selectedStation.lng },
          radius,
          fillColor: '#e5392a',
          fillOpacity: 0.08,
          strokeColor: '#e5392a',
          strokeWeight: 1.5,
          map,
        });
      } else {
        geofenceCircleRef.current.setCenter({ lat: selectedStation.lat, lng: selectedStation.lng });
        geofenceCircleRef.current.setRadius(radius);
        geofenceCircleRef.current.setMap(map);
      }
    } else if (geofenceCircleRef.current) {
      geofenceCircleRef.current.setMap(null);
    }
    return () => {
      if (geofenceCircleRef.current) {
        geofenceCircleRef.current.setMap(null);
      }
    };
  }, [map, selectedStation]);

  return (
    <>
      {items.map((f) => {
        const [lng, lat] = f.geometry.coordinates;
        if ((f.properties as any).cluster) {
          const count = (f.properties as any).point_count as number;
          return (
            <AdvancedMarker
              key={`c-${f.id}`}
              position={{ lat, lng }}
              zIndex={5}
              onClick={() => map?.fitBounds(clusterBounds(index, f.id as number), 80)}
            >
              <ClusterBubble count={count} />
            </AdvancedMarker>
          );
        }
        const s = byId.get((f.properties as any).id as string);
        if (!s) return null;
        return (
          <AdvancedMarker
            key={s.id}
            position={{ lat, lng }}
            zIndex={s.id === selectedId ? 100 : s.status === 'free' ? 20 : 10}
            onClick={() => select(s.id)}
          >
            <StationPin
              station={s}
              selected={s.id === selectedId}
              onHover={(h) => hover(h ? s.id : null)}
              onSelect={() => select(s.id)}
            />
          </AdvancedMarker>
        );
      })}
      {user && (
        <AdvancedMarker position={user} zIndex={90}>
          <UserMarker heading={user.heading} />
        </AdvancedMarker>
      )}
      {cars.map((c) => (
        <DemoCarMarker key={c.id} car={c} />
      ))}
      {routeTo && <RouteLayer />}
    </>
  );
}

export function MapCanvas(props: Props) {
  const mapType = useDriverMap((s) => s.mapType);
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    '';
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

  return (
    <APIProvider apiKey={apiKey}>
      <GoogleMap
        className="absolute inset-0 w-full h-full"
        mapId={mapId}
        defaultCenter={{ lat: 19.076, lng: 72.8777 }}
        defaultZoom={13}
        mapTypeId={mapType}
        disableDefaultUI
        gestureHandling="greedy"
        clickableIcons={false}
        styles={mapId ? undefined : LIGHT_MAP_STYLE}
        onClick={() => useDriverMap.getState().select(null)}
      >
        <Inner {...props} />
      </GoogleMap>
    </APIProvider>
  );
}
