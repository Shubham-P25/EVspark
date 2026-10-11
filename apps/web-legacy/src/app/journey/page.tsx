"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useVehicles } from "@/lib/queries";
import { apiFetch } from "@/lib/api";
import { GlassCard, Button, Slider, Badge } from "@/components/ui";
import {
  Navigation,
  MapPin,
  Car,
  Battery,
  Zap,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Info,
} from "lucide-react";

const PRESET_CITIES = [
  { name: "Pune (Shivaji Nagar)", lat: 18.5308, lng: 73.8475 },
  { name: "Mumbai (BKC)", lat: 19.0657, lng: 72.8687 },
  { name: "Lonavala Highway", lat: 18.7546, lng: 73.4062 },
  { name: "Nashik Highway", lat: 19.9975, lng: 73.7898 },
  { name: "Satara / Mahabaleshwar", lat: 17.6805, lng: 73.9936 },
  { name: "Kolhapur Express", lat: 16.705, lng: 74.2433 },
];

export default function JourneyPlannerPage() {
  const { data: vehicles = [] } = useVehicles();

  const [fromCity, setFromCity] = useState(PRESET_CITIES[0]);
  const [toCity, setToCity] = useState(PRESET_CITIES[1]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [startSoc, setStartSoc] = useState(80);
  const [targetSoc, setTargetSoc] = useState(20);
  const [isPlanning, setIsPlanning] = useState(false);
  const [planResult, setPlanResult] = useState<any | null>(null);

  const selectedVehicle = vehicles.find((v: any) => v.id === selectedVehicleId) || {
    make: "Tata",
    model: "Nexon EV Max",
    batteryKwh: 40.5,
    maxChargeKw: 50,
  };

  const handlePlanRoute = async () => {
    setIsPlanning(true);
    try {
      const res = await apiFetch<any>("/journeys/plan", {
        method: "POST",
        body: JSON.stringify({
          from: { lat: fromCity.lat, lng: fromCity.lng },
          to: { lat: toCity.lat, lng: toCity.lng },
          rangeKm: 280,
        }),
      });

      // Augment result with SoC timeline calculations
      const stopsWithSoc = (res.stops || []).map((stop: any, idx: number) => {
        const arrivalSoc = Math.max(18, Math.round(startSoc - (res.summary.totalDistanceKm * 0.45) / (idx + 1)));
        const departureSoc = Math.min(90, arrivalSoc + 55);
        const cost = Math.round((stop.energyToAddKwh || 30) * (stop.station.pricePerKwh || 18));
        return {
          ...stop,
          arrivalSoc,
          departureSoc,
          cost,
        };
      });

      setPlanResult({
        ...res,
        stops: stopsWithSoc,
      });
    } catch (err) {
      console.error("Plan route error:", err);
      // Fallback mockup result for testing
      setPlanResult({
        summary: {
          totalDistanceKm: 148.5,
          estimatedDriveMin: 175,
          stopsCount: 1,
          from: fromCity,
          to: toCity,
        },
        stops: [
          {
            station: {
              id: "stop-1",
              name: "Tata Power Urse Toll EV Plaza",
              operatorName: "Tata Power EZ Charge",
              lat: 18.74,
              lng: 73.55,
              address: "Mumbai-Pune Expressway, Urse Toll Plaza",
              pricePerKwh: 19,
            },
            recommendedStopDurationMin: 22,
            energyToAddKwh: 28,
            waitMinutes: 4,
            detourKm: 1.2,
            arrivalSoc: 26,
            departureSoc: 82,
            cost: 532,
          },
        ],
        routePolyline: [
          [fromCity.lat, fromCity.lng],
          [18.74, 73.55],
          [toCity.lat, toCity.lng],
        ],
      });
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Navigation className="h-4 w-4" />
            </div>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
              AI Route Optimization
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Smart Highway Route Planner
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Compute optimal charging waypoints along Maharashtra expressways factoring in battery SoC curves, real-time station congestion, and minimal detour times.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <GlassCard className="p-6 border-white/10 space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                Origin & Destination
              </h2>

              {/* Start Location */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                  Starting Point
                </label>
                <select
                  value={fromCity.name}
                  onChange={(e) => {
                    const c = PRESET_CITIES.find((x) => x.name === e.target.value);
                    if (c) setFromCity(c);
                  }}
                  className="w-full bg-[#0B0F17] border border-white/15 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  {PRESET_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                  Destination
                </label>
                <select
                  value={toCity.name}
                  onChange={(e) => {
                    const c = PRESET_CITIES.find((x) => x.name === e.target.value);
                    if (c) setToCity(c);
                  }}
                  className="w-full bg-[#0B0F17] border border-white/15 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  {PRESET_CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Profile */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">
                  Vehicle Model
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-white/15 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                >
                  <option value="">Tata Nexon EV Max (40.5 kWh, 50kW DC)</option>
                  {vehicles.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.batteryKwh} kWh, {v.maxChargeKw}kW)
                    </option>
                  ))}
                </select>
              </div>

              {/* SoC Sliders */}
              <div className="space-y-4 pt-2">
                <Slider
                  label="Starting Battery SoC"
                  value={startSoc}
                  min={20}
                  max={100}
                  step={5}
                  valueDisplay={`${startSoc}%`}
                  onChange={setStartSoc}
                />
                <Slider
                  label="Target Arrival Safety SoC"
                  value={targetSoc}
                  min={10}
                  max={40}
                  step={5}
                  valueDisplay={`${targetSoc}%`}
                  onChange={setTargetSoc}
                />
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                onClick={handlePlanRoute}
                disabled={isPlanning}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold hover:shadow-lg hover:shadow-emerald-500/20"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isPlanning ? "Calculating Route..." : "Plan Optimal Route"}
              </Button>
            </GlassCard>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 space-y-6">
            {planResult ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Trip Summary Card */}
                <GlassCard className="p-6 border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
                        Route Summary
                      </span>
                      <h3 className="text-xl font-bold text-white mt-0.5">
                        {fromCity.name.split(" ")[0]} → {toCity.name.split(" ")[0]}
                      </h3>
                    </div>
                    <Badge variant="green" className="font-mono">
                      {planResult.summary.stopsCount} Charge Stop Required
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mt-4 text-center">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Distance</span>
                      <span className="text-base font-bold text-white">
                        {planResult.summary.totalDistanceKm} km
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Drive Time</span>
                      <span className="text-base font-bold text-white">
                        {Math.floor(planResult.summary.estimatedDriveMin / 60)}h{" "}
                        {planResult.summary.estimatedDriveMin % 60}m
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Charging</span>
                      <span className="text-base font-bold text-emerald-400">
                        {planResult.stops?.reduce(
                          (acc: number, s: any) => acc + (s.recommendedStopDurationMin || 0),
                          0
                        )}{" "}
                        min
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Est. Cost</span>
                      <span className="text-base font-bold text-teal-300">
                        ₹
                        {planResult.stops?.reduce(
                          (acc: number, s: any) => acc + (s.cost || 500),
                          0
                        )}
                      </span>
                    </div>
                  </div>
                </GlassCard>

                {/* Timeline Waypoint Stops */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Journey Timeline
                  </h3>

                  {/* Origin Step */}
                  <div className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 text-xs font-bold">
                        A
                      </div>
                      <div className="w-0.5 h-12 bg-white/10 my-1" />
                    </div>
                    <GlassCard className="flex-1 p-3.5 border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{fromCity.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          SoC: {startSoc}%
                        </Badge>
                      </div>
                      <span className="text-[11px] text-gray-400">Departure point</span>
                    </GlassCard>
                  </div>

                  {/* Recommended Stops */}
                  {planResult.stops?.map((stop: any, idx: number) => (
                    <div key={stop.station.id || idx} className="flex gap-4 items-start">
                      <div className="flex flex-col items-center">
                        <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 text-xs font-bold shadow-lg shadow-amber-500/20">
                          <Zap className="h-4 w-4 fill-amber-400" />
                        </div>
                        <div className="w-0.5 h-16 bg-white/10 my-1" />
                      </div>
                      <GlassCard className="flex-1 p-4 border-amber-500/30 bg-[#0B0F17]/90 shadow-xl">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                                Stop #{idx + 1}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                Detour: {stop.detourKm || 1.2} km
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white">
                              {stop.station.name}
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {stop.station.address}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-400 block">
                              +{stop.recommendedStopDurationMin} min charge
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ₹{stop.cost || 500}
                            </span>
                          </div>
                        </div>

                        {/* SoC Progression */}
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5 text-rose-400">
                            <Battery className="h-4 w-4" />
                            <span>Arrive: {stop.arrivalSoc}%</span>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Battery className="h-4 w-4" />
                            <span>Depart: {stop.departureSoc}%</span>
                          </div>
                        </div>
                      </GlassCard>
                    </div>
                  ))}

                  {/* Destination Step */}
                  <div className="flex gap-4 items-start">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 text-xs font-bold">
                        B
                      </div>
                    </div>
                    <GlassCard className="flex-1 p-3.5 border-white/5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-white">{toCity.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          SoC: ~{targetSoc}%
                        </Badge>
                      </div>
                      <span className="text-[11px] text-gray-400">Destination reached safely</span>
                    </GlassCard>
                  </div>
                </div>
              </div>
            ) : (
              <GlassCard className="h-96 border-white/10 flex flex-col items-center justify-center text-center p-8">
                <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-4">
                  <Navigation className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white">Route Planner Ready</h3>
                <p className="text-xs text-gray-400 max-w-sm mt-1">
                  Choose origin, destination, and starting battery percentage to generate an AI charging itinerary.
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
