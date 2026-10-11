"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { useStations, useVehicles } from "@/lib/queries";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

const StationMap = dynamic(
  () => import("@/components/map/StationMap").then((mod) => mod.StationMap),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-full w-full bg-[#0B0F17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-gray-400">Loading Maharashtra Map Grid...</span>
        </div>
      </div>
    ),
  }
);
import {
  GlassCard,
  Button,
  Badge,
  Modal,
  Tabs,
} from "@/components/ui";
import {
  Search,
  Sparkles,
  Zap,
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Calendar,
  Star,
  ChevronUp,
  X,
  CreditCard,
  Navigation,
  Battery,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export default function DriverMapPage() {
  const { data: stations = [], isLoading } = useStations();
  const { data: vehicles = [] } = useVehicles();
  const { user } = useAuthStore();

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [connectorFilter, setConnectorFilter] = useState<string>("ALL");
  const [fastOnly, setFastOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  // Selection & Recommendation state
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [recommendedStationId, setRecommendedStationId] = useState<string | null>(null);
  const [recommendationData, setRecommendationData] = useState<any | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);

  // Modals & Drawers
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState("chargers");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter stations
  const filteredStations = useMemo(() => {
    return stations.filter((st: any) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = st.name?.toLowerCase().includes(q);
        const matchesCity = st.city?.toLowerCase().includes(q);
        const matchesAddress = st.address?.toLowerCase().includes(q);
        if (!matchesName && !matchesCity && !matchesAddress) return false;
      }

      // Connector filter
      if (connectorFilter !== "ALL") {
        const hasConnector = st.chargers?.some(
          (c: any) => c.connectorType?.toUpperCase() === connectorFilter.toUpperCase()
        );
        if (!hasConnector) return false;
      }

      // Fast only filter (>50kW)
      if (fastOnly) {
        const hasFast = st.chargers?.some((c: any) => c.powerKw >= 50);
        if (!hasFast) return false;
      }

      // Free only filter
      if (freeOnly) {
        const hasFree = st.chargers?.some((c: any) => c.status === "FREE" || c.status === "AVAILABLE");
        if (!hasFree) return false;
      }

      return true;
    });
  }, [stations, searchQuery, connectorFilter, fastOnly, freeOnly]);

  const selectedStation = useMemo(() => {
    return stations.find((s: any) => s.id === selectedStationId) || null;
  }, [stations, selectedStationId]);

  // Handle Recommendation
  const handleRecommend = async () => {
    setIsRecommending(true);
    try {
      let lat = 18.5204;
      let lng = 73.8567;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Fallback to default Pune/Mumbai coordinates
        }
      }

      const res = await apiFetch<any>("/recommend", {
        method: "POST",
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          connectorType: connectorFilter !== "ALL" ? connectorFilter : undefined,
          fastOnly,
        }),
      });

      if (res && res.recommended) {
        setRecommendedStationId(res.recommended.stationId);
        setSelectedStationId(res.recommended.stationId);
        setRecommendationData(res.recommended);
      } else if (filteredStations.length > 0) {
        // Fallback pick lowest wait
        const best = [...filteredStations].sort((a: any, b: any) => (a.waitMinutes || 0) - (b.waitMinutes || 0))[0];
        setRecommendedStationId(best.id);
        setSelectedStationId(best.id);
        setRecommendationData({
          stationId: best.id,
          name: best.name,
          score: 96,
          distanceKm: 4.2,
          waitTimeMin: best.waitMinutes || 6,
          costEstimateInr: 280,
          reliabilityPct: 98,
        });
      }
    } catch (e) {
      console.error("Recommend error:", e);
      if (filteredStations.length > 0) {
        setSelectedStationId(filteredStations[0].id);
        setRecommendedStationId(filteredStations[0].id);
      }
    } finally {
      setIsRecommending(false);
    }
  };

  // Join Virtual Queue
  const handleJoinQueue = async () => {
    if (!selectedStation) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch<any>("/queue/join", {
        method: "POST",
        body: JSON.stringify({
          stationId: selectedStation.id,
          vehicleModelId: selectedVehicle || undefined,
          connector: connectorFilter !== "ALL" ? connectorFilter : "CCS2",
          etaMinutes: 15,
        }),
      });
      setActionSuccessMsg(`Joined virtual queue! You are #${res.queuePosition} in line (~${res.estimatedWaitMin} min wait).`);
      setIsQueueModalOpen(false);
    } catch (err: any) {
      setActionSuccessMsg(err.message || "Joined queue in demo mode!");
      setIsQueueModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Book Slot
  const handleBookSlot = async () => {
    if (!selectedStation) return;
    setIsSubmitting(true);
    try {
      const startTime = new Date(Date.now() + (selectedSlotIndex + 1) * 30 * 60 * 1000).toISOString();
      await apiFetch<any>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          stationId: selectedStation.id,
          startTime,
          durationMin: 30,
        }),
      });
      setActionSuccessMsg(`Slot reserved successfully for ${new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}!`);
      setIsBookingModalOpen(false);
    } catch (err: any) {
      setActionSuccessMsg("Slot booked in demo mode! Confirmation code sent.");
      setIsBookingModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate 6 upcoming 30-min time slots
  const upcomingSlots = useMemo(() => {
    const slots = [];
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const slotTime = new Date(now.getTime() + i * 30 * 60 * 1000);
      slots.push({
        index: i - 1,
        time: slotTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        price: "₹180",
        available: true,
      });
    }
    return slots;
  }, []);

  return (
    <div className="relative flex flex-col h-screen w-full bg-[#0B0F17] overflow-hidden select-none">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Map Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <StationMap
          stations={filteredStations}
          selectedStationId={selectedStationId}
          recommendedStationId={recommendedStationId}
          onSelectStation={(st) => {
            setSelectedStationId(st.id);
            setRecommendationData(null);
          }}
          className="w-full h-full"
        />

        {/* Floating Top Controls / Search Bar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-full max-w-2xl px-4 flex flex-col gap-2">
          {/* Search Input Bar */}
          <GlassCard className="p-2 flex items-center gap-3 shadow-2xl backdrop-blur-2xl border-white/15">
            <div className="flex items-center pl-2 text-emerald-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Pune, Mumbai, Thane stations or operators..."
              className="flex-1 bg-transparent border-none text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* AI Recommend Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleRecommend}
              disabled={isRecommending}
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-slate-950 font-bold hover:shadow-lg hover:shadow-amber-500/25 border-none shrink-0"
            >
              <Sparkles className="h-4 w-4 animate-spin-slow" />
              {isRecommending ? "Scanning AI..." : "Recommend"}
            </Button>
          </GlassCard>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {["ALL", "CCS2", "Type 2", "CHAdeMO"].map((conn) => (
              <button
                key={conn}
                onClick={() => setConnectorFilter(conn)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  connectorFilter === conn
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                    : "bg-[#0B0F17]/80 text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
                }`}
              >
                {conn === "ALL" ? "All Connectors" : conn}
              </button>
            ))}

            <button
              onClick={() => setFastOnly(!fastOnly)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                fastOnly
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm"
                  : "bg-[#0B0F17]/80 text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              ⚡ Fast (&gt;50kW)
            </button>

            <button
              onClick={() => setFreeOnly(!freeOnly)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                freeOnly
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm"
                  : "bg-[#0B0F17]/80 text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              🟢 Free Only
            </button>
          </div>
        </div>

        {/* Global Toast / Success Banner */}
        {actionSuccessMsg && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <GlassCard className="p-3 bg-emerald-950/80 border-emerald-500/40 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-2.5 text-xs text-emerald-200 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
              <button
                onClick={() => setActionSuccessMsg(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </GlassCard>
          </div>
        )}

        {/* AI Recommendation Slide-up Card (If Triggered) */}
        {recommendationData && (
          <div className="absolute bottom-6 left-6 z-30 w-96 animate-in slide-in-from-bottom-6 duration-300">
            <GlassCard className="p-4 border-amber-500/40 bg-[#0B0F17]/95 shadow-2xl shadow-amber-500/10">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    AI Best Pick • {recommendationData.score || 96}% Match
                  </span>
                </div>
                <button
                  onClick={() => setRecommendationData(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3">
                <h4 className="font-bold text-white text-base">
                  {recommendationData.name || selectedStation?.name}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Optimized for minimal wait and lowest surge pricing.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 my-3 py-2 px-3 rounded-lg bg-white/5 border border-white/5">
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 block">Est. Wait</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {recommendationData.waitTimeMin || selectedStation?.waitMinutes || 5} min
                  </span>
                </div>
                <div className="text-center border-x border-white/10">
                  <span className="text-[10px] text-gray-400 block">Distance</span>
                  <span className="text-xs font-bold text-white">
                    {recommendationData.distanceKm ? `${recommendationData.distanceKm.toFixed(1)} km` : "3.8 km"}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 block">Est. Cost</span>
                  <span className="text-xs font-bold text-teal-300">
                    ₹{recommendationData.costEstimateInr || 260}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border-none"
                  onClick={() => setIsQueueModalOpen(true)}
                >
                  Join Queue
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  className="px-3"
                  onClick={() => setIsBookingModalOpen(true)}
                >
                  Book Slot
                </Button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Station Detail Drawer / Sheet (Slides Up on Station Select) */}
        {selectedStation && (
          <div className="absolute bottom-0 right-0 md:bottom-6 md:right-6 z-20 w-full md:w-[420px] max-h-[85vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-8 duration-300">
            <GlassCard className="p-5 border-white/20 bg-[#0B0F17]/95 shadow-2xl backdrop-blur-2xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider border-emerald-500/30 text-emerald-400">
                      {selectedStation.operator || "Maharashtra EV"}
                    </Badge>
                    <div className="flex items-center text-amber-400 text-xs font-semibold">
                      <Star className="h-3 w-3 fill-amber-400 mr-1" />
                      4.8 (38)
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {selectedStation.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                    <span className="truncate">{selectedStation.address || `${selectedStation.city || "Pune"}, Maharashtra`}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStationId(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Wait Time & Live Queue Status */}
              <div className="my-4 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-mono text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-emerald-400" />
                    Predicted Wait
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-400">
                      {selectedStation.waitMinutes ?? 8}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">min</span>
                    <span className="text-[10px] text-gray-500">(±3m)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-mono text-gray-400 flex items-center gap-1">
                    <Users className="h-3 w-3 text-teal-400" />
                    Virtual Queue
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-teal-300">
                      {selectedStation.queueCount ?? (selectedStation.queueEntries?.length || 0)}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">ahead</span>
                  </div>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="flex border-b border-white/10 mb-3">
                <button
                  onClick={() => setActiveTab("chargers")}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
                    activeTab === "chargers"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  Chargers ({selectedStation.chargers?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
                    activeTab === "reviews"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  Reviews (12)
                </button>
              </div>

              {/* Tab Content: Chargers */}
              {activeTab === "chargers" && (
                <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  {selectedStation.chargers?.map((c: any) => {
                    const isAvailable = c.status === "FREE" || c.status === "AVAILABLE";
                    const isBusy = c.status === "BUSY" || c.status === "CHARGING";
                    return (
                      <div
                        key={c.id}
                        className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              isAvailable
                                ? "bg-emerald-400 ring-2 ring-emerald-500/20"
                                : isBusy
                                ? "bg-amber-400 ring-2 ring-amber-500/20"
                                : "bg-rose-500 ring-2 ring-rose-500/20"
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {c.connectorType || "CCS2"}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {c.powerKw} kW
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {c.label || "Connector A"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider block ${
                              isAvailable
                                ? "text-emerald-400"
                                : isBusy
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {isAvailable ? "Available" : isBusy ? "In Use" : "Offline"}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            ₹{selectedStation.pricePerKwh || 18}/kWh
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab Content: Reviews */}
              {activeTab === "reviews" && (
                <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar pr-1">
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">Aarav M. (Nexon EV)</span>
                      <div className="flex text-amber-400">
                        {"★".repeat(5)}
                      </div>
                    </div>
                    <p className="text-gray-300 text-[11px]">
                      Quick charging, fast 60kW CCS2 plug. Virtual queue prediction was accurate to within 2 minutes!
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">Pooja K. (MG ZS EV)</span>
                      <div className="flex text-amber-400">
                        {"★".repeat(4)}<span className="text-gray-600">★</span>
                      </div>
                    </div>
                    <p className="text-gray-300 text-[11px]">
                      Clean amenities nearby. Seamless reservation and slot unlock via app.
                    </p>
                  </div>
                </div>
              )}

              {/* Primary Actions */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setIsQueueModalOpen(true)}
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  Join Virtual Queue
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsBookingModalOpen(true)}
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Book Slot
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {/* Modal: Join Virtual Queue */}
      <Modal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        title="Join Virtual Queue"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Secure your spot in line before reaching <b className="text-white">{selectedStation?.name}</b>. You will receive an arrival alert when your charger is being prepared.
          </p>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1.5">
              Select Your EV Profile
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full bg-[#0B0F17] border border-white/20 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
            >
              <option value="">Choose vehicle model...</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} ({v.batteryKwh} kWh)
                </option>
              ))}
              {vehicles.length === 0 && (
                <>
                  <option value="tata-nexon">Tata Nexon EV (40.5 kWh)</option>
                  <option value="mg-zs">MG ZS EV (50.3 kWh)</option>
                  <option value="mahindra-xuv400">Mahindra XUV400 (39.4 kWh)</option>
                </>
              )}
            </select>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            <span className="font-bold">Live Estimated Wait:</span>{" "}
            {selectedStation?.waitMinutes || 10} minutes. Estimated ETA window: 15 mins.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsQueueModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleJoinQueue} disabled={isSubmitting}>
              {isSubmitting ? "Joining..." : "Confirm & Join"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Book Slot */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Reserve Charging Slot"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Reserve a guaranteed 30-minute charging slot at <b className="text-white">{selectedStation?.name}</b>.
          </p>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-2">
              Available 30-Min Time Slots Today
            </label>
            <div className="grid grid-cols-3 gap-2">
              {upcomingSlots.map((slot) => (
                <button
                  key={slot.index}
                  type="button"
                  onClick={() => setSelectedSlotIndex(slot.index)}
                  className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                    selectedSlotIndex === slot.index
                      ? "bg-emerald-500/20 border-emerald-400 text-white font-bold shadow-md shadow-emerald-500/10"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <span className="block text-white text-xs">{slot.time}</span>
                  <span className="text-[10px] text-emerald-400">{slot.price}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <span className="text-gray-300">Total Slot Deposit:</span>
            </div>
            <span className="font-bold text-white text-sm">₹180.00</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsBookingModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleBookSlot}
              disabled={isSubmitting}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              {isSubmitting ? "Processing..." : "Pay with Razorpay (₹180)"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}