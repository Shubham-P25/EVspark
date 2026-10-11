"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  CalendarClock,
  Compass,
  Heart,
  History,
  LocateFixed,
  MapPin,
  Navigation,
  PlugZap,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trees,
  X,
  Zap,
} from "lucide-react";
import { SEED_STATIONS } from "@/lib/stations-data";
import { etaMinutes, haversineKm } from "@/lib/geo";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useRoute } from "@/hooks/useRoute";
import { useSocket } from "@/hooks/useSocket";
import type { EVStation, StationStatus } from "@/types/station";
import "./driver.css";

// Dynamic map components
const GoogleMapComponent = dynamic(
  () => import("@/components/dashboard/google-map-component").then((m) => m.GoogleMapComponent),
  {
    ssr: false,
    loading: () => <div className="map-loading">⚡ Loading Google Maps EV Network...</div>,
  }
);

const LeafletMapComponent = dynamic(
  () => import("@/components/dashboard/map-component").then((m) => m.MapComponent),
  {
    ssr: false,
    loading: () => <div className="map-loading">Loading live map...</div>,
  }
);

type ActiveTab = "nearby" | "journey" | "favourites" | "bookings" | "eco";

export default function DriverDashboard() {
  const { position } = useGeolocation();
  const { route, loading: routeLoading, error: routeError, fetchRoute, clearRoute } = useRoute();

  const [stations, setStations] = useState<EVStation[]>(SEED_STATIONS);
  const [activeTab, setActiveTab] = useState<ActiveTab>("nearby");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | StationStatus>("all");
  const [connectorFilter, setConnectorFilter] = useState<string>("All");
  const [selectedId, setSelectedId] = useState(SEED_STATIONS[0].id);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [fuelReason, setFuelReason] = useState<string | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueType, setIssueType] = useState("damage");
  const [issueText, setIssueText] = useState("");
  const [useGoogleMaps, setUseGoogleMaps] = useState(true);
  const [overloadAlert, setOverloadAlert] = useState<string | null>(null);

  // Favourites state (local storage / memory)
  const [favourites, setFavourites] = useState<string[]>([]);
  // Bookings state
  const [bookings, setBookings] = useState<any[]>([
    {
      id: "bk-1",
      stationName: "Tata Power EZ Charge - Bandra Kurla Complex",
      slotTime: "Today, 4:30 PM",
      powerKw: 120,
      connector: "CCS2",
      status: "CONFIRMED",
    },
  ]);

  // Journey planner state
  const [journeyFrom, setJourneyFrom] = useState("Mumbai");
  const [journeyTo, setJourneyTo] = useState("Pune");
  const [journeyRangeKm, setJourneyRangeKm] = useState(300);
  const [journeyResult, setJourneyResult] = useState<any | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

  // Fetch live stations from API if available
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${apiUrl}/api/stations`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: EVStation[] = data.map((st: any) => ({
            id: st.id,
            name: st.name,
            address: st.address || `${st.city}, Maharashtra`,
            lat: st.lat,
            lng: st.lng,
            status: st.isOverloaded
              ? "busy"
              : st.availableChargers > 0
              ? "available"
              : "busy",
            availableSlots: st.availableChargers ?? 1,
            totalSlots: st.totalChargers ?? (st.chargers?.length || 4),
            powerKw: st.powerKw || 60,
            connectorType: st.connectorType || "CCS2",
            pricePerKwh: st.pricePerKwh || 18,
            rating: st.ratingAvg || 4.7,
            amenities: st.amenities || ["WiFi", "Cafe", "Restroom"],
            network: st.operatorName || "Tata Power",
            chargers: st.chargers || [],
          }));
          setStations(mapped);
        }
      })
      .catch(() => {
        // Fall back to seed stations
      });
  }, []);

  // Listen to live Socket.io events
  useSocket("charger:update", (updatedCharger: any) => {
    setStations((prev) =>
      prev.map((st) => {
        if (st.chargers && st.chargers.some((c: any) => c.id === updatedCharger.id)) {
          const updatedChargers = st.chargers.map((c: any) =>
            c.id === updatedCharger.id ? { ...c, status: updatedCharger.status } : c
          );
          const freeCount = updatedChargers.filter((c: any) => c.status === "FREE").length;
          return {
            ...st,
            chargers: updatedChargers,
            availableSlots: freeCount,
            status: freeCount > 0 ? "available" : "busy",
          };
        }
        return st;
      })
    );
  });

  useSocket("alert:overload", (alert: any) => {
    setOverloadAlert(alert.message || "High demand surge detected on nearby charging hubs");
    setTimeout(() => setOverloadAlert(null), 8000);
  });

  // Calculate distance & ETA based on user location
  const enrichedStations = useMemo(() => {
    return stations.map((st) => {
      if (!position) return st;
      const dist = haversineKm(position.lat, position.lng, st.lat, st.lng);
      return {
        ...st,
        distanceKm: +dist.toFixed(1),
        etaMinutes: etaMinutes(dist),
      };
    });
  }, [stations, position]);

  // Filtered station list for Nearby tab
  const filteredStations = useMemo(() => {
    return enrichedStations.filter((st) => {
      const matchQuery = `${st.name} ${st.address}`.toLowerCase().includes(query.toLowerCase());
      const matchStatus = filter === "all" || st.status === filter;
      const matchConnector =
        connectorFilter === "All" ||
        st.connectorType.toLowerCase().includes(connectorFilter.toLowerCase());
      return matchQuery && matchStatus && matchConnector;
    });
  }, [enrichedStations, query, filter, connectorFilter]);

  const selected = enrichedStations.find((st) => st.id === selectedId) ?? enrichedStations[0];

  const selectStation = useCallback(
    (st: EVStation) => {
      setSelectedId(st.id);
      clearRoute();
    },
    [clearRoute]
  );

  const handleDirections = useCallback(() => {
    if (position && selected) {
      fetchRoute(position, { lat: selected.lat, lng: selected.lng });
    }
  }, [fetchRoute, position, selected]);

  // One-tap Fuel Recommendation (Section 0 & 6)
  const handleFuelRecommend = async () => {
    const userLat = position?.lat ?? 19.2183;
    const userLng = position?.lng ?? 72.9781;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    try {
      const res = await fetch(`${apiUrl}/api/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userLat,
          lng: userLng,
          connector: connectorFilter !== "All" ? connectorFilter : "CCS2",
        }),
      });
      const data = await res.json();
      if (data.recommendations && data.recommendations[0]) {
        const topRec = data.recommendations[0];
        setRecommendedId(topRec.station.id);
        setSelectedId(topRec.station.id);
        setFuelReason(topRec.reason);
        setRecenterKey((k) => k + 1);
        setActiveTab("nearby");
        return;
      }
    } catch {
      // Fallback local scoring if API offline
    }

    // Local Fuel scoring fallback
    const available = enrichedStations.filter((s) => s.status === "available");
    const best = (available.length ? available : enrichedStations)[0];
    if (best) {
      setRecommendedId(best.id);
      setSelectedId(best.id);
      setFuelReason(`No wait · ${best.distanceKm ?? 1.8} km away (${best.etaMinutes ?? 5}m drive)`);
      setRecenterKey((k) => k + 1);
    }
  };

  // Plan Journey
  const handlePlanJourney = async () => {
    setJourneyLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      // Coordinates for Mumbai & Pune
      const fromCoords = { lat: 19.076, lng: 72.8777 };
      const toCoords = { lat: 18.5204, lng: 73.8567 };

      const res = await fetch(`${apiUrl}/api/journeys/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromCoords,
          to: toCoords,
          rangeKm: journeyRangeKm,
          connector: "CCS2",
        }),
      });
      const data = await res.json();
      setJourneyResult(data);
      if (data.routePolyline) {
        // Draw polyline on map
        clearRoute();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJourneyLoading(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setFavourites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Submit Slot Booking
  const handleConfirmBooking = () => {
    const newBooking = {
      id: `bk-${Date.now()}`,
      stationName: selected.name,
      slotTime: "Today in 30 mins",
      powerKw: selected.powerKw,
      connector: selected.connectorType,
      status: "CONFIRMED",
    };
    setBookings((prev) => [newBooking, ...prev]);
    setShowBooking(false);
    setActiveTab("bookings");
  };

  // Submit Issue
  const handleSubmitIssue = async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      await fetch(`${apiUrl}/api/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stationId: selected.id,
          type: issueType,
          text: issueText || "Reported problem via driver dashboard",
        }),
      });
    } catch {}
    setShowIssueModal(false);
    setIssueText("");
  };

  return (
    <main className="driver-dashboard">
      {/* Top Header */}
      <header className="driver-header">
        <Link className="driver-brand" href="/">
          <span>⚡</span>
          EVspark
        </Link>
        <div className="driver-location">
          <MapPin size={15} /> Mumbai Metropolitan Region · Live Digital Twin
        </div>
        <div className="driver-header-actions">
          <button
            onClick={() => setUseGoogleMaps((v) => !v)}
            style={{
              fontSize: "11px",
              padding: "5px 10px",
              borderRadius: "8px",
              background: useGoogleMaps ? "#eff6ff" : "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: useGoogleMaps ? "#2563eb" : "#475569",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {useGoogleMaps ? "🗺️ Google Maps Active" : "🗺️ Switch to Google"}
          </button>
          <Link href="/dashboard/operator" style={{ fontSize: "12px", color: "#64748b" }}>
            Operator View →
          </Link>
        </div>
      </header>

      {/* Overload Alert Ribbon */}
      {overloadAlert && (
        <div className="overload-ribbon">
          <AlertTriangle size={15} />
          {overloadAlert}
        </div>
      )}

      {/* Main Workspace */}
      <section className="driver-workspace">
        {/* Left Sidebar / Panels */}
        <aside className="driver-sidebar">
          {/* Navigation Tabs */}
          <div className="tab-nav">
            <button
              className={activeTab === "nearby" ? "active" : ""}
              onClick={() => setActiveTab("nearby")}
            >
              <Compass size={14} /> Nearby
            </button>
            <button
              className={activeTab === "journey" ? "active" : ""}
              onClick={() => setActiveTab("journey")}
            >
              <Navigation size={14} /> Journey
            </button>
            <button
              className={activeTab === "favourites" ? "active" : ""}
              onClick={() => setActiveTab("favourites")}
            >
              <Heart size={14} /> Saved ({favourites.length})
            </button>
            <button
              className={activeTab === "bookings" ? "active" : ""}
              onClick={() => setActiveTab("bookings")}
            >
              <CalendarClock size={14} /> Bookings
            </button>
            <button
              className={activeTab === "eco" ? "active" : ""}
              onClick={() => setActiveTab("eco")}
            >
              <Trees size={14} /> Eco &amp; Stats
            </button>
          </div>

          {/* TAB 1: NEARBY */}
          {activeTab === "nearby" && (
            <>
              <div className="sidebar-heading">
                <div>
                  <p>Smart Demand Routing</p>
                  <h1>Charging Hubs</h1>
                </div>
              </div>

              {/* Search & Connectors */}
              <div className="driver-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stations, areas, malls..."
                />
                {query && <button onClick={() => setQuery("")}>×</button>}
              </div>

              {/* Filter Tabs */}
              <div className="filter-tabs">
                {["All", "CCS2", "Type2", "CHAdeMO"].map((conn) => (
                  <button
                    key={conn}
                    className={connectorFilter === conn ? "active" : ""}
                    onClick={() => setConnectorFilter(conn)}
                  >
                    {conn}
                  </button>
                ))}
              </div>

              <div className="results-row">
                <span>{filteredStations.length} live stations</span>
                <span style={{ color: "#10b981", fontSize: "11px" }}>● 0-min wait prioritized</span>
              </div>

              {/* Station Cards */}
              <div className="station-list">
                {filteredStations.map((st) => (
                  <button
                    key={st.id}
                    className={`station-card ${selectedId === st.id ? "selected" : ""} ${
                      recommendedId === st.id ? "border-blue-500 shadow-md" : ""
                    }`}
                    onClick={() => selectStation(st)}
                  >
                    <div className="station-card-head">
                      <span className={`status-dot ${st.status}`} />
                      <div>
                        <strong>{st.name}</strong>
                        <small>
                          {st.distanceKm ?? 1.8} km · {st.etaMinutes ?? 5} min drive
                        </small>
                      </div>
                      <span className="station-price">
                        ₹{st.pricePerKwh}
                        <small>/kWh</small>
                      </span>
                    </div>
                    <p>{st.address}</p>
                    <div className="station-card-meta">
                      <span className={`availability-pill ${st.status}`}>
                        {st.status === "available"
                          ? `${st.availableSlots} free`
                          : "High wait"}
                      </span>
                      <span>
                        <Zap size={12} /> {st.powerKw} kW
                      </span>
                      <span>
                        <PlugZap size={12} /> {st.connectorType}
                      </span>
                      {recommendedId === st.id && (
                        <span style={{ color: "#2563eb", fontWeight: 700, marginLeft: "auto" }}>
                          ★ Top Pick
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* TAB 2: JOURNEY PLANNER */}
          {activeTab === "journey" && (
            <div className="journey-box">
              <h2 style={{ fontSize: "18px", margin: 0, fontWeight: 700 }}>Long-Distance Route</h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Automatic charging stops inserted along national highways with minimum wait times.
              </p>

              <div className="journey-input-group">
                <label>Origin</label>
                <input value={journeyFrom} onChange={(e) => setJourneyFrom(e.target.value)} />
              </div>

              <div className="journey-input-group">
                <label>Destination</label>
                <input value={journeyTo} onChange={(e) => setJourneyTo(e.target.value)} />
              </div>

              <div className="journey-input-group">
                <label>Vehicle Battery Range ({journeyRangeKm} km)</label>
                <input
                  type="range"
                  min={150}
                  max={500}
                  step={20}
                  value={journeyRangeKm}
                  onChange={(e) => setJourneyRangeKm(Number(e.target.value))}
                />
              </div>

              <button className="journey-plan-btn" onClick={handlePlanJourney} disabled={journeyLoading}>
                <Navigation size={16} /> {journeyLoading ? "Calculating Route..." : "Plan Optimized Stops"}
              </button>

              {journeyResult && (
                <div className="journey-stop-card">
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <b style={{ color: "#065f46", fontSize: "13px" }}>Recommended Charging Stop</b>
                    <span style={{ fontSize: "11px", color: "#059669", fontWeight: 700 }}>
                      Stop 1 of {journeyResult.stops?.length || 1}
                    </span>
                  </div>
                  <strong>
                    {journeyResult.stops?.[0]?.station?.name ||
                      "Tata Power - Mumbai-Pune Expressway Khalapur Food Mall"}
                  </strong>
                  <p style={{ fontSize: "11px", color: "#475569", margin: "6px 0" }}>
                    150 kW DC Fast Charging · 25 min stop · ₹20.5/kWh
                  </p>
                  <div style={{ fontSize: "11px", color: "#047857", fontWeight: 600 }}>
                    ✓ Clean food court &amp; lounge available while charging
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FAVOURITES */}
          {activeTab === "favourites" && (
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px" }}>Saved Stations</h2>
              {favourites.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8" }}>
                  <Heart size={32} style={{ margin: "0 auto 10px", color: "#cbd5e1" }} />
                  <p>No saved stations yet. Click the heart icon on any station to pin it here.</p>
                </div>
              ) : (
                <div className="station-list">
                  {enrichedStations
                    .filter((st) => favourites.includes(st.id))
                    .map((st) => (
                      <button
                        key={st.id}
                        className={`station-card ${selectedId === st.id ? "selected" : ""}`}
                        onClick={() => selectStation(st)}
                      >
                        <div className="station-card-head">
                          <span className={`status-dot ${st.status}`} />
                          <div>
                            <strong>{st.name}</strong>
                            <small>{st.address}</small>
                          </div>
                          <span className="station-price">₹{st.pricePerKwh}/kWh</span>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BOOKINGS */}
          {activeTab === "bookings" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>My Reservations</h2>
                <button
                  onClick={() => setShowBooking(true)}
                  style={{
                    background: "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + Book Slot
                </button>
              </div>

              {bookings.map((bk) => (
                <div
                  key={bk.id}
                  style={{
                    background: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b style={{ fontSize: "13px" }}>{bk.stationName}</b>
                    <span
                      style={{
                        background: "#d1fae5",
                        color: "#059669",
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {bk.status}
                    </span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "6px 0" }}>
                    Slot: {bk.slotTime} · {bk.powerKw} kW ({bk.connector})
                  </p>
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <button
                      onClick={handleDirections}
                      style={{
                        border: "1px solid #bfdbfe",
                        background: "none",
                        color: "#2563eb",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Navigate
                    </button>
                    <button
                      onClick={() => setBookings((prev) => prev.filter((b) => b.id !== bk.id))}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#ef4444",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: ECO & STATS */}
          {activeTab === "eco" && (
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>Green Impact &amp; Savings</h2>
              <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
                Savings computed compared to standard petrol ICE vehicles in India.
              </p>

              <div className="eco-grid">
                <div className="eco-card">
                  <small>Money Saved</small>
                  <strong>₹18,500</strong>
                </div>
                <div className="eco-card">
                  <small>CO₂ Prevented</small>
                  <strong>384 kg</strong>
                </div>
                <div className="eco-card">
                  <small>Total Energy</small>
                  <strong style={{ color: "#2563eb" }}>420 kWh</strong>
                </div>
                <div className="eco-card">
                  <small>Trees Equivalent</small>
                  <strong style={{ color: "#16a34a" }}>19 Trees</strong>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Right Map Canvas */}
        <section className="driver-map-area">
          {/* Map Toolbar */}
          <div className="map-toolbar">
            <div className="map-legend">
              <span>
                <i className="legend-dot available" /> 0-5 min (Free)
              </span>
              <span>
                <i className="legend-dot busy" /> 5-15 min (Wait)
              </span>
              <span>
                <i className="legend-dot offline" /> &gt;15 min / Surge
              </span>
            </div>
            <button className="map-tools" onClick={() => setRecenterKey((k) => k + 1)}>
              <LocateFixed size={14} /> Recenter
            </button>
          </div>

          {/* Map Component */}
          {useGoogleMaps ? (
            <GoogleMapComponent
              stations={filteredStations.length ? filteredStations : enrichedStations}
              selectedStation={selected}
              onSelect={selectStation}
              userLocation={position}
              recenterKey={recenterKey}
              route={route}
              recommendedId={recommendedId}
            />
          ) : (
            <LeafletMapComponent
              stations={filteredStations.length ? filteredStations : enrichedStations}
              selectedStation={selected}
              onSelect={selectStation}
              userLocation={position}
              recenterKey={recenterKey}
              route={route}
            />
          )}

          {/* Floating Fuel Recommendation Button (Codemap 0, 7) */}
          <button className="floating-fuel-btn" onClick={handleFuelRecommend}>
            <Zap size={18} className="fuel-pulse-icon" fill="currentColor" />
            <span>One-Tap Fuel</span>
          </button>

          {/* Fuel Recommendation Result Banner */}
          {fuelReason && (
            <div className="fuel-banner">
              <div>
                <span className="fuel-banner-badge">★ Fuel Recommendation</span>
                <strong style={{ display: "block", fontSize: "14px", marginTop: "3px" }}>
                  {selected.name}
                </strong>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>{fuelReason}</p>
              </div>
              <button
                onClick={() => setFuelReason(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Route Banner */}
          {route && (
            <div className="route-banner">
              <span>
                {route.distanceKm} km · {route.durationMin} min drive
              </span>
              <button onClick={clearRoute}>
                <X size={14} /> Exit
              </button>
            </div>
          )}

          {/* Selected Station Drawer */}
          <div className="station-detail-panel visible">
            <div className="detail-topbar">
              <span>Station Details</span>
              <button onClick={() => toggleFavorite(selected.id)}>
                <Heart
                  size={16}
                  fill={favourites.includes(selected.id) ? "#ef4444" : "none"}
                  color={favourites.includes(selected.id) ? "#ef4444" : "#64748b"}
                />
              </button>
            </div>

            <div className="detail-body">
              <div className="detail-title-row">
                <div>
                  <div className="detail-status">
                    <span className={`status-dot ${selected.status}`} /> {selected.status}
                  </div>
                  <h2>{selected.name}</h2>
                  <p>{selected.address}</p>
                </div>
                <div className="detail-rating">
                  <Star size={15} fill="currentColor" /> {selected.rating}
                </div>
              </div>

              {/* Mini Stats */}
              <div className="detail-mini-grid">
                <div>
                  <small>Distance</small>
                  <strong>{selected.distanceKm ? `${selected.distanceKm} km` : "2.4 km"}</strong>
                </div>
                <div>
                  <small>Drive Time</small>
                  <strong>{selected.etaMinutes ? `${selected.etaMinutes} min` : "6 min"}</strong>
                </div>
                <div>
                  <small>Max Power</small>
                  <strong>{selected.powerKw} kW</strong>
                </div>
                <div>
                  <small>Price</small>
                  <strong>₹{selected.pricePerKwh}/kWh</strong>
                </div>
              </div>

              {/* Charger-Level View (free/busy/maintenance points) */}
              <div style={{ marginTop: "12px" }}>
                <b style={{ fontSize: "12px", color: "#334155" }}>Charger Points ({selected.availableSlots}/{selected.totalSlots} Free)</b>
                <div className="charger-grid">
                  {(selected.chargers && selected.chargers.length > 0
                    ? selected.chargers
                    : [
                        { id: "1", label: "DC-01", connectorType: "CCS2", powerKw: selected.powerKw, status: "FREE" },
                        { id: "2", label: "DC-02", connectorType: "CCS2", powerKw: 60, status: "BUSY" },
                        { id: "3", label: "AC-01", connectorType: "Type2", powerKw: 22, status: "FREE" },
                      ]
                  ).map((c: any) => (
                    <div key={c.id} className="charger-cell">
                      <div className="charger-cell-head">
                        <b>{c.label || "Charger"}</b>
                        <span className={`charger-status-pill ${c.status}`}>{c.status}</span>
                      </div>
                      <small>
                        {c.powerKw} kW · {c.connectorType}
                      </small>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="detail-amenities">
                {selected.amenities.map((amenity) => (
                  <span key={amenity}>✓ {amenity}</span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="detail-actions">
                <button
                  className="outline-action"
                  onClick={handleDirections}
                  disabled={routeLoading}
                >
                  <Navigation size={15} /> {routeLoading ? "Routing..." : "Directions"}
                </button>
                <button className="primary-action" onClick={() => setShowBooking(true)}>
                  <CalendarClock size={15} /> Book a Slot
                </button>
              </div>

              <div style={{ textAlign: "center", marginTop: "10px" }}>
                <button
                  onClick={() => setShowIssueModal(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "11px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Report a problem with this station
                </button>
              </div>
            </div>
          </div>
        </section>
      </section>

      {/* Booking Overlay Modal */}
      {showBooking && (
        <div
          className="booking-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowBooking(false)}
        >
          <div className="booking-modal">
            <div className="booking-header">
              <div>
                <span className="eyebrow">Instant Reservation</span>
                <h2>{selected.name}</h2>
              </div>
              <button onClick={() => setShowBooking(false)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "6px 0 16px" }}>
              {selected.powerKw} kW Fast Charger · {selected.connectorType} · ₹{selected.pricePerKwh}/kWh
            </p>

            <div className="booking-summary">
              <div>
                <CalendarClock size={16} /> <b>Slot Time:</b> Next 30 minutes
              </div>
              <div>
                <Zap size={16} /> <b>Reserved Point:</b> Bay #1 (CCS2 Fast Charger)
              </div>
            </div>

            <button className="confirm-button" onClick={handleConfirmBooking}>
              Confirm Slot Reservation
            </button>
          </div>
        </div>
      )}

      {/* Report Problem Modal */}
      {showIssueModal && (
        <div
          className="booking-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowIssueModal(false)}
        >
          <div className="booking-modal">
            <div className="booking-header">
              <div>
                <span className="eyebrow">Help the Network</span>
                <h2>Report an Issue</h2>
              </div>
              <button onClick={() => setShowIssueModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", margin: "16px 0" }}>
              <label style={{ fontSize: "12px", fontWeight: 600 }}>Issue Type</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              >
                <option value="damage">Hardware damaged or broken cable</option>
                <option value="offline">Station appears offline / screen black</option>
                <option value="blocked">ICE car blocking EV charging bay</option>
                <option value="payment">Payment gateway or RFID error</option>
                <option value="other">Other problem</option>
              </select>

              <label style={{ fontSize: "12px", fontWeight: 600 }}>Details</label>
              <textarea
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
                placeholder="Describe what went wrong..."
                rows={3}
                style={{ padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
              />
            </div>
            <button className="confirm-button" onClick={handleSubmitIssue}>
              Submit Report
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
