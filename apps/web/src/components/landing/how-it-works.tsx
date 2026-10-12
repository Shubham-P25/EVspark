"use client";

import { MagnifyingGlass, Cpu, Lightning } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";

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

/* Animated connecting line between steps */
function StepConnector() {
  return (
    <div className="hidden md:flex items-center justify-center absolute top-14 left-[calc(33.33%_-_1px)] right-[calc(33.33%_-_1px)] h-0.5 z-0">
      <motion.div
        className="w-full h-full bg-gradient-to-r from-[#1D6BFF]/30 via-[#4F8CFF]/50 to-[#1D6BFF]/30 rounded-full"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        style={{ transformOrigin: "left" }}
      />
    </div>
  );
}

export function HowItWorksSection() {
  const reducedMotion = useReducedMotion();

  const cardVariants: any = {
    hidden: { opacity: 0, y: 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: reducedMotion
        ? { duration: 0 }
        : { delay: i * 0.15, duration: 0.6, ease: "easeOut" },
    }),
  };

  return (
    <section id="how-it-works" className="bg-[#F7F9FC] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full bg-[#1D6BFF]/8 px-4 py-1.5 text-xs font-semibold text-[#1D6BFF]">
            Predictive Experience
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B1220]">
            How EVspark gets you charging in 3 steps
          </h2>
          <p className="text-base sm:text-lg text-[#4A5568] max-w-2xl mx-auto">
            Built specifically to solve Indian highway congestion and eliminate charger queue
            guesswork.
          </p>
        </motion.div>

        <div className="relative mt-20">
          <StepConnector />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  whileHover={reducedMotion ? {} : { y: -6 }}
                  className="relative flex flex-col justify-between rounded-2xl border border-[#E6EAF2] bg-white p-8 shadow-[0_8px_30px_rgba(16,40,90,0.06)] transition-shadow duration-300 hover:shadow-[0_12px_40px_rgba(16,40,90,0.10)] hover:border-[#1D6BFF]/20"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-4xl font-extrabold text-[#1D6BFF]/15 tracking-tight">
                        {step.num}
                      </span>
                      <motion.div
                        className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[#1D6BFF]/10 to-[#4F8CFF]/5 text-[#1D6BFF]"
                        whileHover={reducedMotion ? {} : { rotate: 8, scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <Icon size={24} weight="bold" />
                      </motion.div>
                    </div>

                    <h3 className="mt-6 font-heading font-semibold text-xl text-[#0B1220]">
                      {step.title}
                    </h3>

                    <p className="mt-3 text-sm leading-relaxed text-[#4A5568]">
                      {step.description}
                    </p>
                  </div>

                  <div className="mt-6 rounded-xl bg-[#16C784]/5 border border-[#16C784]/15 px-4 py-3 text-xs font-medium text-[#16C784]">
                    &#10003; {step.highlight}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
