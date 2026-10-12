"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, PlugsConnected, ShieldCheck, Check, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const ROLES = [
  {
    id: "driver",
    title: "EV Driver",
    icon: Car,
    badge: "Personal & Fleet",
    heading: "Never get stranded on highway journeys",
    description:
      "Find chargers tailored to your EV battery model, view sub-minute queue wait times, calculate corridor stops along route, and book 15-minute guaranteed hold slots.",
    features: [
      "Natural Google Maps interface with traffic & satellite overlays",
      "AI Top 5 Ranked smart recommendations by ETA and SoC",
      "Route corridor planner with waypoint battery consumption",
      "1-click calendar download (ICS) and booking conflict guards",
    ],
    cta: "Launch Driver Map",
    link: "/driver",
  },
  {
    id: "operator",
    title: "Station Operator",
    icon: PlugsConnected,
    badge: "CPO Portal",
    heading: "Maximize charger uptime and daily revenue",
    description:
      "Connect your hardware via OCPP 1.6J. Track real-time charging money strips, monitor bay occupancy, manage virtual driver queues, and remotely reset faulted chargers.",
    features: [
      "Live revenue and energy counters ticking every second",
      "Battery tank cards showing state of charge climbing live",
      "Virtual queue manager promoting waiting cars automatically",
      "Peak-hour heatmap and dynamic tariff settings",
    ],
    cta: "Open Operator Console",
    link: "/station",
  },
  {
    id: "admin",
    title: "Platform Admin",
    icon: ShieldCheck,
    badge: "Network Operations",
    heading: "Oversight, digital twin, and system health",
    description:
      "Manage platform-wide station approvals, oversee user directories, tune digital twin simulation multipliers, and review machine learning forecast evaluation.",
    features: [
      "Approval queue with 1-click station verification",
      "Digital twin control room with speed & surge multipliers",
      "Fault injection simulator to test grid resiliency",
      "ML evaluation dashboard with live MAE and R² metrics",
    ],
    cta: "Admin Control Room",
    link: "/admin",
  },
];

export function RoleTabsSection() {
  const [activeTab, setActiveTab] = useState("driver");
  const current = ROLES.find((r) => r.id === activeTab)!;
  const reducedMotion = useReducedMotion();

  return (
    <section id="roles" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full bg-[#1D6BFF]/8 px-4 py-1.5 text-xs font-semibold text-[#1D6BFF]">
            Built for the Entire Ecosystem
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B1220]">
            Tailored interfaces for every EV stakeholder
          </h2>
          <p className="text-base sm:text-lg text-[#4A5568]">
            Whether you drive an electric car, operate commercial chargers, or manage network
            infrastructure.
          </p>
        </motion.div>

        {/* Tab Buttons with animated sliding highlight */}
        <div className="mt-14 flex justify-center">
          <div className="relative inline-flex rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-1.5 shadow-sm">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = r.id === activeTab;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveTab(r.id)}
                  className={`relative flex items-center gap-2 rounded-xl px-5 sm:px-7 py-3 text-sm font-semibold transition-colors duration-200 z-10 ${
                    active ? "text-[#1D6BFF]" : "text-[#4A5568] hover:text-[#0B1220]"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-[#E6EAF2]"
                      transition={{
                        type: "spring",
                        bounce: 0.15,
                        duration: reducedMotion ? 0 : 0.4,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon size={18} weight={active ? "bold" : "regular"} />
                    {r.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
            className="mt-12 rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-8 lg:p-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-medium text-[#1D6BFF] ring-1 ring-[#E6EAF2] shadow-sm">
                  <span>{current.badge}</span>
                </div>

                <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#0B1220] tracking-[-0.01em]">
                  {current.heading}
                </h3>

                <p className="text-base leading-relaxed text-[#4A5568]">
                  {current.description}
                </p>

                <div className="space-y-3.5 pt-2">
                  {current.features.map((feat, i) => (
                    <motion.div
                      key={feat}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: reducedMotion ? 0 : i * 0.08,
                        duration: 0.3,
                      }}
                      className="flex items-start gap-3 text-sm text-[#0B1220]"
                    >
                      <div className="grid size-5 shrink-0 place-items-center rounded-full bg-[#16C784]/10 text-[#16C784]">
                        <Check size={12} weight="bold" />
                      </div>
                      <span>{feat}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-4">
                  <Link href={current.link}>
                    <Button className="bg-gradient-to-r from-[#1D6BFF] to-[#4F8CFF] text-white hover:shadow-md hover:shadow-[#1D6BFF]/20 font-semibold transition-all duration-200">
                      {current.cta}
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Visual preview box */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_8px_30px_rgba(16,40,90,0.06)]">
                  <div className="flex items-center justify-between border-b border-[#E6EAF2] pb-3">
                    <span className="text-xs font-heading font-semibold text-[#8A94A6] uppercase tracking-wider">
                      {current.title} Workspace Preview
                    </span>
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16C784] opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-[#16C784]" />
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 font-mono text-xs text-[#8A94A6]">
                    <div className="rounded-xl bg-[#F7F9FC] p-3.5 border border-[#E6EAF2]">
                      <p className="text-[#0B1220] font-semibold">{current.heading}</p>
                      <p className="mt-1 text-[11px]">Route: {current.link}</p>
                    </div>
                    <div className="rounded-xl bg-[#F7F9FC] p-3.5 border border-[#E6EAF2] space-y-1.5">
                      <p className="text-[#1D6BFF] font-bold">
                        &bull; Verified light theme token system
                      </p>
                      <p className="text-[#16C784] font-bold">
                        &bull; 0 dark classes &bull; Google Maps standard
                      </p>
                      <p className="text-[#0B1220] font-medium">
                        &bull; Real-time WebSocket delta synchronization
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
