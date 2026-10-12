"use client";

import { CurrencyInr, ShieldCheck, CheckCircle } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export function PolicyPricingSection() {
  return (
    <section id="policies" className="bg-[#F7F9FC] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full bg-[#1D6BFF]/8 px-4 py-1.5 text-xs font-semibold text-[#1D6BFF]">
            Transparency & Governance
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B1220]">
            Fair Indian pricing & policy alignment
          </h2>
          <p className="text-base sm:text-lg text-[#4A5568] max-w-2xl mx-auto">
            Clear per-kWh billing compliant with Ministry of Power (MoP) guidelines and the
            national PM e-DRIVE scheme.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pricing Model */}
          <motion.div
            className="rounded-2xl border border-[#E6EAF2] bg-white p-8 shadow-[0_8px_30px_rgba(16,40,90,0.06)]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -3 }}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#16C784]/12 to-[#16C784]/5 text-[#16C784]">
                <CurrencyInr size={24} weight="bold" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-[#0B1220]">
                  Transparent Per-kWh Tariffs
                </h3>
                <p className="text-xs text-[#8A94A6]">
                  No surge multipliers, no opaque booking fees
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              <div className="rounded-xl bg-[#F7F9FC] p-4 border border-[#E6EAF2]">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm text-[#0B1220]">
                    Standard AC Charging (7.4–22 kW)
                  </span>
                  <span className="font-mono text-xl font-bold text-[#0B1220]">
                    &#8377;12 &ndash; &#8377;14{" "}
                    <span className="text-xs font-normal text-[#8A94A6]">/ kWh</span>
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#8A94A6]">
                  Ideal for workplace and overnight destination charging.
                </p>
              </div>

              <div className="rounded-xl bg-[#F7F9FC] p-4 border border-[#E6EAF2]">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold text-sm text-[#0B1220]">
                    Highway Fast DC (50–120 kW)
                  </span>
                  <span className="font-mono text-xl font-bold text-[#1D6BFF]">
                    &#8377;16 &ndash; &#8377;18{" "}
                    <span className="text-xs font-normal text-[#8A94A6]">/ kWh</span>
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#8A94A6]">
                  High-speed expressway corridor charging with 15-min hold slots.
                </p>
              </div>

              <div className="pt-2 text-xs text-[#4A5568] space-y-1.5">
                <p>&#10003; Prices include 18% GST with downloadable tax invoices.</p>
                <p>
                  &#10003; 15-minute slot reservations hold the bay without penalties for
                  reasonable highway delays.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Policy Context */}
          <motion.div
            className="rounded-2xl border border-[#E6EAF2] bg-white p-8 shadow-[0_8px_30px_rgba(16,40,90,0.06)]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -3 }}
          >
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#1D6BFF]/12 to-[#4F8CFF]/5 text-[#1D6BFF]">
                <ShieldCheck size={24} weight="bold" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-lg text-[#0B1220]">
                  National EV Framework Alignment
                </h3>
                <p className="text-xs text-[#8A94A6]">
                  Built for public compliance across Indian States
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5 text-sm text-[#4A5568]">
              {[
                {
                  title: "PM e-DRIVE Scheme Readiness:",
                  desc: "Supporting interoperable public charging stations under the flagship PM Electric Drive Revolution in Innovative Vehicle Enhancement initiative.",
                },
                {
                  title: "Open Access & DISCOM Tariff Compliance:",
                  desc: "Aligns with Ministry of Power revised guidelines allowing de-licensed EV charging infrastructure and green energy open access tariff structures.",
                },
                {
                  title: "State EV Policy Incentives:",
                  desc: "Designed for Maharashtra, Delhi, Karnataka, and Tamil Nadu station operator capital subsidies and electricity duty exemptions.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3.5">
                  <CheckCircle
                    size={18}
                    weight="fill"
                    className="text-[#16C784] shrink-0 mt-0.5"
                  />
                  <div>
                    <strong className="text-[#0B1220]">{item.title}</strong>
                    <p className="text-xs mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
