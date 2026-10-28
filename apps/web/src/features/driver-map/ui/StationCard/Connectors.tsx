"use client";

import React from "react";
import { Lightning, WarningCircle } from "@phosphor-icons/react";

interface ChargerItem {
  id: string;
  label?: string;
  connectorType: string;
  powerKw: number;
  status: "FREE" | "BUSY" | "MAINTENANCE" | "FAULTED" | "OFFLINE";
}

interface ConnectorsProps {
  chargers?: ChargerItem[];
}

export function StationCardConnectors({ chargers = [] }: ConnectorsProps) {
  if (chargers.length === 0) {
    return (
      <div className="p-4 text-center text-[#5F6368] text-[13px]">
        No connector details available for this station.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#DADCE0] border-t border-b border-[#DADCE0]">
      {chargers.map((c, i) => {
        const isFree = c.status === "FREE";
        const isBusy = c.status === "BUSY";
        const isOffline = !isFree && !isBusy;

        return (
          <div key={c.id || i} className="flex items-center justify-between p-3.5 hover:bg-[#F8F9FA] transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#F1F3F4] text-[#202124]">
                <Lightning size={20} weight="fill" className={isFree ? "text-[#1E8E3E]" : "text-[#5F6368]"} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#202124]">{c.connectorType}</span>
                  <span className="text-[12px] font-mono font-medium text-[#5F6368]">{c.powerKw} kW</span>
                </div>
                {c.label && <span className="text-[12px] text-[#5F6368]">{c.label}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  isFree ? "bg-[#1E8E3E]" : isBusy ? "bg-[#E8710A]" : "bg-[#80868B]"
                }`}
              />
              <span className="text-[12px] font-medium text-[#202124]">
                {isFree ? "Available" : isBusy ? "In Use" : "Offline"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
