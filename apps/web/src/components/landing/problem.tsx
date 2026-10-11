import { WarningCircle, TrafficCone, CompassTool } from "@phosphor-icons/react/dist/ssr";

export function ProblemSection() {
  return (
    <section className="border-b border-[#DADCE0] bg-[#FFFFFF] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="rounded-full bg-[#FCE8E6] px-3.5 py-1 text-xs font-semibold text-[#D93025]">
            The Indian EV Reality
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#202124]">
            Why EV charging today causes range anxiety
          </h2>
          <p className="text-base sm:text-lg text-[#5F6368]">
            Electric vehicles are booming across India, but public charging apps still leave drivers stranded with stale data and broken promises.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Problem 1 */}
          <div className="rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] p-7 transition hover:shadow-sm">
            <div className="grid size-12 place-items-center rounded-xl bg-[#FCE8E6] text-[#D93025]">
              <WarningCircle size={26} weight="fill" />
            </div>
            <h3 className="mt-5 font-semibold text-lg text-[#202124]">
              Phantom Availability
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-[#5F6368]">
              Your app shows a station is &ldquo;Available&rdquo;. You drive 12 km through city traffic only to discover the charger is broken, blocked by ICE vehicles, or lacking grid power.
            </p>
            <div className="mt-6 border-t border-[#DADCE0] pt-4">
              <span className="text-xs font-medium text-[#D93025]">
                &times; Over 35% of public chargers in India suffer unlogged downtime
              </span>
            </div>
          </div>

          {/* Problem 2 */}
          <div className="rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] p-7 transition hover:shadow-sm">
            <div className="grid size-12 place-items-center rounded-xl bg-[#FEF7E0] text-[#B06000]">
              <TrafficCone size={26} weight="fill" />
            </div>
            <h3 className="mt-5 font-semibold text-lg text-[#202124]">
              Highway Queue Surprises
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-[#5F6368]">
              Arriving at a highway toll plaza with 11% battery only to find 4 cars already in queue. Without wait time prediction, a 30-minute stop turns into a 2-hour delay.
            </p>
            <div className="mt-6 border-t border-[#DADCE0] pt-4">
              <span className="text-xs font-medium text-[#B06000]">
                &times; Average weekend peak queue on Mumbai-Pune/Delhi-Jaipur exceeds 45 mins
              </span>
            </div>
          </div>

          {/* Problem 3 */}
          <div className="rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] p-7 transition hover:shadow-sm">
            <div className="grid size-12 place-items-center rounded-xl bg-[#E8EAED] text-[#5F6368]">
              <CompassTool size={26} weight="fill" />
            </div>
            <h3 className="mt-5 font-semibold text-lg text-[#202124]">
              Fragmented Walled Gardens
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-[#5F6368]">
              Drivers must juggle 8 different apps, wallet balances, and proprietary protocols just to navigate a single intercity route.
            </p>
            <div className="mt-6 border-t border-[#DADCE0] pt-4">
              <span className="text-xs font-medium text-[#5F6368]">
                &times; Zero cross-network reservation or unified corridor routing
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
