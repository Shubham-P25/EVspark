"use client";

import { useState, useEffect } from "react";
import { Lightning, Plug, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function ChargerPreviewSection() {
  const [soc, setSoc] = useState(42);
  const [powerKw, setPowerKw] = useState(58.4);
  const [isCharging, setIsCharging] = useState(true);

  useEffect(() => {
    if (!isCharging) return;
    const interval = setInterval(() => {
      setSoc((prev) => {
        if (prev >= 98) return 20;
        return prev + 1;
      });
      setPowerKw(() => {
        // taper above 80%
        if (soc > 80) return Math.max(22, 60 * (1 - (soc - 80) / 30));
        return 58 + (Math.random() * 2 - 1);
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isCharging, soc]);

  const complete = soc >= 98;
  const fill = complete
    ? "#16C784"
    : `color-mix(in oklab, #F5A524 ${100 - soc}%, #16C784)`;

  return (
    <section className="bg-[#F7F9FC] py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto max-w-3xl text-center space-y-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center rounded-full bg-[#1D6BFF]/8 px-4 py-1.5 text-xs font-semibold text-[#1D6BFF]">
            Telemetry in Motion
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B1220]">
            Live Charging Animation
          </h2>
          <p className="text-base sm:text-lg text-[#4A5568] max-w-2xl mx-auto">
            Experience how station operators and drivers see real-time state of charge (SoC)
            climb second-by-second.
          </p>
        </motion.div>

        <motion.div
          className="mt-14 flex justify-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E6EAF2] bg-white p-6 shadow-[0_8px_30px_rgba(16,40,90,0.06)] ring-1 ring-black/[0.03]">
            <div className="flex items-center justify-between border-b border-[#E6EAF2] pb-4">
              <div>
                <p className="font-heading font-semibold text-[#0B1220]">
                  Bay 01 &bull; Delta 60kW DC
                </p>
                <p className="text-xs text-[#8A94A6]">CCS-2 Gun A &bull; Tata Nexon EV Max</p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: complete ? "rgba(22, 199, 132, 0.1)" : "rgba(245, 165, 36, 0.1)",
                  color: complete ? "#16C784" : "#B06000",
                }}
              >
                {complete ? "Complete" : isCharging ? "Fast Charging" : "Paused"}
              </span>
            </div>

            <div className="mt-6 flex items-center gap-6">
              {/* Battery tank */}
              <div
                className="relative h-44 w-20 overflow-hidden rounded-2xl border-2 border-[#E6EAF2] bg-[#F7F9FC] shadow-inner"
                role="img"
                aria-label={`State of charge ${soc}%`}
              >
                <div
                  className="absolute inset-x-0 bottom-0"
                  style={{
                    height: `${soc}%`,
                    background: fill,
                    transition: "height 0.8s ease-out, background 0.8s ease-out",
                  }}
                >
                  {isCharging && !complete && <div className="ev-wave" />}
                </div>
                <div className="absolute inset-0 grid place-items-center">
                  {isCharging ? (
                    <Lightning
                      size={32}
                      weight="fill"
                      className={complete ? "text-white" : "text-[#0B1220]/60"}
                    />
                  ) : (
                    <Plug size={32} className="text-[#8A94A6]" />
                  )}
                </div>
              </div>

              {/* Live numbers */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="font-mono text-4xl font-extrabold text-[#0B1220] tabular-nums">
                    {soc}%
                  </p>
                  <p className="text-xs text-[#8A94A6]">Current State of Charge</p>
                </div>

                <div className="rounded-xl bg-[#F7F9FC] border border-[#E6EAF2] p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#8A94A6]">Output Power:</span>
                    <span className="font-mono font-semibold text-[#0B1220]">
                      {powerKw.toFixed(1)} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A94A6]">Energy Added:</span>
                    <span className="font-mono font-semibold text-[#1D6BFF]">
                      {((soc - 20) * 0.405).toFixed(1)} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A94A6]">Session Cost:</span>
                    <span className="font-mono font-semibold text-[#16C784]">
                      &#8377;{Math.round((soc - 20) * 0.405 * 16.5)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-xs rounded-xl border-[#E6EAF2] hover:bg-[#F7F9FC] hover:border-[#1D6BFF]/30 transition"
                onClick={() => setIsCharging(!isCharging)}
              >
                {isCharging ? "Pause Simulation" : "Resume Simulation"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-[#F7F9FC]"
                onClick={() => setSoc(25)}
                title="Reset simulation to 25%"
              >
                <ArrowClockwise size={16} />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
