"use client";

import React from "react";
import { CheckCircle, Database, Lightning, Cpu, Broadcast } from "@phosphor-icons/react";

const HEALTH_SERVICES = [
  {
    name: "Core REST API",
    status: "HEALTHY",
    uptime: "99.98%",
    latency: "18 ms",
    icon: Lightning,
  },
  {
    name: "Neon PostgreSQL with PostGIS",
    status: "HEALTHY",
    uptime: "100.0%",
    latency: "24 ms",
    icon: Database,
  },
  {
    name: "Upstash Redis Cache & PubSub",
    status: "HEALTHY",
    uptime: "99.95%",
    latency: "12 ms",
    icon: Broadcast,
  },
  {
    name: "Socket.IO Realtime Gateway",
    status: "HEALTHY",
    uptime: "99.99%",
    latency: "4 ms",
    icon: Broadcast,
  },
  {
    name: "ML Gradient Boosting Model Service",
    status: "HEALTHY",
    uptime: "99.90%",
    latency: "32 ms",
    icon: Cpu,
  },
  {
    name: "Twin Simulation Engine",
    status: "RUNNING",
    uptime: "100.0%",
    latency: "10x Clock",
    icon: Cpu,
  },
];

export default function AdminHealthPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-[#202124] tracking-tight">System Health</h1>
        <p className="text-xs text-[#5F6368] mt-0.5">
          Infrastructure health status, spatial query index performance, and service latencies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {HEALTH_SERVICES.map((srv) => {
          const Icon = srv.icon;
          return (
            <div
              key={srv.name}
              className="rounded-2xl bg-white border border-[#DADCE0] p-5 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-green-50 text-[#1E8E3E]">
                  <Icon size={22} weight="fill" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-[#202124]">{srv.name}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-[#5F6368] mt-0.5">
                    <span>Uptime: <b className="text-[#202124]">{srv.uptime}</b></span>
                    <span>·</span>
                    <span>Latency: <b className="text-[#202124]">{srv.latency}</b></span>
                  </div>
                </div>
              </div>

              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#1E8E3E] text-xs font-semibold">
                <CheckCircle size={14} weight="fill" />
                {srv.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
