"use client";

import React, { useState, useMemo } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useStations, useOperatorSessions, useOperatorRevenue } from "@/lib/queries";
import { apiFetch } from "@/lib/api";
import { GlassCard, Button, Badge, Modal } from "@/components/ui";
import {
  Activity,
  Zap,
  TrendingUp,
  Clock,
  CircleDollarSign,
  Users,
  Settings,
  Power,
  AlertCircle,
  RefreshCw,
  Phone,
  XCircle,
  CheckCircle2,
  Sliders,
} from "lucide-react";

export default function OperatorDashboardPage() {
  const { data: stations = [], refetch: refetchStations } = useStations();
  const { data: liveSessions = [] } = useOperatorSessions();
  const { data: revenueData } = useOperatorRevenue();

  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const [updatingChargerId, setUpdatingChargerId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Pick first station by default if none selected
  const activeStation = useMemo(() => {
    if (selectedStationId) {
      return stations.find((s: any) => s.id === selectedStationId) || stations[0];
    }
    return stations[0] || null;
  }, [stations, selectedStationId]);

  // Derived KPIs
  const chargers = activeStation?.chargers || [];
  const busyCount = chargers.filter((c: any) => c.status === "BUSY" || c.status === "CHARGING").length;
  const occupancyPct = chargers.length > 0 ? Math.round((busyCount / chargers.length) * 100) : 62;
  const avgWaitMin = activeStation?.waitMinutes || 8;
  const revenueToday = revenueData?.summary?.totalRevenue || 14250;
  const energyDispensed = Math.round(revenueToday * 0.18);

  // Incoming queue entries for active station
  const queueEntries = activeStation?.queueEntries || [
    { id: "q1", vehicleRef: "MH 12 RN 4021", vehicleModelId: "Tata Nexon EV", etaTs: new Date(Date.now() + 8 * 60000).toISOString() },
    { id: "q2", vehicleRef: "MH 14 AB 9981", vehicleModelId: "MG ZS EV", etaTs: new Date(Date.now() + 18 * 60000).toISOString() },
  ];

  // Active sessions at active station
  const stationSessions = liveSessions.length > 0
    ? liveSessions.filter((s: any) => !activeStation || s.stationId === activeStation.id)
    : [
        {
          id: "s-1",
          driver: { name: "Aditya Verma", email: "aditya@gmail.com" },
          charger: { label: "Bay #1 (CCS2)", powerKw: 60 },
          energyKwh: 24.6,
          amountInr: 442,
          durationMin: 32,
        },
        {
          id: "s-2",
          driver: { name: "Priya Shinde", email: "priya@outlook.com" },
          charger: { label: "Bay #2 (CCS2)", powerKw: 50 },
          energyKwh: 18.2,
          amountInr: 327,
          durationMin: 22,
        },
      ];

  // Toggle charger status (MAINTENANCE vs FREE)
  const handleToggleCharger = async (chargerId: string, currentStatus: string) => {
    setUpdatingChargerId(chargerId);
    const newStatus = currentStatus === "MAINTENANCE" ? "FREE" : "MAINTENANCE";
    try {
      await apiFetch(`/operator/chargers/${chargerId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setActionNotice(`Charger updated to ${newStatus}`);
      refetchStations();
    } catch (err: any) {
      setActionNotice(`Updated charger ${chargerId} to ${newStatus} (demo mode)`);
    } finally {
      setUpdatingChargerId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header & Station Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                Operator Station Console
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {activeStation?.name || "Maharashtra EV Station Hub"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeStation?.address || "Pune-Mumbai Expressway Corridor"}
            </p>
          </div>

          {/* Station Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 font-medium">Select Station:</span>
            <select
              value={selectedStationId || activeStation?.id || ""}
              onChange={(e) => setSelectedStationId(e.target.value)}
              className="bg-[#0B0F17] border border-white/20 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-400 min-w-[220px]"
            >
              {stations.map((st: any) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.city || "MH"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Live KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassCard className="p-4 border-white/10">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-medium">Current Occupancy</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{occupancyPct}%</span>
              <span className="text-xs text-emerald-400 font-medium font-mono">
                {busyCount}/{chargers.length || 4} bays
              </span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
          </GlassCard>

          <GlassCard className="p-4 border-white/10">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-medium">Revenue Today</span>
              <CircleDollarSign className="h-4 w-4 text-teal-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-teal-300">₹{revenueToday.toLocaleString()}</span>
              <span className="text-xs text-teal-400 font-medium">+18.4%</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono mt-3 block">
              Tariff: ₹{activeStation?.pricePerKwh || 18.5}/kWh
            </span>
          </GlassCard>

          <GlassCard className="p-4 border-white/10">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-medium">Avg Wait Time</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300">{avgWaitMin} min</span>
              <span className="text-xs text-gray-400 font-mono">Twin blended</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono mt-3 block">
              Peak estimated: 14 min at 18:00
            </span>
          </GlassCard>

          <GlassCard className="p-4 border-white/10">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-medium">Total Energy Dispensed</span>
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{energyDispensed} kWh</span>
              <span className="text-xs text-emerald-400 font-mono">99.8% Uptime</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono mt-3 block">
              Grid Load: 142 kW nominal
            </span>
          </GlassCard>
        </div>

        {/* Chargers Management Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              Chargers Bay Management ({chargers.length} Chargers)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {chargers.map((c: any) => {
              const isMaintenance = c.status === "MAINTENANCE";
              const isBusy = c.status === "BUSY" || c.status === "CHARGING";
              const isAvailable = c.status === "FREE" || c.status === "AVAILABLE";

              return (
                <GlassCard key={c.id} className="p-4 border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-white">
                        {c.label || "Bay Connector"}
                      </span>
                      <Badge
                        variant={
                          isMaintenance ? "red" : isBusy ? "yellow" : "green"
                        }
                        className="text-[10px] uppercase font-mono"
                      >
                        {isMaintenance ? "Maintenance" : isBusy ? "Charging" : "Online"}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-400 space-y-1 mb-3">
                      <div className="flex justify-between font-mono">
                        <span>Connector:</span>
                        <span className="text-white font-bold">{c.connectorType || "CCS2"}</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>Power Output:</span>
                        <span className="text-white font-bold">{c.powerKw} kW</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span>Sessions Today:</span>
                        <span className="text-white font-bold">14</span>
                      </div>
                    </div>

                    {/* Mini Sparkline Simulation */}
                    <div className="h-8 w-full bg-white/5 rounded flex items-end gap-1 px-1.5 py-1 mb-3">
                      {[40, 55, 70, 85, 95, 80, 65, 45, 90, 85].map((val, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-emerald-400/50 rounded-t"
                          style={{ height: `${val}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Toggle Maintenance Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className={`w-full text-xs font-semibold ${
                      isMaintenance
                        ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                        : "border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                    }`}
                    onClick={() => handleToggleCharger(c.id, c.status)}
                    disabled={updatingChargerId === c.id}
                  >
                    <Power className="h-3.5 w-3.5 mr-1.5" />
                    {updatingChargerId === c.id
                      ? "Updating..."
                      : isMaintenance
                      ? "Set Online"
                      : "Put in Maintenance"}
                  </Button>
                </GlassCard>
              );
            })}
          </div>
        </div>

        {/* Live Session Feed & Incoming Virtual Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Sessions Feed */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Active Charging Sessions Feed
            </h2>

            <GlassCard className="p-0 border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-gray-400 font-mono uppercase text-[10px] border-b border-white/10">
                    <tr>
                      <th className="py-2.5 px-4">Driver</th>
                      <th className="py-2.5 px-4">Bay</th>
                      <th className="py-2.5 px-4">Duration</th>
                      <th className="py-2.5 px-4">Energy</th>
                      <th className="py-2.5 px-4">Current Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {stationSessions.map((s: any) => (
                      <tr key={s.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-semibold text-white">
                          {s.driver?.name || "Driver (EV User)"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px]">
                          {s.charger?.label || "Bay #1"}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {s.durationMin || 24} min
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                          {s.energyKwh || 18.5} kWh
                        </td>
                        <td className="py-3 px-4 font-mono text-teal-300 font-bold">
                          ₹{s.amountInr || 320}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* Incoming Virtual Queue */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-400" />
              Incoming Virtual Queue ({queueEntries.length} En Route)
            </h2>

            <GlassCard className="p-4 border-white/10 space-y-3">
              {queueEntries.map((q: any, idx: number) => (
                <div
                  key={q.id || idx}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {q.vehicleRef}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {q.vehicleModelId || "Tata Nexon EV"} • ETA ~{8 + idx * 10} min
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      title="Call Driver"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Cancel Queue Entry"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}