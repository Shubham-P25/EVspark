"use client";

import { useQuery } from "@tanstack/react-query";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Lightning, MapPin, Gauge, Pulse } from "@phosphor-icons/react";

interface PublicStats {
  stations: number;
  chargersOnline: number;
  sessionsToday: number;
  kWhToday: number;
  simulated: boolean;
}

export function NetworkMetricsSection() {
  const { data: stats } = useQuery<PublicStats>({
    queryKey: ["public-stats"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/public/stats");
        if (!res.ok) throw new Error("Failed to fetch");
        return await res.json();
      } catch {
        // Fallback realistic metrics matching seed dataset
        return {
          stations: 71,
          chargersOnline: 248,
          sessionsToday: 382,
          kWhToday: 5840.5,
          simulated: true,
        };
      }
    },
    refetchInterval: 15000,
  });

  const stationsCount = stats?.stations ?? 71;
  const chargersCount = stats?.chargersOnline ?? 248;
  const sessionsCount = stats?.sessionsToday ?? 382;
  const kwhCount = stats?.kWhToday ?? 5840.5;

  return (
    <section id="metrics" className="border-b border-[#DADCE0] bg-[#F8F9FA] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-10 border-b border-[#DADCE0]">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-[#202124]">
              Live Network Operations
            </h2>
            <p className="mt-1 text-sm text-[#5F6368]">
              Real-time charging volume streamed across connected OCPP stations.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-[#DADCE0] bg-white px-3 py-1 text-xs text-[#5F6368]">
            <span className="size-2 rounded-full bg-[#1E8E3E] animate-pulse" />
            <span className="font-medium text-[#202124]">Live telemetry</span>
            <span className="rounded bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#1E8E3E]">
              Simulated data
            </span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Metric 1 */}
          <div className="rounded-2xl border border-[#DADCE0] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between text-[#5F6368]">
              <span className="text-xs font-medium uppercase tracking-wider">Stations</span>
              <MapPin size={20} className="text-[#1A73E8]" />
            </div>
            <p className="mt-4 font-mono text-3xl sm:text-4xl font-bold text-[#202124]">
              <NumberTicker value={stationsCount} />
            </p>
            <p className="mt-1 text-xs text-[#5F6368]">Approved & active hubs</p>
          </div>

          {/* Metric 2 */}
          <div className="rounded-2xl border border-[#DADCE0] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between text-[#5F6368]">
              <span className="text-xs font-medium uppercase tracking-wider">Chargers Online</span>
              <Lightning size={20} className="text-[#1E8E3E]" weight="fill" />
            </div>
            <p className="mt-4 font-mono text-3xl sm:text-4xl font-bold text-[#1E8E3E]">
              <NumberTicker value={chargersCount} />
            </p>
            <p className="mt-1 text-xs text-[#5F6368]">Free or charging bays</p>
          </div>

          {/* Metric 3 */}
          <div className="rounded-2xl border border-[#DADCE0] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between text-[#5F6368]">
              <span className="text-xs font-medium uppercase tracking-wider">Sessions Today</span>
              <Pulse size={20} className="text-[#B06000]" />
            </div>
            <p className="mt-4 font-mono text-3xl sm:text-4xl font-bold text-[#202124]">
              <NumberTicker value={sessionsCount} />
            </p>
            <p className="mt-1 text-xs text-[#5F6368]">Completed & active</p>
          </div>

          {/* Metric 4 */}
          <div className="rounded-2xl border border-[#DADCE0] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between text-[#5F6368]">
              <span className="text-xs font-medium uppercase tracking-wider">Energy Delivered</span>
              <Gauge size={20} className="text-[#1A73E8]" />
            </div>
            <p className="mt-4 font-mono text-3xl sm:text-4xl font-bold text-[#202124]">
              <NumberTicker value={kwhCount} decimalPlaces={1} />
              <span className="ml-1 text-lg font-normal text-[#5F6368]">kWh</span>
            </p>
            <p className="mt-1 text-xs text-[#5F6368]">Clean electricity dispensed</p>
          </div>
        </div>
      </div>
    </section>
  );
}
