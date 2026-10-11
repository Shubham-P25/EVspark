"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ChargingStation,
  Lightning,
  Users,
  Car,
  ShieldCheck,
  CheckSquare,
  Cpu,
  ArrowRight,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function AdminOverviewPage() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["admin-overview"],
    queryFn: () => api.get("/api/admin/overview"),
  });

  const { data: pending } = useQuery<any[]>({
    queryKey: ["admin-pending-stations"],
    queryFn: () => api.get("/api/admin/stations/pending"),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">
          System Control Center
        </h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Realtime platform-wide network health, pending approvals, and simulation engine telemetry
        </p>
      </div>

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Total Stations</span>
            <ChargingStation size={18} className="text-[#1A73E8]" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-[#202124]">
            {isLoading ? "–" : data?.totalStations ?? 71}
          </p>
          <span className="text-[11px] text-[#1E8E3E] font-medium">Verified Maharashtra</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Chargers Online</span>
            <Lightning size={18} className="text-[#1E8E3E]" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-[#202124]">
            {isLoading ? "–" : data?.totalChargers ?? 261}
          </p>
          <span className="text-[11px] text-[#1E8E3E] font-medium">99.4% uptime</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Platform Users</span>
            <Users size={18} className="text-[#F9AB00]" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-[#202124]">
            {isLoading ? "–" : data?.totalUsers ?? 10}
          </p>
          <span className="text-[11px] text-[#5F6368]">Drivers & Operators</span>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-[#DADCE0] shadow-sm">
          <div className="flex items-center justify-between text-[#5F6368] mb-1">
            <span className="text-xs font-semibold uppercase">Sessions Completed</span>
            <Car size={18} className="text-[#1A73E8]" />
          </div>
          <p className="font-mono text-3xl font-extrabold text-[#202124]">
            {isLoading ? "–" : data?.totalSessions ?? 142}
          </p>
          <span className="text-[11px] text-[#1E8E3E] font-medium">OCPP mapped</span>
        </div>
      </div>

      {/* Action / Review Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Approvals quick card */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare size={20} className="text-[#F9AB00]" />
                <h2 className="text-sm font-bold text-[#202124]">Station Approvals Queue</h2>
              </div>
              <span className="rounded-full bg-[#FEF7E0] text-[#B06000] px-2.5 py-0.5 text-xs font-semibold">
                {pending?.length || 0} Pending
              </span>
            </div>
            <p className="text-xs text-[#5F6368] leading-relaxed">
              New charging stations submitted by station operators require compliance review and coordinates verification before public driver display.
            </p>
          </div>

          <div className="mt-5">
            <Link href="/admin/approvals">
              <Button className="w-full bg-[#1A73E8] hover:bg-blue-600 text-white text-xs font-semibold">
                Review Approvals <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Digital Twin Controls quick card */}
        <div className="rounded-2xl bg-white border border-[#DADCE0] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu size={20} className="text-[#1A73E8]" />
                <h2 className="text-sm font-bold text-[#202124]">Digital Twin Controls</h2>
              </div>
              <span className="rounded-full bg-[#E6F4EA] text-[#1E8E3E] px-2.5 py-0.5 text-xs font-semibold">
                Running
              </span>
            </div>
            <p className="text-xs text-[#5F6368] leading-relaxed">
              Adjust simulation speed multiplier, surge arrival distributions, emergency fault injection, and test station load patterns.
            </p>
          </div>

          <div className="mt-5">
            <Link href="/admin/twin">
              <Button variant="outline" className="w-full border-[#DADCE0] text-xs font-semibold text-[#202124]">
                Open Twin Controls <ArrowRight size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
