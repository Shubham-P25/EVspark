"use client";

import React from "react";
import { Lightning, Plug, Warning } from "@phosphor-icons/react";
import { useNow } from "@/hooks/use-now";
import { inr, mmss, num } from "@/lib/format";
import { liveEnergyKwh, liveSoc, remainingSec, type LiveCharger } from "@/lib/live";

export function ChargerCard({
  c,
  tariff,
  updatedAt,
  onToggleMaintenance,
}: {
  c: LiveCharger;
  tariff: number;
  updatedAt: number;
  onToggleMaintenance: (c: LiveCharger) => void;
}) {
  const now = useNow(1000);
  const s = c.activeSession;
  const charging = c.status === "BUSY" && !!s;
  const soc = charging ? liveSoc(s!, updatedAt, now) : 0;
  const complete = charging && soc >= 99.5;
  const down = c.status === "FAULTED" || c.status === "OFFLINE" || c.status === "MAINTENANCE";
  const kwh = charging ? liveEnergyKwh(s!, updatedAt, now) : 0;
  const rem = charging ? remainingSec(c, now) : null;
  const fill = complete
    ? "#1E8E3E"
    : `color-mix(in oklab, #F9AB00 ${100 - soc}%, #1E8E3E)`; // amber -> green as it fills

  return (
    <div
      className={`rounded-2xl bg-white p-4.5 ring-1 transition-all shadow-sm ${
        down ? "ring-[#D93025]/30 bg-red-50/10" : "ring-[#DADCE0] hover:shadow-md"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-[#202124]">{c.label ?? "Charger"}</p>
          <p className="text-xs text-[#5F6368]">
            {c.connectorType} · <span className="font-mono font-medium">{c.powerKw} kW</span>
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{
            background: down ? "#FCE8E6" : charging ? "#FEF7E0" : "#E6F4EA",
            color: down ? "#D93025" : charging ? "#B06000" : "#1E8E3E",
          }}
        >
          {down ? c.status.toLowerCase() : complete ? "complete" : charging ? "charging" : "available"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        {/* battery-style tank that fills from the bottom */}
        <div
          className="relative h-32 w-16 overflow-hidden rounded-xl border-2 border-[#9AA0A6] bg-[#F8F9FA] shadow-inner shrink-0"
          role="img"
          aria-label={`State of charge ${Math.round(soc)} percent`}
        >
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: `${soc}%`,
              background: fill,
              transition: "height 1s linear, background 1s linear",
            }}
          >
            {charging && !complete && <div className="ev-wave" />}
          </div>
          <div className="absolute inset-0 grid place-items-center">
            {down ? (
              <Warning size={28} className="text-[#D93025]" weight="fill" />
            ) : charging ? (
              <Lightning
                size={28}
                weight="fill"
                className={complete ? "text-white" : "text-[#202124]/70"}
              />
            ) : (
              <Plug size={28} className="text-[#9AA0A6]" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          {charging ? (
            <>
              <p className="font-mono text-3xl font-semibold tabular-nums text-[#202124]">
                {Math.round(soc)}%
              </p>
              <p className="truncate text-xs text-[#5F6368]">
                <b className="text-[#202124]">{s!.vehicleModel ?? "Vehicle"}</b> · {s!.regMasked ?? ""}
              </p>
              <p className="font-mono text-xs tabular-nums text-[#202124]">
                {num(s!.kwNow ?? c.powerKw, 1)} kW · {num(kwh, 1)} kWh · {inr(kwh * tariff)}
              </p>
              <p className="font-mono text-xs tabular-nums text-[#5F6368] font-medium">
                {complete ? "Charge complete" : `${rem !== null ? mmss(rem) : "–"} left`}
              </p>
            </>
          ) : (
            <p className="text-sm text-[#5F6368]">
              {down ? "Not in service" : "Waiting for a vehicle"}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-xl border border-[#DADCE0] py-2 text-xs font-semibold text-[#202124] hover:bg-[#F8F9FA] transition cursor-pointer"
        onClick={() => onToggleMaintenance(c)}
      >
        {c.status === "MAINTENANCE" ? "Bring online" : "Put in maintenance"}
      </button>
    </div>
  );
}
