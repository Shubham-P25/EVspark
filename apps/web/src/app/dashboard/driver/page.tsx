"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { CalendarClock, LocateFixed, MapPin, Navigation, PlugZap, Search, SlidersHorizontal, Star, X, Zap } from "lucide-react";
import { SEED_STATIONS } from "@/lib/stations-data";
import { etaMinutes, haversineKm } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRoute } from "@/hooks/useRoute";
import type { EVStation, StationStatus } from "@/types/station";

const MapComponent = dynamic(() => import("@/components/dashboard/map-component").then((module) => module.MapComponent), {
  ssr: false,
  loading: () => <div className="map-loading">Loading live map...</div>,
});

const filters: { label: string; value: "all" | StationStatus }[] = [
  { label: "All Stations", value: "all" },
  { label: "Available", value: "available" },
  { label: "Busy", value: "busy" },
  { label: "Offline", value: "offline" },
];

function StationCard({ station, selected, onSelect }: { station: EVStation; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`station-card ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="station-card-head"><span className={`status-dot ${station.status}`} /><div><strong>{station.name}</strong><small>{station.distanceKm?.toFixed(1) ?? "-"} km · {station.etaMinutes ?? "-"} min</small></div><span className="station-price">₹{station.pricePerKwh}<small>/kWh</small></span></div>
      <p>{station.address}</p>
      <div className="station-card-meta"><span className={`availability-pill ${station.status}`}>{station.status === "available" ? `${station.availableSlots} available` : station.status}</span><span><Zap size={13} /> {station.powerKw} kW</span><span><PlugZap size={13} /> {station.connectorType}</span></div>
    </button>
  );
}

export default function DriverDashboard() {
  const { position } = useGeolocation();
  const { route, loading: routeLoading, error: routeError, fetchRoute, clearRoute } = useRoute();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | StationStatus>("all");
  const [selectedId, setSelectedId] = useState(SEED_STATIONS[0].id);
  const [recenterKey, setRecenterKey] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const stations: EVStation[] = useMemo(() => SEED_STATIONS.map((station) => {
    if (!position) return station;
    const distanceKm = haversineKm(position.lat, position.lng, station.lat, station.lng);
    return { ...station, distanceKm: +distanceKm.toFixed(1), etaMinutes: etaMinutes(distanceKm) };
  }), [position]);
  const filteredStations = useMemo(() => stations.filter((station) => {
    const matchesQuery = `${station.name} ${station.address}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "all" || station.status === filter;
    return matchesQuery && matchesFilter && (!onlyAvailable || station.status === "available");
  }), [filter, onlyAvailable, query, stations]);
  const selected = stations.find((station) => station.id === selectedId) ?? stations[0];
  const selectStation = useCallback((station: EVStation) => { setSelectedId(station.id); clearRoute(); }, [clearRoute]);
  const handleDirections = useCallback(() => {
    if (position) fetchRoute(position, { lat: selected.lat, lng: selected.lng });
  }, [fetchRoute, position, selected]);

  return (
    <main className="driver-dashboard">
      <header className="driver-header"><Link className="driver-brand" href="/">EVspark</Link><div className="driver-location"><MapPin size={15} /> Thane, Maharashtra</div></header>
      <section className="driver-workspace">
        <aside className="driver-sidebar">
          <div className="sidebar-heading"><div><p>Good morning, Arjun</p><h1>Find a charger</h1></div><button className="filter-toggle" onClick={() => setShowFilters((value) => !value)}><SlidersHorizontal size={18} /></button></div>
          <div className="driver-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search area or station..." /></div>
          <div className="filter-tabs">{filters.map((item) => <button className={filter === item.value ? "active" : ""} key={item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
          {showFilters && <div className="advanced-filters"><label><span>Only show available</span><input type="checkbox" checked={onlyAvailable} onChange={(event) => setOnlyAvailable(event.target.checked)} /></label></div>}
          <div className="results-row"><span>{filteredStations.length} stations nearby</span><button onClick={() => setQuery("")}>Clear</button></div>
          <div className="station-list">{(filteredStations.length ? filteredStations : stations).map((station) => <StationCard key={station.id} station={station} selected={station.id === selected.id} onSelect={() => selectStation(station)} />)}</div>
        </aside>
        <section className="driver-map-area">
          <div className="map-toolbar"><div className="map-legend"><span><i className="legend-dot available" /> Available</span><span><i className="legend-dot busy" /> Busy</span><span><i className="legend-dot offline" /> Offline</span></div><button className="map-tools" onClick={() => setRecenterKey((value) => value + 1)}><LocateFixed size={15} /> Recenter</button></div>
          <MapComponent stations={filteredStations.length ? filteredStations : stations} selectedStation={selected} onSelect={selectStation} userLocation={position} recenterKey={recenterKey} route={route} />
          <button className="locate-button" aria-label="Locate me" onClick={() => setRecenterKey((value) => value + 1)}><LocateFixed size={19} /></button>
          {route && <div className="route-banner"><span>{route.distanceKm} km · {route.durationMin} min</span><button onClick={clearRoute}><X size={14} /> Exit</button></div>}
          {routeError && <div className="route-error">{routeError}</div>}
          <div className="station-detail-panel visible">
            <div className="detail-topbar"><span>Station details</span><button aria-label="Close station details"><X size={18} /></button></div>
            <div className="detail-body">
              <div className="detail-title-row"><div><div className="detail-status"><span className={`status-dot ${selected.status}`} /> {selected.status}</div><h2>{selected.name}</h2><p>{selected.address}</p></div><div className="detail-rating"><Star size={16} fill="currentColor" /> {selected.rating}</div></div>
              <div className="detail-mini-grid"><div><small>Distance</small><strong>{selected.distanceKm ? `${selected.distanceKm} km` : "-"}</strong></div><div><small>Drive time</small><strong>{selected.etaMinutes ? `${selected.etaMinutes} min` : "-"}</strong></div><div><small>Power</small><strong>{selected.powerKw} kW</strong></div><div><small>Price</small><strong>₹{selected.pricePerKwh}/kWh</strong></div></div>
              <div className="detail-amenities">{selected.amenities.map((amenity) => <span key={amenity}>✓ {amenity}</span>)}</div>
              <div className="detail-actions"><button className="outline-action" onClick={handleDirections} disabled={routeLoading || !position}><Navigation size={16} /> {routeLoading ? "Loading..." : "Directions"}</button><button className="primary-action" onClick={() => setShowBooking(true)}><CalendarClock size={16} /> Book a slot</button></div>
            </div>
          </div>
        </section>
      </section>
      {showBooking && <div className="booking-overlay" onClick={(event) => event.target === event.currentTarget && setShowBooking(false)}><div className="booking-modal"><div className="booking-header"><h2>{selected.name}</h2><button aria-label="Close booking" onClick={() => setShowBooking(false)}><X size={19} /></button></div><p>{selected.powerKw} kW · {selected.connectorType} · ₹{selected.pricePerKwh}/kWh</p><button className="confirm-button" onClick={() => setShowBooking(false)}>Confirm booking</button></div></div>}
    </main>
  );
}
