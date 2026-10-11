"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOperatorLive } from "@/lib/queries/use-operator-live";
import { ChargerCard } from "@/components/station/charger-card";
import { LiveMoney } from "@/components/station/live-money";
import { ActivityFeed } from "@/components/station/activity-feed";
import { QueueManager } from "@/components/station/queue-manager";
import { inr } from "@/lib/format";
import { Star, MapPin, Clock } from "@phosphor-icons/react";
import type { LiveCharger } from "@/lib/live";

export default function StationOverviewPage() {
  const qc = useQueryClient();

  const { data: stations, isLoading: loadingStations } = useQuery<any[]>({
    queryKey: ["operator-stations"],
    queryFn: () => api.get("/api/operator/stations"),
  });

  const [stationId, setStationId] = useState<string>("");

  useEffect(() => {
    if (stations && stations.length > 0 && !stationId) {
      setStationId(stations[0].id);
    }
  }, [stations, stationId]);

  const { data, dataUpdatedAt, isLoading: loadingLive } = useOperatorLive(stationId || undefined);

  const toggleMaintenance = useMutation({
    mutationFn: (c: LiveCharger) =>
      api.patch(`/api/operator/chargers/${c.id}/status`, {
        status: c.status === "MAINTENANCE" ? "FREE" : "MAINTENANCE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator-live", stationId] });
    },
  });

  const callQueue = useMutation({
    mutationFn: (queueId: string) => api.post(`/api/queue/${queueId}/call`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator-live", stationId] });
    },
  });

  const removeQueue = useMutation({
    mutationFn: (queueId: string) => api.delete(`/api/queue/${queueId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operator-live", stationId] });
    },
  });

  if (loadingStations || (stationId && loadingLive && !data)) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-2xl bg-white border border-[#DADCE0] animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-white border border-[#DADCE0] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center border border-[#DADCE0]">
        <p className="text-sm font-semibold text-[#202124]">No station assigned to this account.</p>
        <p className="text-xs text-[#5F6368] mt-1">Contact your administrator or create a station in Settings.</p>
      </div>
    );
  }

  const { station, chargers, queue, kpis, recentEvents } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Station Header (first thing on the page per user spec) */}
      <div className="rounded-2xl bg-white p-6 ring-1 ring-[#DADCE0] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">
              {station.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                station.status === "APPROVED"
                  ? "bg-[#E6F4EA] text-[#1E8E3E]"
                  : "bg-[#FEF7E0] text-[#B06000]"
              }`}
            >
              {station.status === "APPROVED" ? "Live" : "Pending approval"}
            </span>
            <span className="rounded-full bg-[#F8F9FA] border border-[#DADCE0] px-2.5 py-0.5 text-[11px] font-medium text-[#5F6368]">
              Simulated data
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#5F6368] flex-wrap">
            {station.address && (
              <span className="flex items-center gap-1">
                <MapPin size={14} className="text-[#1A73E8]" />
                {station.address}{station.city ? `, ${station.city}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {station.hours ?? "24/7"}
            </span>
            <span className="flex items-center gap-1 font-semibold text-[#202124]">
              <Star size={14} weight="fill" className="text-[#F9AB00]" />
              {station.ratingAvg ? station.ratingAvg.toFixed(1) : "4.8"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#DADCE0] pt-3 md:pt-0 md:pl-6 shrink-0">
          <div>
            <p className="text-xs text-[#5F6368] font-semibold uppercase tracking-wider">Tariff</p>
            <p className="font-mono text-2xl font-bold text-[#1E8E3E]">
              {inr(station.pricePerKwh)}
              <span className="text-xs font-sans text-[#5F6368]">/kWh</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Charger Bays Row (animated cards) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#202124] uppercase tracking-wider">
            Charger Bays ({chargers.filter((c) => c.status === "FREE").length} Available)
          </h2>
          <span className="text-xs text-[#5F6368] font-medium">Auto-refreshing</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {chargers.map((charger) => (
            <ChargerCard
              key={charger.id}
              c={charger}
              tariff={station.pricePerKwh}
              updatedAt={dataUpdatedAt}
              onToggleMaintenance={(c) => toggleMaintenance.mutate(c)}
            />
          ))}
        </div>
      </div>

      {/* 3. Live Money & KPI Strip (keeps rising every second) */}
      <LiveMoney
        chargers={chargers}
        completedRevenue={kpis.completedRevenueToday}
        completedKwh={kpis.completedKwhToday}
        tariff={station.pricePerKwh}
        updatedAt={dataUpdatedAt}
        sessionsToday={kpis.sessionsToday}
        avgWaitMin={kpis.avgWaitMin}
        uptimePct={kpis.uptimePct}
      />

      {/* 4. Live Activity Feed & 5. Queue Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed events={recentEvents} />
        <QueueManager
          queue={queue}
          onCall={(id) => callQueue.mutate(id)}
          onRemove={(id) => removeQueue.mutate(id)}
        />
      </div>
    </div>
  );
}
