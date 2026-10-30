"use client";

import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { Clock, Sparkle, NavigationArrow, CalendarCheck, ChartLineUp } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export function BentoSection() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full bg-[#1D6BFF]/8 px-4 py-1.5 text-xs font-semibold text-[#1D6BFF]">
            Built for Modern EV Driving
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B1220]">
            Everything you need on one unified platform
          </h2>
          <p className="text-base sm:text-lg text-[#4A5568] max-w-2xl mx-auto">
            Engineered from the ground up for Indian drivers, fleet owners, and charge point
            operators.
          </p>
        </motion.div>

        <div className="mt-16">
          <BentoGrid className="md:grid-cols-3">
            {/* Card 1: Live Wait Times (Col span 2) */}
            <BentoCard
              name="Sub-Minute Live Wait Times"
              className="md:col-span-2"
              Icon={Clock}
              badge="Hardware + AI"
              description="Know exact bay availability before taking highway exits. Real-time OCPP telemetry streams active state of charge, remaining minutes, and queue depth directly to your map."
              background={
                <div className="flex h-full items-center justify-around p-4">
                  <div className="rounded-xl border border-[#E6EAF2] bg-white p-3.5 text-center shadow-[0_4px_16px_rgba(16,40,90,0.04)]">
                    <p className="text-xs text-[#8A94A6]">Bay 1 &bull; 60kW</p>
                    <p className="font-mono text-xl font-bold text-[#16C784]">Free</p>
                    <p className="text-[11px] text-[#16C784]">0 min wait</p>
                  </div>
                  <div className="rounded-xl border border-[#E6EAF2] bg-white p-3.5 text-center shadow-[0_4px_16px_rgba(16,40,90,0.04)]">
                    <p className="text-xs text-[#8A94A6]">Bay 2 &bull; 120kW</p>
                    <p className="font-mono text-xl font-bold text-[#F5A524]">Charging</p>
                    <p className="text-[11px] text-[#4A5568]">7 min left (84% SoC)</p>
                  </div>
                  <div className="rounded-xl border border-[#E6EAF2] bg-white p-3.5 text-center shadow-[0_4px_16px_rgba(16,40,90,0.04)]">
                    <p className="text-xs text-[#8A94A6]">Bay 3 &bull; 30kW</p>
                    <p className="font-mono text-xl font-bold text-[#EF4444]">Queued</p>
                    <p className="text-[11px] text-[#EF4444]">1 car waiting</p>
                  </div>
                </div>
              }
              href="/driver"
              cta="Explore Driver Map"
            />

            {/* Card 2: Smart AI Recommendation */}
            <BentoCard
              name="Smart Charger Recommendation"
              Icon={Sparkle}
              badge="Top 5 Ranked"
              description="Our proprietary scoring algorithm weighs distance, road speed, current SoC, charger kW, and predicted queue to select your optimal station."
              background={
                <div className="flex h-full flex-col justify-center gap-2.5 p-4">
                  <div className="rounded-xl bg-white p-3 border border-[#1D6BFF]/20 shadow-[0_4px_16px_rgba(29,107,255,0.06)]">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#0B1220]">#1 Oasis Khalapur</span>
                      <span className="text-[#1D6BFF] font-bold">96/100</span>
                    </div>
                    <p className="text-[10px] text-[#8A94A6]">
                      Fastest total trip: 24 min + 0 min wait
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#F7F9FC] p-2.5 border border-[#E6EAF2] text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#8A94A6]">#2 Lonavala Top</span>
                      <span className="text-[#8A94A6] font-medium">82/100</span>
                    </div>
                  </div>
                </div>
              }
              href="/driver"
              cta="Try Recommendation"
            />

            {/* Card 3: Along-Route Corridor Planning */}
            <BentoCard
              name="Along-Route Corridor Navigation"
              Icon={NavigationArrow}
              badge="Google Directions"
              description="Planning a long highway journey? EVspark calculates stations directly along your route polyline without detour penalties."
              background={
                <div className="flex h-full items-center justify-center p-4">
                  <div className="w-full space-y-2.5 rounded-xl bg-white p-3.5 border border-[#E6EAF2] shadow-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-[#0B1220]">
                      <span>Mumbai &rarr; Pune</span>
                      <span className="font-mono text-[#1D6BFF]">148 km</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#E6EAF2] overflow-hidden flex">
                      <div className="h-full bg-gradient-to-r from-[#1D6BFF] to-[#4F8CFF] w-2/5" />
                      <div className="h-full bg-[#16C784] w-1/5" title="Recommended Stop" />
                      <div className="h-full bg-[#E6EAF2] w-2/5" />
                    </div>
                    <p className="text-[10px] text-[#8A94A6]">
                      1 optimal stop recommended at KM 64 (Khalapur)
                    </p>
                  </div>
                </div>
              }
              href="/driver"
              cta="Plan Highway Trip"
            />

            {/* Card 4: Guaranteed Slot Booking */}
            <BentoCard
              name="Guaranteed 15-Min Slots"
              Icon={CalendarCheck}
              badge="Zero Ghosting"
              description="Reserve your charger 15 minutes ahead. A dedicated hardware hold protects your spot with automatic ICS calendar export and QR check-in."
              background={
                <div className="flex h-full items-center justify-center p-4">
                  <div className="rounded-xl border border-[#E6EAF2] bg-white p-4 text-center shadow-sm">
                    <p className="text-xs font-semibold text-[#0B1220]">Slot Reserved</p>
                    <p className="font-mono text-2xl font-bold text-[#1D6BFF] my-1.5">14:45</p>
                    <p className="text-[11px] text-[#16C784] font-medium">
                      &#10003; Guaranteed bay hold
                    </p>
                  </div>
                </div>
              }
              href="/signup"
              cta="Create Free Account"
            />

            {/* Card 5: Operator Analytics */}
            <BentoCard
              name="Operator Revenue & Fleet Health"
              Icon={ChartLineUp}
              badge="OCPP Dashboard"
              description="Charge Point Operators monitor live revenue ticking every second, kWh dispensed, queue manager, and remote maintenance triggers in one dashboard."
              background={
                <div className="flex h-full flex-col justify-center gap-2.5 p-4">
                  <div className="rounded-xl bg-white p-3 border border-[#E6EAF2] shadow-sm">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#8A94A6]">Live Revenue Today</span>
                      <span className="font-mono font-bold text-[#16C784]">&#8377;14,280</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#8A94A6] mt-1.5">
                      <span>Energy Dispensed</span>
                      <span className="font-mono font-medium text-[#0B1220]">892.5 kWh</span>
                    </div>
                  </div>
                </div>
              }
              href="/station"
              cta="View Operator Portal"
            />
          </BentoGrid>
        </div>
      </div>
    </section>
  );
}
