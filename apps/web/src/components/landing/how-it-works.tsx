import { MagnifyingGlass, Cpu, Lightning } from "@phosphor-icons/react/dist/ssr";

const STEPS = [
  {
    num: "01",
    icon: MagnifyingGlass,
    title: "Search & Predict",
    description:
      "Enter your destination or route. EVspark scans chargers within your driving radius and estimates your arrival SoC using your specific vehicle model profile.",
    highlight: "Route corridors with automatic buffer calculations",
  },
  {
    num: "02",
    icon: Cpu,
    title: "Blended Wait Calculation",
    description:
      "Our dual-engine model fuses real-time OCPP connector states (40%) with gradient-boosted ML arrival forecasting (60%) to calculate true wait times at arrival.",
    highlight: "Accounts for active queue depth and 200m geofence pings",
  },
  {
    num: "03",
    icon: Lightning,
    title: "Reserve & Power Up",
    description:
      "Lock in a 15-minute hold slot so nobody snipes your bay while you're driving. Pull up, plug in via OCPP 1.6J, and monitor live charging kW on your screen.",
    highlight: "Guaranteed bay reservation with 1-click ICS calendar sync",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-b border-[#DADCE0] bg-[#F8F9FA] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="rounded-full bg-[#E8F0FE] px-3.5 py-1 text-xs font-semibold text-[#1A73E8]">
            Predictive Experience
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#202124]">
            How EVspark gets you charging in 3 steps
          </h2>
          <p className="text-base sm:text-lg text-[#5F6368]">
            Built specifically to solve Indian highway congestion and eliminate charger queue guesswork.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative flex flex-col justify-between rounded-2xl border border-[#DADCE0] bg-white p-8 shadow-sm transition hover:border-[#1A73E8]/50"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl font-extrabold text-[#1A73E8]/25">
                      {step.num}
                    </span>
                    <div className="grid size-11 place-items-center rounded-xl bg-[#E8F0FE] text-[#1A73E8]">
                      <Icon size={24} weight="bold" />
                    </div>
                  </div>

                  <h3 className="mt-6 font-semibold text-xl text-[#202124]">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-[#5F6368]">
                    {step.description}
                  </p>
                </div>

                <div className="mt-6 rounded-lg bg-[#F8F9FA] px-3.5 py-2.5 text-xs font-medium text-[#1E8E3E]">
                  &check; {step.highlight}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
