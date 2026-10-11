"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

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

  return (
    <section id="faq" className="border-b border-[#DADCE0] bg-white py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4">
          <span className="rounded-full bg-[#E8F0FE] px-3.5 py-1 text-xs font-semibold text-[#1A73E8]">
            Got Questions?
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#202124]">
            Frequently Asked Questions
          </h2>
          <p className="text-base sm:text-lg text-[#5F6368]">
            Everything you need to know about EVspark predictive charging.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={faq.q}
                className="overflow-hidden rounded-2xl border border-[#DADCE0] bg-[#F8F9FA] transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between p-5 sm:p-6 text-left font-semibold text-[#202124] hover:text-[#1A73E8]"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  <CaretDown
                    size={20}
                    className={`shrink-0 text-[#5F6368] transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-[#1A73E8]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#DADCE0] bg-white p-5 sm:p-6 text-sm leading-relaxed text-[#5F6368]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
