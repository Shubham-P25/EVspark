"use client";

import { WarningCircle, TrafficCone, CompassTool } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";

const PROBLEMS = [
  {
    icon: WarningCircle,
    iconBg: "from-[#EF4444]/10 to-[#EF4444]/5",
    iconColor: "text-[#EF4444]",
    title: "Phantom Availability",
    description:
      'Your app shows a station is "Available". You drive 12 km through city traffic only to discover the charger is broken, blocked by ICE vehicles, or lacking grid power.',
    stat: "Over 35% of public chargers in India suffer unlogged downtime",
    statColor: "text-[#EF4444]",
  },
  {
    icon: TrafficCone,
    iconBg: "from-[#F5A524]/10 to-[#F5A524]/5",
    iconColor: "text-[#B06000]",
    title: "Highway Queue Surprises",
    description:
      "Arriving at a highway toll plaza with 11% battery only to find 4 cars already in queue. Without wait time prediction, a 30-minute stop turns into a 2-hour delay.",
    stat: "Average weekend peak queue on Mumbai-Pune/Delhi-Jaipur exceeds 45 mins",
    statColor: "text-[#B06000]",
  },
  {
    icon: CompassTool,
    iconBg: "from-[#8A94A6]/10 to-[#8A94A6]/5",
    iconColor: "text-[#4A5568]",
    title: "Fragmented Walled Gardens",
    description:
      "Drivers must juggle 8 different apps, wallet balances, and proprietary protocols just to navigate a single intercity route.",
    stat: "Zero cross-network reservation or unified corridor routing",
    statColor: "text-[#4A5568]",
  },
];

export function ProblemSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full bg-[#EF4444]/8 px-4 py-1.5 text-xs font-semibold text-[#EF4444]">
            The Indian EV Reality
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B1220]">
            Why EV charging today causes range anxiety
          </h2>
          <p className="text-base sm:text-lg text-[#4A5568] max-w-2xl mx-auto">
            Electric vehicles are booming across India, but public charging apps still leave
            drivers stranded with stale data and broken promises.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {PROBLEMS.map((problem, i) => {
            const Icon = problem.icon;
            return (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={
                  reducedMotion ? { duration: 0 } : { delay: i * 0.12, duration: 0.5, ease: "easeOut" }
                }
                whileHover={reducedMotion ? {} : { y: -4 }}
                className="rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-8 shadow-[0_4px_16px_rgba(16,40,90,0.03)] transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,40,90,0.06)] hover:border-[#E6EAF2]"
              >
                <div className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${problem.iconBg} ${problem.iconColor}`}>
                  <Icon size={26} weight="fill" />
                </div>
                <h3 className="mt-6 font-heading font-semibold text-lg text-[#0B1220]">
                  {problem.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#4A5568]">
                  {problem.description}
                </p>
                <div className="mt-6 border-t border-[#E6EAF2] pt-4">
                  <span className={`text-xs font-medium ${problem.statColor}`}>
                    &times; {problem.stat}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
