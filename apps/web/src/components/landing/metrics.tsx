"use client";

import { useQuery } from "@tanstack/react-query";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Lightning, MapPin, Gauge, Pulse } from "@phosphor-icons/react";
import { motion } from "framer-motion";

interface PublicStats {
  stations: number;
  chargersOnline: number;
  sessionsToday: number;
  kWhToday: number;
  simulated: boolean;
}

const METRICS = [
  {
    key: "stations",
    label: "Stations",
    sub: "Approved & active hubs",
    icon: MapPin,
    iconColor: "text-[#1D6BFF]",
    valueColor: "text-[#0B1220]",
    gradient: "from-[#1D6BFF]/8 to-[#4F8CFF]/4",
  },
  {
    key: "chargersOnline",
    label: "Chargers Online",
    sub: "Free or charging bays",
    icon: Lightning,
    iconColor: "text-[#16C784]",
    valueColor: "text-[#16C784]",
    gradient: "from-[#16C784]/8 to-[#16C784]/4",
  },
  {
    key: "sessionsToday",
    label: "Sessions Today",
    sub: "Completed & active",
    icon: Pulse,
    iconColor: "text-[#F5A524]",
    valueColor: "text-[#0B1220]",
    gradient: "from-[#F5A524]/8 to-[#F5A524]/4",
  },
  {
    key: "kWhToday",
    label: "Energy Delivered",
    sub: "Clean electricity dispensed",
    icon: Gauge,
    iconColor: "text-[#1D6BFF]",
    valueColor: "text-[#0B1220]",
    gradient: "from-[#1D6BFF]/8 to-[#4F8CFF]/4",
    suffix: "kWh",
    decimal: 1,
  },
];

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

  const values: Record<string, number> = {
    stations: stats?.stations ?? 71,
    chargersOnline: stats?.chargersOnline ?? 248,
    sessionsToday: stats?.sessionsToday ?? 382,
    kWhToday: stats?.kWhToday ?? 5840.5,
  };

  return (
    <section id="metrics" className="bg-[#F7F9FC] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-10 border-b border-[#E6EAF2]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-[-0.02em] text-[#0B1220]">
              Live Network Operations
            </h2>
            <p className="mt-1.5 text-sm text-[#4A5568]">
              Real-time charging volume streamed across connected OCPP stations.
            </p>
          </div>
          <div className="inline-flex items-center gap-2.5 self-start rounded-full border border-[#E6EAF2] bg-white px-4 py-1.5 text-xs text-[#4A5568] shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16C784] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#16C784]" />
            </span>
            <span className="font-medium text-[#0B1220]">Live telemetry</span>
            <span className="rounded-md bg-[#16C784]/10 px-2 py-0.5 text-[10px] font-semibold text-[#16C784]">
              Simulated data
            </span>
          </div>
        </motion.div>

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {METRICS.map((metric, i) => {
            const Icon = metric.icon;
            const val = values[metric.key];
            return (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_8px_30px_rgba(16,40,90,0.06)] transition-shadow duration-300 hover:shadow-[0_12px_40px_rgba(16,40,90,0.10)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-[#8A94A6]">
                    {metric.label}
                  </span>
                  <div
                    className={`grid size-9 place-items-center rounded-xl bg-gradient-to-br ${metric.gradient}`}
                  >
                    <Icon size={18} className={metric.iconColor} weight="fill" />
                  </div>
                </div>
                <p className={`mt-5 font-mono text-3xl sm:text-4xl font-bold ${metric.valueColor}`}>
                  <NumberTicker
                    value={val}
                    decimalPlaces={metric.decimal ?? 0}
                  />
                  {metric.suffix && (
                    <span className="ml-1.5 text-lg font-normal text-[#8A94A6]">
                      {metric.suffix}
                    </span>
                  )}
                </p>
                <p className="mt-1.5 text-xs text-[#8A94A6]">{metric.sub}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
