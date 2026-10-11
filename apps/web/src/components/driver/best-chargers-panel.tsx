"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { X, GasPump, Star, Lightning, ArrowRight } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { inr, mins, km } from "@/lib/format";

interface RecommendedStation {
  stationId: string;
  stationName: string;
  lat: number;
  lng: number;
  distanceKm: number;
  driveTimeMinutes: number;
  waitTimeMinutes: number;
  predictedWaitMinutes: number;
  totalTimeMinutes: number;
  pricePerKwh: number;
  availableChargers: number;
  totalChargers: number;
  finalScore: number;
  reason?: string;
}

interface BestChargersPanelProps {
  onClose: () => void;
  onSelectStation: (stationId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  userConnector?: string;
  batteryPct?: number;
}

export function BestChargersPanel({
  onClose,
  onSelectStation,
  userLocation,
  userConnector,
  batteryPct = 50,
}: BestChargersPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["recommend", userLocation?.lat, userLocation?.lng, userConnector, batteryPct],
    queryFn: async () => {
      const res = await api<any>("/api/recommend", {
        method: "POST",
        json: {
          lat: userLocation?.lat ?? 18.5204,
          lng: userLocation?.lng ?? 73.8567,
          batteryPct,
          connector: userConnector && userConnector !== "ALL" ? userConnector : undefined,
          connectorType: userConnector && userConnector !== "ALL" ? userConnector : undefined,
          radiusKm: 25,
        },
      });

      if (Array.isArray(res)) return res;
      return res?.recommendations || res?.rankedCandidates || [];
    },
    staleTime: 15_000,
  });

  const stationList: any[] = Array.isArray(data)
    ? data
    : (data as any)?.recommendations || (data as any)?.rankedCandidates || [];

  return (
    <div className="absolute top-4 left-4 z-20 w-[400px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex flex-col bg-white rounded-2xl shadow-xl border border-[#DADCE0] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#DADCE0] bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GasPump size={22} weight="fill" className="text-[#1E8E3E]" />
          <div>
            <h2 className="text-base font-bold text-[#202124]">Best Chargers Now</h2>
            <p className="text-[11px] text-[#5F6368]">
              Ranked by total time = drive + wait + charge
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-[#5F6368] hover:bg-[#F1F3F4] transition cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#5F6368] space-y-2">
            <div className="size-6 rounded-full border-2 border-[#1E8E3E] border-t-transparent animate-spin mx-auto" />
            <p>Evaluating nearest stations and real-time queues…</p>
          </div>
        ) : stationList.length === 0 ? (
          <p className="text-center text-xs text-[#5F6368] py-8">
            No recommended charging stations found in your radius.
          </p>
        ) : (
          stationList.slice(0, 5).map((rawSt: any, idx: number) => {
            const isTop = idx === 0;
            const stId = rawSt.stationId || rawSt.station?.id || rawSt.id;
            const stName = rawSt.stationName || rawSt.station?.name || rawSt.name || "Charging Station";
            const price = rawSt.pricePerKwh ?? rawSt.station?.pricePerKwh ?? 16.5;
            const driveMin = rawSt.driveTimeMinutes ?? rawSt.driveTimeMin ?? rawSt.driveMinutes ?? 5;
            const waitMin = rawSt.waitTimeMinutes ?? rawSt.predictedWaitMinutes ?? rawSt.waitTimeMin ?? rawSt.predictedWaitAtEta ?? 0;
            const totalMin = rawSt.totalTimeMinutes ?? (driveMin + waitMin);
            const avail = rawSt.availableChargers ?? rawSt.station?.availableChargers ?? 1;
            const total = rawSt.totalChargers ?? rawSt.station?.totalChargers ?? 2;
            const reason = rawSt.reason || (isTop ? "Best arrival match with zero waiting" : undefined);

            return (
              <div
                key={stId || idx}
                onClick={() => stId && onSelectStation(stId)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                  isTop
                    ? "border-[#1E8E3E] bg-emerald-50/40 shadow-sm"
                    : "border-[#DADCE0] hover:border-[#1A73E8] bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isTop ? "bg-[#1E8E3E] text-white" : "bg-slate-100 text-[#5F6368]"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <h3 className="font-bold text-sm text-[#202124] hover:text-[#1A73E8]">
                      {stName}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#202124]">
                    {inr(price)}/kWh
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#5F6368] flex-wrap">
                  <span>Drive: <b>{mins(driveMin)}</b></span>
                  <span>•</span>
                  <span className="text-[#1E8E3E] font-semibold">
                    Wait: {waitMin === 0 ? "0m (Free)" : mins(waitMin)}
                  </span>
                  <span>•</span>
                  <span>{avail} of {total} free</span>
                </div>

                {reason && (
                  <p className="text-[11px] text-[#5F6368] bg-white/80 p-2 rounded-lg border border-[#DADCE0]/60">
                    {reason}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 text-[11px] font-semibold text-[#1A73E8]">
                  <span>Total time ~{mins(totalMin)}</span>
                  <div className="flex items-center gap-1">
                    <span>View station</span>
                    <ArrowRight size={12} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
