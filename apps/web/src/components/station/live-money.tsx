"use client";

import React from "react";
import { useNow } from "@/hooks/use-now";
import { inr, num } from "@/lib/format";
import { liveEnergyKwh, liveRevenue, type LiveCharger } from "@/lib/live";
import { CurrencyInr, Lightning, Car, Clock, ShieldCheck, Gauge } from "@phosphor-icons/react";

export function LiveMoney({
  chargers,
  completedRevenue,
  completedKwh,
  tariff,
  updatedAt,
  sessionsToday,
  avgWaitMin,
  uptimePct,
}: {
  chargers: LiveCharger[];
  completedRevenue: number;
  completedKwh: number;
  tariff: number;
  updatedAt: number;
  sessionsToday: number;
  avgWaitMin: number;
  uptimePct: number;
}) {
  const now = useNow(1000);
  const sessions = chargers
    .map((c) => c.activeSession)
    .filter((s): s is NonNullable<typeof s> => !!s);

  const revenue = liveRevenue(completedRevenue, sessions, tariff, updatedAt, now);
  const kwh =
    completedKwh + sessions.reduce((a, s) => a + liveEnergyKwh(s, updatedAt, now), 0);

  const busyCount = chargers.filter((c) => c.status === "BUSY").length;
  const totalCount = chargers.length || 1;
  const occupancyPct = Math.round((busyCount / totalCount) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* Revenue */}
      <div className="rounded-2xl bg-white p-4.5 ring-1 ring-[#DADCE0] shadow-sm">
        <div className="flex items-center justify-between text-[#5F6368] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Revenue today</span>
          <CurrencyInr size={18} className="text-[#1E8E3E]" />
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums text-[#202124]">
          {inr(revenue)}
        </p>
        <span className="text-[11px] text-[#1E8E3E] font-medium">Ticking live</span>
      </div>

      {/* Energy */}
      <div className="rounded-2xl bg-white p-4.5 ring-1 ring-[#DADCE0] shadow-sm">
        <div className="flex items-center justify-between text-[#5F6368] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Energy today</span>
          <Lightning size={18} className="text-[#1A73E8]" />
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums text-[#202124]">
          {num(kwh, 1)} <span className="text-xs font-sans text-[#5F6368]">kWh</span>
        </p>
        <span className="text-[11px] text-[#1A73E8] font-medium">Delivered</span>
      </div>

      {/* Sessions */}
      <div className="rounded-2xl bg-white p-4.5 ring-1 ring-[#DADCE0] shadow-sm">
        <div className="flex items-center justify-between text-[#5F6368] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Sessions today</span>
          <Car size={18} className="text-[#5F6368]" />
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums text-[#202124]">
          {sessionsToday}
        </p>
        <span className="text-[11px] text-[#5F6368]">Vehicles served</span>
      </div>

      {/* Occupancy Ring */}
      <div className="rounded-2xl bg-white p-4.5 ring-1 ring-[#DADCE0] shadow-sm">
        <div className="flex items-center justify-between text-[#5F6368] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Occupancy</span>
          <Gauge size={18} className="text-[#F9AB00]" />
        </div>
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-2xl font-bold tabular-nums text-[#202124]">
            {occupancyPct}%
          </p>
          <span className="text-xs text-[#5F6368]">({busyCount}/{totalCount} bays)</span>
        </div>
        <div className="w-full bg-[#E8EAED] h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-[#F9AB00] rounded-full transition-all duration-500"
            style={{ width: `${occupancyPct}%` }}
          />
        </div>
      </div>

      {/* Avg Wait */}
      <div className="rounded-2xl bg-white p-4.5 ring-1 ring-[#DADCE0] shadow-sm">
        <div className="flex items-center justify-between text-[#5F6368] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Avg wait</span>
          <Clock size={18} className="text-[#5F6368]" />
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums text-[#202124]">
          {avgWaitMin} <span className="text-xs font-sans text-[#5F6368]">min</span>
        </p>
        <span className="text-[11px] text-[#5F6368]">Virtual queue</span>
      </div>

      {/* Uptime */}
      <div className="rounded-2xl bg-white p-4.5 ring-1 ring-[#DADCE0] shadow-sm">
        <div className="flex items-center justify-between text-[#5F6368] mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Uptime</span>
          <ShieldCheck size={18} className="text-[#1E8E3E]" />
        </div>
        <p className="font-mono text-2xl font-bold tabular-nums text-[#202124]">
          {uptimePct}%
        </p>
        <span className="text-[11px] text-[#1E8E3E] font-medium">All hardware OK</span>
      </div>
    </div>
  );
}
