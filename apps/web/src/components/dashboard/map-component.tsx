'use client'

import { useEffect } from 'react'
import { Circle, MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-defaulticon-compatibility'
import type { EVStation } from '@/types/station'
import type { RouteResult } from '@/hooks/useRoute'

function MapFocus({ stations, station }: { stations: EVStation[]; station: EVStation | null }) {
  const map = useMap()
  useEffect(() => {
    if (!stations.length) return
    const bounds = L.latLngBounds(stations.map((item) => [item.lat, item.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 11, animate: false })
  }, [map, stations])
  useEffect(() => {
    if (station) map.panTo([station.lat, station.lng], { animate: true, duration: 0.4 })
  }, [map, station])
  return null
}

function MapResize({ recenterKey, userLocation }: { recenterKey: number; userLocation: { lat: number; lng: number } | null }) {
  const map = useMap()

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }))
    observer.observe(map.getContainer())
    map.invalidateSize({ animate: false })
    return () => observer.disconnect()
  }, [map])

  useEffect(() => {
    if (recenterKey > 0 && userLocation) map.setView([userLocation.lat, userLocation.lng], 13, { animate: true })
  }, [map, recenterKey, userLocation])

  return null
}

const statusColors = { available: '#10b981', busy: '#f59e0b', offline: '#94a3b8' } as const

function stationIcon(station: EVStation) {
  return L.divIcon({
    className: 'station-icon',
    html: `<span style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${statusColors[station.status]};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);color:white;font-size:15px">⚡</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  })
}

const userIcon = L.divIcon({
  className: 'user-location-icon',
  html: '<span style="display:block;width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 7px rgba(37,99,235,.22),0 0 8px rgba(37,99,235,.7)"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export function MapComponent({ stations, selectedStation, onSelect, userLocation, recenterKey, route }: { stations: EVStation[]; selectedStation: EVStation | null; onSelect: (station: EVStation) => void; userLocation: { lat: number; lng: number; accuracy?: number } | null; recenterKey: number; route?: RouteResult | null }) {
  return <MapContainer center={[19.2183, 72.9781]} zoom={12} zoomControl className="leaflet-map" attributionControl>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
    <MapFocus stations={stations} station={selectedStation} />
    <MapResize recenterKey={recenterKey} userLocation={userLocation} />
    {stations.map((station) => <Marker key={station.id} position={[station.lat, station.lng]} icon={stationIcon(station)} eventHandlers={{ click: () => onSelect(station) }}>
      <Popup>
        <strong>{station.name}</strong><br />
        <span>{station.availableSlots}/{station.totalSlots} slots · {station.powerKw} kW</span><br />
        <span>{station.connectorType} · ₹{station.pricePerKwh}/kWh</span>
      </Popup>
    </Marker>)}
    {userLocation && <><Circle center={[userLocation.lat, userLocation.lng]} radius={userLocation.accuracy ?? 80} pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.16, weight: 1 }} /><Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} zIndexOffset={1000}><Popup>You are here</Popup></Marker></>}
    {route && <Polyline positions={route.coordinates} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.85 }} />}
  </MapContainer>
}

export function getStationIcon(station: EVStation) {
  return stationIcon(station)
}
