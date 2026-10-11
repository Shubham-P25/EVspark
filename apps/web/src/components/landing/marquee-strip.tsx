"use client";

import { Marquee } from "@/components/ui/marquee";

const PROTOCOLS = [
  "OCPP 1.6J Certified",
  "CCS-2 Fast DC (Up to 350 kW)",
  "Type 2 AC (7.4 kW – 22 kW)",
  "CHAdeMO Compatible",
  "GB/T Direct Protocol",
  "ISO 15118 Plug & Charge Ready",
  "Open Charge Point Protocol 2.0.1 Ready",
  "Smart Charging Profile (TxDefaultProfile)",
  "Real-Time MeterValues Telemetry",
  "100% Indian EV Fleet Interoperability",
];

export function MarqueeStrip() {
  return (
    <section className="border-b border-[#DADCE0] bg-white py-3 overflow-hidden">
      <Marquee pauseOnHover className="[--duration:35s]">
        {PROTOCOLS.map((text) => (
          <div
            key={text}
            className="flex items-center gap-3 px-4 text-xs font-semibold text-[#5F6368] tracking-wider uppercase"
          >
            <span className="size-1.5 rounded-full bg-[#1A73E8]" />
            <span>{text}</span>
          </div>
        ))}
      </Marquee>
    </section>
  );
}
