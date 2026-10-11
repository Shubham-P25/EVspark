"use client";

import { useState, useEffect } from "react";
import { Lightning, Plug, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

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
      setPowerKw((prev) => {
        // taper above 80%
        if (soc > 80) return Math.max(22, 60 * (1 - (soc - 80) / 30));
        return 58 + (Math.random() * 2 - 1);
      });
    }, 800);
    return () => clearInterval(interval);
  }, [isCharging, soc]);

  const complete = soc >= 98;
  const fill = complete
    ? "#1E8E3E"
    : `color-mix(in oklab, #F9AB00 ${100 - soc}%, #1E8E3E)`;

  return (
    <section className="border-b border-[#DADCE0] bg-[#F8F9FA] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="rounded-full bg-[#E8F0FE] px-3.5 py-1 text-xs font-semibold text-[#1A73E8]">
            Telemetry in Motion
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-[#202124]">
            Live Charging Animation
          </h2>
          <p className="text-base sm:text-lg text-[#5F6368]">
            Experience how station operators and drivers see real-time state of charge (SoC) climb second-by-second.
          </p>
        </div>

        <div className="mt-12 flex justify-center">
          <div className="w-full max-w-md rounded-2xl border border-[#DADCE0] bg-white p-6 shadow-md ring-1 ring-black/5">
            <div className="flex items-center justify-between border-b border-[#DADCE0] pb-3">
              <div>
                <p className="font-semibold text-[#202124]">Bay 01 &bull; Delta 60kW DC</p>
                <p className="text-xs text-[#5F6368]">CCS-2 Gun A &bull; Tata Nexon EV Max</p>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  background: complete ? "#E6F4EA" : "#FEF7E0",
                  color: complete ? "#1E8E3E" : "#B06000",
                }}
              >
                {complete ? "Complete" : isCharging ? "Fast Charging" : "Paused"}
              </span>
            </div>

            <div className="mt-6 flex items-center gap-6">
              {/* Battery tank */}
              <div
                className="relative h-40 w-20 overflow-hidden rounded-2xl border-2 border-[#9AA0A6] bg-[#F8F9FA] shadow-inner"
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
                      className={complete ? "text-white" : "text-[#202124]/80"}
                    />
                  ) : (
                    <Plug size={32} className="text-[#9AA0A6]" />
                  )}
                </div>
              </div>

              {/* Live numbers */}
              <div className="flex-1 space-y-2">
                <div>
                  <p className="font-mono text-4xl font-extrabold text-[#202124] tabular-nums">
                    {soc}%
                  </p>
                  <p className="text-xs text-[#5F6368]">Current State of Charge</p>
                </div>

                <div className="rounded-lg bg-[#F8F9FA] p-2.5 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#5F6368]">Output Power:</span>
                    <span className="font-mono font-semibold text-[#202124]">
                      {powerKw.toFixed(1)} kW
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6368]">Energy Added:</span>
                    <span className="font-mono font-semibold text-[#1A73E8]">
                      {((soc - 20) * 0.405).toFixed(1)} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5F6368]">Session Cost:</span>
                    <span className="font-mono font-semibold text-[#1E8E3E]">
                      &#8377;{Math.round((soc - 20) * 0.405 * 16.5)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setIsCharging(!isCharging)}
              >
                {isCharging ? "Pause Simulation" : "Resume Simulation"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSoc(25)}
                title="Reset simulation to 25%"
              >
                <ArrowClockwise size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
