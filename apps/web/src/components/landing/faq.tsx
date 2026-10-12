"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const FAQS = [
  {
    q: "How does EVspark predict queue wait times?",
    a: "We fuse live OCPP 1.6J hardware connector states (40%) with our trained machine learning arrival model (60%). Our algorithm checks the current charging speed and SoC curve of connected vehicles, active queue entries, and historical time-of-day traffic patterns to predict your actual wait at arrival time.",
  },
  {
    q: "Which EV models and connector types are supported?",
    a: "All Indian electric vehicles are supported! When onboarding, drivers select their model (Tata Nexon EV, Tiago EV, Curvv, Mahindra XUV400, MG ZS EV, Hyundai Ioniq 5, BYD Atto 3, Ather, Ola, etc.). Filters support CCS-2 DC, Type 2 AC, CHAdeMO, and GB/T standards.",
  },
  {
    q: "How does 15-minute slot booking work?",
    a: "When you reserve a station, EVspark holds that charging bay for 15 minutes. A calendar invite (.ics) is instantly generated with route details. If you arrive within the hold window, your spot is guaranteed. If unforeseen traffic causes a delay, you can extend or cancel with a single tap.",
  },
  {
    q: "How do station operators connect their chargers?",
    a: "Operators configure their OCPP 1.6J endpoint in their charger firmware (Delta, ABB, Schneider, Statiq, etc.) to point to EVspark WebSocket gateway. Our operator dashboard instantly unlocks live revenue tickers, remote bay control, and virtual queue management.",
  },
  {
    q: "Is EVspark free for drivers to use?",
    a: "Yes! Searching stations, checking live wait times, planning route corridors, and getting AI recommendations is 100% free for all EV drivers. Charging fees are paid directly per kWh dispensed based on the transparent station tariff.",
  },
  {
    q: "What happens if a charger goes offline during my journey?",
    a: "EVspark streams real-time WebSocket delta events. If a station reports a fault or loses telemetry, the driver map immediately recalculates your route corridor and recommends the next best working station with sufficient battery buffer.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reducedMotion = useReducedMotion();

  return (
    <section id="faq" className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full bg-[#1D6BFF]/8 px-4 py-1.5 text-xs font-semibold text-[#1D6BFF]">
            Got Questions?
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B1220]">
            Frequently Asked Questions
          </h2>
          <p className="text-base sm:text-lg text-[#4A5568]">
            Everything you need to know about EVspark predictive charging.
          </p>
        </motion.div>

        <div className="mt-12 space-y-4">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { delay: i * 0.05, duration: 0.4 }
                }
                className="overflow-hidden rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(16,40,90,0.04)]"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between p-5 sm:p-6 text-left font-semibold text-[#0B1220] hover:text-[#1D6BFF] transition-colors duration-200"
                >
                  <span className="text-base sm:text-lg pr-4">{faq.q}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <CaretDown
                      size={20}
                      className={`transition-colors duration-200 ${
                        isOpen ? "text-[#1D6BFF]" : "text-[#8A94A6]"
                      }`}
                    />
                  </motion.span>
                </button>
                <AnimatePresence mode="wait">
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#E6EAF2] bg-white p-5 sm:p-6 text-sm leading-relaxed text-[#4A5568]">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
