import { BentoGrid, BentoCard } from "@/components/ui/bento-grid";
import { Clock, Sparkle, NavigationArrow, CalendarCheck, ChartLineUp } from "@phosphor-icons/react/dist/ssr";

export function BentoSection() {
  return (
    <section id="features" className="border-b border-[#DADCE0] bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="rounded-full bg-[#E8F0FE] px-3.5 py-1 text-xs font-semibold text-[#1A73E8]">
            Built for Modern EV Driving
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#202124]">
            Everything you need on one unified platform
          </h2>
          <p className="text-base sm:text-lg text-[#5F6368]">
            Engineered from the ground up for Indian drivers, fleet owners, and charge point operators.
          </p>
        </div>

        <div className="mt-14">
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
                  <div className="rounded-xl border border-[#DADCE0] bg-white p-3 text-center shadow-xs">
                    <p className="text-xs text-[#5F6368]">Bay 1 &bull; 60kW</p>
                    <p className="font-mono text-xl font-bold text-[#1E8E3E]">Free</p>
                    <p className="text-[11px] text-[#1E8E3E]">0 min wait</p>
                  </div>
                  <div className="rounded-xl border border-[#DADCE0] bg-white p-3 text-center shadow-xs">
                    <p className="text-xs text-[#5F6368]">Bay 2 &bull; 120kW</p>
                    <p className="font-mono text-xl font-bold text-[#F9AB00]">Charging</p>
                    <p className="text-[11px] text-[#5F6368]">7 min left (84% SoC)</p>
                  </div>
                  <div className="rounded-xl border border-[#DADCE0] bg-white p-3 text-center shadow-xs">
                    <p className="text-xs text-[#5F6368]">Bay 3 &bull; 30kW</p>
                    <p className="font-mono text-xl font-bold text-[#D93025]">Queued</p>
                    <p className="text-[11px] text-[#D93025]">1 car waiting</p>
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
                <div className="flex h-full flex-col justify-center gap-2 p-4">
                  <div className="rounded-lg bg-white p-2.5 border border-[#1A73E8]/30 shadow-xs">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-[#202124]">#1 Oasis Khalapur</span>
                      <span className="text-[#1A73E8] font-bold">96/100</span>
                    </div>
                    <p className="text-[10px] text-[#5F6368]">Fastest total trip: 24 min + 0 min wait</p>
                  </div>
                  <div className="rounded-lg bg-[#F8F9FA] p-2 border border-[#DADCE0] text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[#5F6368]">#2 Lonavala Top</span>
                      <span className="text-[#5F6368] font-medium">82/100</span>
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
                  <div className="w-full space-y-2 rounded-xl bg-white p-3 border border-[#DADCE0]">
                    <div className="flex items-center justify-between text-xs font-medium text-[#202124]">
                      <span>Mumbai &rarr; Pune</span>
                      <span className="font-mono text-[#1A73E8]">148 km</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#E8EAED] overflow-hidden flex">
                      <div className="h-full bg-[#1A73E8] w-2/5" />
                      <div className="h-full bg-[#1E8E3E] w-1/5" title="Recommended Stop" />
                      <div className="h-full bg-[#E8EAED] w-2/5" />
                    </div>
                    <p className="text-[10px] text-[#5F6368]">1 optimal stop recommended at KM 64 (Khalapur)</p>
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
                  <div className="rounded-xl border border-[#DADCE0] bg-white p-3 text-center shadow-xs">
                    <p className="text-xs font-semibold text-[#202124]">Slot Reserved</p>
                    <p className="font-mono text-2xl font-bold text-[#1A73E8] my-1">14:45</p>
                    <p className="text-[11px] text-[#1E8E3E]">&check; Guaranteed bay hold</p>
                  </div>
                </div>
              }
              href="/register"
              cta="Create Free Account"
            />

            {/* Card 5: Operator Analytics */}
            <BentoCard
              name="Operator Revenue & Fleet Health"
              Icon={ChartLineUp}
              badge="OCPP Dashboard"
              description="Charge Point Operators monitor live revenue ticking every second, kWh dispensed, queue manager, and remote maintenance triggers in one dashboard."
              background={
                <div className="flex h-full flex-col justify-center gap-2 p-4">
                  <div className="rounded-lg bg-white p-2.5 border border-[#DADCE0]">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5F6368]">Live Revenue Today</span>
                      <span className="font-mono font-bold text-[#1E8E3E]">&#8377;14,280</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#5F6368] mt-1">
                      <span>Energy Dispensed</span>
                      <span className="font-mono font-medium">892.5 kWh</span>
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
