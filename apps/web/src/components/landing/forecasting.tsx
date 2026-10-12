"use client";

import { Brain, Cpu, Compass, ChartBar } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export function ForecastingSection() {
  return (
    <section id="predictions" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full bg-[#1D6BFF]/8 px-4 py-1.5 text-xs font-semibold text-[#1D6BFF]">
            Machine Learning Engine
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B1220]">
            How EVspark predicts queue wait times before you arrive
          </h2>
          <p className="text-base sm:text-lg text-[#4A5568] max-w-2xl mx-auto">
            Simple availability indicators fail on highway journeys. Our blended algorithm
            estimates exactly what bay will be free when your wheels arrive.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formula & Explanation */}
          <motion.div
            className="lg:col-span-7 space-y-6"
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="rounded-2xl border border-[#E6EAF2] bg-[#F7F9FC] p-6 sm:p-8 space-y-6">
              <h3 className="font-heading font-semibold text-lg text-[#0B1220]">
                The Blended Wait Formula
              </h3>
              <div className="rounded-xl border border-[#E6EAF2] bg-white p-5 font-mono text-sm text-[#0B1220] shadow-[0_4px_16px_rgba(16,40,90,0.04)]">
                <span className="text-[#1D6BFF] font-bold">Wait(arrival)</span> ={" "}
                <span className="text-[#16C784]">0.40 &times; HardwareQueue(t)</span> +{" "}
                <span className="text-[#B06000]">
                  0.60 &times; ML_Forecast(hour, weekday, dist)
                </span>
              </div>

              <div className="space-y-5 text-sm text-[#4A5568]">
                <div className="flex items-start gap-3.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#16C784]/12 to-[#16C784]/5 text-[#16C784]">
                    <Cpu size={18} weight="bold" />
                  </div>
                  <div>
                    <strong className="text-[#0B1220]">
                      1. Hardware Telemetry & Geofence (40%):
                    </strong>
                    <p className="mt-1">
                      Monitors active MeterValues, remaining battery kW taper, plus 200m GPS
                      geofence pings for cars entering the station parking lot.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#F5A524]/12 to-[#F5A524]/5 text-[#B06000]">
                    <Brain size={18} weight="bold" />
                  </div>
                  <div>
                    <strong className="text-[#0B1220]">
                      2. HistGradientBoostingRegressor (60%):
                    </strong>
                    <p className="mt-1">
                      Trained on historical demand patterns, weekend highway migration surges (e.g.
                      Friday evening Lonavala rush), and vehicle battery curves.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#1D6BFF]/12 to-[#4F8CFF]/5 text-[#1D6BFF]">
                    <Compass size={18} weight="bold" />
                  </div>
                  <div>
                    <strong className="text-[#0B1220]">3. Dynamic Clamping:</strong>
                    <p className="mt-1">
                      If 2 or more chargers are currently FREE, hardware wait immediately clamps to
                      0 minutes, avoiding false queue alerts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Model Metrics Benchmarks */}
          <motion.div
            className="lg:col-span-5 space-y-4"
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_8px_30px_rgba(16,40,90,0.06)]">
              <div className="flex items-center justify-between border-b border-[#E6EAF2] pb-4">
                <span className="text-xs font-heading font-semibold uppercase text-[#8A94A6] tracking-wider">
                  Model Evaluation Metrics
                </span>
                <span className="rounded-md bg-[#16C784]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#16C784]">
                  Verified
                </span>
              </div>

              <div className="mt-5 space-y-5">
                {[
                  {
                    label: "Mean Absolute Error (MAE)",
                    value: "0.22 minutes",
                    color: "#16C784",
                    width: "95%",
                  },
                  {
                    label: "R² Correlation Score",
                    value: "0.989",
                    color: "#1D6BFF",
                    width: "98%",
                  },
                  {
                    label: "Mean Absolute % Error (MAPE)",
                    value: "9.47%",
                    color: "#1D6BFF",
                    width: "91%",
                  },
                ].map((metric, idx) => (
                  <div key={metric.label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#4A5568]">{metric.label}</span>
                      <span className="font-mono font-bold" style={{ color: metric.color }}>
                        {metric.value}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-[#F7F9FC]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: metric.color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: metric.width }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + idx * 0.15, duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}

                <div className="rounded-xl bg-[#F7F9FC] border border-[#E6EAF2] p-4 text-xs text-[#4A5568]">
                  <p className="font-medium text-[#0B1220]">Heuristic Fallback Safety:</p>
                  <p className="mt-1">
                    If the ML inference container goes offline or times out (&gt;200ms), system
                    seamlessly defaults to deterministic queue math without erroring.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
