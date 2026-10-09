'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, PolylineF, CircleF } from '@react-google-maps/api';
import type { EVStation } from '@/types/station';
import type { RouteResult } from '@/hooks/useRoute';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 19.2183,
  lng: 72.9781, // Mumbai / Thane region
};

// Module-level static array to prevent useJsApiLoader reloads
const GOOGLE_LIBRARIES: ('places')[] = ['places'];

// Clean, bright, elegant Light Theme - zero POI clutter
const lightMapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  backgroundColor: '#f8fafc',
  styles: [
    // 1. Hide all POIs (businesses, shops, gas stations, landmarks)
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    // 2. Hide transit clutter (bus stops, stations)
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    // 3. Hide road icons/shields to keep roads clean
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    // 4. Soft, natural clean background
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    // 5. Clean, soft light blue water bodies
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#60a5fa' }] },
    // 6. Clean white local roads with subtle border
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
    // 7. Arterial & highway roads
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#94a3b8' }] },
    // 8. Crisp, readable dark slate labels
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  ],
};

function getMarkerIcon(color: 'green' | 'yellow' | 'red', isRecommended = false) {
  const hex = color === 'green' ? '#10B981' : color === 'yellow' ? '#F59E0B' : '#EF4444';
  const size = isRecommended ? 42 : 32;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 36 36">
      ${isRecommended ? '<circle cx="18" cy="18" r="17" fill="rgba(37, 99, 235, 0.2)" stroke="#2563EB" stroke-width="2" />' : ''}
      <circle cx="18" cy="18" r="14" fill="${hex}" stroke="#FFFFFF" stroke-width="2.5" />
      <path d="M19.5 8.5 L12.5 19 L17.5 19 L16.5 27.5 L23.5 17 L18.5 17 Z" fill="#FFFFFF" />
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: typeof google !== 'undefined' ? new google.maps.Size(size, size) : undefined,
    anchor: typeof google !== 'undefined' ? new google.maps.Point(size / 2, size / 2) : undefined,
  };
}

export function GoogleMapComponent({
  stations,
  selectedStation,
  onSelect,
  userLocation,
  recenterKey,
  route,
  recommendedId,
}: {
  stations: EVStation[];
  selectedStation: EVStation | null;
  onSelect: (station: EVStation) => void;
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  recenterKey: number;
  route?: RouteResult | null;
  recommendedId?: string | null;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeInfo, setActiveInfo] = useState<EVStation | null>(null);

  // References to keep camera stable and NEVER reload/reset automatically
  const initialBoundsSetRef = useRef(false);
  const prevSelectedIdRef = useRef<string | null>(null);
  const prevRecenterKeyRef = useRef(0);

  // Set map instance ONCE when loaded
  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      if (!initialBoundsSetRef.current && stations.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        stations.forEach((st) => bounds.extend({ lat: st.lat, lng: st.lng }));
        if (userLocation) bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
        mapInstance.fitBounds(bounds, 50);
        initialBoundsSetRef.current = true;
      }
    },
    // Keep callback stable: do NOT depend on stations or userLocation re-renders
    []
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // ONLY pan when the selected ID actually changes from user action, NOT on telemetry updates
  useEffect(() => {
    if (map && selectedStation && selectedStation.id !== prevSelectedIdRef.current) {
      prevSelectedIdRef.current = selectedStation.id;
      map.panTo({ lat: selectedStation.lat, lng: selectedStation.lng });
      setActiveInfo(selectedStation);
    }
  }, [map, selectedStation?.id]);

  // Handle explicit Recenter button clicks only
  useEffect(() => {
    if (map && userLocation && recenterKey > 0 && recenterKey !== prevRecenterKeyRef.current) {
      prevRecenterKeyRef.current = recenterKey;
      map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
      map.setZoom(14);
    }
  }, [map, userLocation, recenterKey]);

  if (loadError || !apiKey) {
    return (
      <div
        className="google-map-fallback"
        style={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#64748b',
        }}
      >
        <p>Google Maps Key not active or load error. Falling back to internal map view.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="map-loading"
        style={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          color: '#2563eb',
          fontWeight: 600,
        }}
      >
        ⚡ Loading Clean EV Network Map...
      </div>
    );
  }

  const polylinePath = route?.coordinates?.map(([lat, lng]) => ({ lat, lng })) || [];

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : defaultCenter}
      zoom={12}
      options={lightMapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={() => setActiveInfo(null)}
    >
      {/* EV Station Markers (Only stations rendered, no POI clutter) */}
      {stations.map((st) => {
        const isRec = st.id === recommendedId;
        const color = (st.status === 'available' ? 'green' : st.status === 'busy' ? 'yellow' : 'red') as
          | 'green'
          | 'yellow'
          | 'red';

        return (
          <MarkerF
            key={st.id}
            position={{ lat: st.lat, lng: st.lng }}
            icon={getMarkerIcon(color, isRec)}
            onClick={() => {
              onSelect(st);
              setActiveInfo(st);
            }}
            title={st.name}
          />
        );
      })}

      {/* Clean Info Window on marker click */}
      {activeInfo && (
        <InfoWindowF
          position={{ lat: activeInfo.lat, lng: activeInfo.lng }}
          onCloseClick={() => setActiveInfo(null)}
        >
          <div style={{ color: '#0f172a', padding: '6px 4px', maxWidth: '230px', fontFamily: 'inherit' }}>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px', lineHeight: 1.3 }}>
              {activeInfo.name}
            </strong>
            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
              <span>
                {activeInfo.availableSlots ?? 2}/{activeInfo.totalSlots ?? 4} available · {activeInfo.powerKw} kW
              </span>
              <br />
              <b style={{ color: '#059669', fontSize: '12px' }}>₹{activeInfo.pricePerKwh}/kWh</b>
              {activeInfo.etaMinutes ? ` · ${activeInfo.etaMinutes}m drive` : ''}
            </div>
            <button
              onClick={() => onSelect(activeInfo)}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
                width: '100%',
              }}
            >
              View Station Details
            </button>
          </div>
        </InfoWindowF>
      )}

      {/* User Live Location Blue Dot */}
      {userLocation && (
        <>
          <CircleF
            center={{ lat: userLocation.lat, lng: userLocation.lng }}
            radius={userLocation.accuracy ?? 100}
            options={{
              fillColor: '#3b82f6',
              fillOpacity: 0.12,
              strokeColor: '#2563eb',
              strokeWeight: 1.5,
            }}
          />
          <MarkerF
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            title="Your Location"
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
          />
        </>
      )}

      {/* Navigation Polyline Route */}
      {polylinePath.length > 0 && (
        <PolylineF
          path={polylinePath}
          options={{
            strokeColor: '#2563EB',
            strokeOpacity: 0.9,
            strokeWeight: 5,
          }}
        />
      )}
    </GoogleMap>
  );
}
