"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, PlugsConnected, ShieldCheck, Check, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

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

  return (
    <section id="roles" className="border-b border-[#DADCE0] bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="rounded-full bg-[#E8F0FE] px-3.5 py-1 text-xs font-semibold text-[#1A73E8]">
            Built for the Entire Ecosystem
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#202124]">
            Tailored interfaces for every EV stakeholder
          </h2>
          <p className="text-base sm:text-lg text-[#5F6368]">
            Whether you drive an electric car, operate commercial chargers, or manage network infrastructure.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-1.5 shadow-xs">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = r.id === activeTab;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveTab(r.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 sm:px-6 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-white text-[#1A73E8] shadow-xs ring-1 ring-[#DADCE0]"
                      : "text-[#5F6368] hover:text-[#202124]"
                  }`}
                >
                  <Icon size={18} weight={active ? "bold" : "regular"} />
                  {r.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="mt-10 rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] p-8 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#1A73E8] ring-1 ring-[#DADCE0]">
                <span>{current.badge}</span>
              </div>

              <h3 className="font-heading text-2xl sm:text-3xl font-bold text-[#202124]">
                {current.heading}
              </h3>

              <p className="text-base leading-relaxed text-[#5F6368]">
                {current.description}
              </p>

              <div className="space-y-3 pt-2">
                {current.features.map((feat) => (
                  <div key={feat} className="flex items-start gap-2.5 text-sm text-[#202124]">
                    <div className="grid size-5 shrink-0 place-items-center rounded-full bg-[#E6F4EA] text-[#1E8E3E]">
                      <Check size={12} weight="bold" />
                    </div>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Link href={current.link}>
                  <Button className="bg-[#1A73E8] text-white hover:bg-[#185ABC] font-semibold">
                    {current.cta}
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Visual preview box */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-[#DADCE0] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-[#DADCE0] pb-3">
                  <span className="text-xs font-semibold text-[#5F6368] uppercase tracking-wider">
                    {current.title} Workspace Preview
                  </span>
                  <span className="size-2 rounded-full bg-[#1E8E3E]" />
                </div>
                <div className="mt-4 space-y-3 font-mono text-xs text-[#5F6368]">
                  <div className="rounded-lg bg-[#F8F9FA] p-3 border border-[#DADCE0]">
                    <p className="text-[#202124] font-semibold">{current.heading}</p>
                    <p className="mt-1 text-[11px]">Route: {current.link}</p>
                  </div>
                  <div className="rounded-lg bg-[#F8F9FA] p-3 border border-[#DADCE0] space-y-1">
                    <p className="text-[#1A73E8] font-bold">&bull; Verified light theme token system</p>
                    <p className="text-[#1E8E3E] font-bold">&bull; 0 dark classes &bull; Google Maps standard</p>
                    <p className="text-[#202124] font-medium">&bull; Real-time WebSocket delta synchronization</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
