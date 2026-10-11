"use client";

import Link from "next/link";
import { ArrowRight, Lightning, MapPin, Clock, ShieldCheck, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden border-b border-[#DADCE0] bg-gradient-to-b from-[#FFFFFF] to-[#F8F9FA] py-16 sm:py-24">
      {/* Background radial highlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E8F0FE]/60 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DADCE0] bg-white px-3.5 py-1.5 text-xs font-medium text-[#202124] shadow-sm">
              <span className="flex size-2 rounded-full bg-[#1E8E3E]" />
              <span className="text-[#5F6368]">Live Telemetry Across Maharashtra & NCR</span>
              <span className="rounded bg-[#E8F0FE] px-1.5 py-0.5 font-semibold text-[#1A73E8]">
                OCPP 1.6J
              </span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#202124] leading-[1.12]">
              Find a charger <br />
              <span className="text-[#1A73E8]">without the wait</span>.
            </h1>

            <p className="max-w-2xl text-lg sm:text-xl text-[#5F6368] leading-relaxed">
              No more phantom availability or highway queue surprises. EVspark blends live hardware telemetry, queue depth, and machine learning to predict wait times before you start driving.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/register">
                <Button className="h-12 rounded-xl bg-[#1A73E8] px-6 text-base font-semibold text-white shadow-sm hover:bg-[#185ABC]">
                  Find chargers
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              </Link>

              <a href="#how-it-works">
                <Button variant="outline" className="h-12 rounded-xl border-[#DADCE0] bg-white px-6 text-base font-semibold text-[#202124] hover:bg-[#F8F9FA]">
                  See how it works
                </Button>
              </a>
            </div>

            {/* Proof points */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#DADCE0] text-left">
              <div>
                <p className="font-mono text-2xl font-bold text-[#202124]">0 min</p>
                <p className="text-xs text-[#5F6368]">Guaranteed hold slots</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#1E8E3E]">&plusmn;1.4 min</p>
                <p className="text-xs text-[#5F6368]">ML forecast precision</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-[#202124]">100%</p>
                <p className="text-xs text-[#5F6368]">Indian EV interoperability</p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Mini Map Card Preview */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto w-full max-w-md rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-xl ring-1 ring-black/5">
              {/* Header preview bar */}
              <div className="flex items-center justify-between border-b border-[#DADCE0] pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-[#E8F0FE] text-[#1A73E8]">
                    <MapPin size={16} weight="fill" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#202124]">Pune &ndash; Mumbai Expressway</p>
                    <p className="text-[11px] text-[#5F6368]">Live corridor status</p>
                  </div>
                </div>
                <span className="rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10px] font-semibold text-[#1E8E3E]">
                  Simulated data
                </span>
              </div>

              {/* Station previews */}
              <div className="mt-4 space-y-3">
                {/* Station 1: Free */}
                <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3.5 transition hover:border-[#1A73E8]/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[#202124]">Hinjewadi Fast Charging Hub</h4>
                      <p className="text-xs text-[#5F6368]">Phase 2, Pune &bull; 60 kW CCS-2</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-xs font-medium text-[#1E8E3E]">
                      <CheckCircle size={12} weight="fill" />
                      Free now
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-[#1E8E3E] font-medium">0 min wait</span>
                    <span className="text-[#5F6368]">&bull;</span>
                    <span className="text-[#5F6368]">2 of 4 bays free</span>
                    <span className="text-[#5F6368]">&bull;</span>
                    <span className="font-mono text-[#202124] font-medium">&#8377;16.50/kWh</span>
                  </div>
                </div>

                {/* Station 2: Recommended */}
                <div className="rounded-xl border-2 border-[#1A73E8] bg-white p-3.5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-md bg-[#1A73E8] text-white text-[10px] font-bold">
                        AI
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-[#202124]">Expressway Khalapur Oasis</h4>
                        <p className="text-xs text-[#5F6368]">KM 38, Khalapur &bull; 120 kW Dual Gun</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] px-2 py-0.5 text-xs font-medium text-[#B06000]">
                      <Clock size={12} weight="bold" />
                      3 min wait
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1A73E8]">Best Arrival Match (ETA 28 min)</span>
                    <span className="font-mono text-[#202124] font-medium">&#8377;17.00/kWh</span>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <div className="h-1.5 flex-1 rounded-full bg-[#1E8E3E]" title="Bay 1 Free" />
                    <div className="h-1.5 flex-1 rounded-full bg-[#F9AB00]" title="Bay 2 Busy (82% SoC)" />
                    <div className="h-1.5 flex-1 rounded-full bg-[#1E8E3E]" title="Bay 3 Free" />
                  </div>
                </div>

                {/* Station 3: Busy */}
                <div className="rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-3.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[#202124]">Bandra Kurla Complex (BKC)</h4>
                      <p className="text-xs text-[#5F6368]">G Block, Mumbai &bull; 50 kW CCS-2</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE8E6] px-2 py-0.5 text-xs font-medium text-[#D93025]">
                      14 min wait
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="text-[#5F6368]">Queue: 2 cars waiting</span>
                    <span className="text-[#5F6368]">&bull;</span>
                    <span className="font-mono text-[#202124] font-medium">&#8377;18.00/kWh</span>
                  </div>
                </div>
              </div>

              {/* Bottom live indicator */}
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#F8F9FA] px-3 py-2 text-[11px] text-[#5F6368]">
                <span className="flex items-center gap-1.5">
                  <Lightning size={14} weight="fill" className="text-[#1A73E8]" />
                  Telemetry updating every 5s
                </span>
                <Link href="/driver" className="font-medium text-[#1A73E8] hover:underline">
                  Open driver map &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
