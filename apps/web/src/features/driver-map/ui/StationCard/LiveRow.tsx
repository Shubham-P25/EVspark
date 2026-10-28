"use client";

import React from "react";
import { PIN_HEX, type PinColor, type LiveSource } from "@evspark/shared";

interface LiveRowProps {
  free: number;
  usable: number;
  total: number;
  color: PinColor;
  source: LiveSource;
  updatedAt?: number;
  chargers?: Array<{ id: string; status: string }>;
}

export function LiveRow({
  free,
  usable,
  total,
  color,
  source,
  updatedAt,
  chargers,
}: LiveRowProps) {
  const hexColor = PIN_HEX[color] || "#80868B";

  // Freshness calculation
  let freshnessText = "No live data";
  if (source === "google") {
    const secondsAgo = Math.max(10, Math.floor((Date.now() - (updatedAt || Date.now())) / 1000));
    freshnessText = `Live · Google · ${secondsAgo}s ago`;
  } else if (source === "twin") {
    freshnessText = "Simulated live · Digital Twin";
  }

  // Label text
  let statusText = `${free} of ${usable} free`;
  if (usable <= 0) {
    statusText = "No live chargers";
  } else if (free <= 0) {
    statusText = "All chargers busy";
  } else if (free >= usable) {
    statusText = `All ${usable} chargers free`;
  }

  // Build segments
  const segmentCount = total > 0 ? total : usable > 0 ? usable : 1;
  const segments: string[] = [];

  if (chargers && chargers.length > 0) {
    for (const c of chargers) {
      if (c.status === "FREE") segments.push("#1E8E3E");
      else if (c.status === "BUSY") segments.push("#E8710A");
      else segments.push("#80868B");
    }
  } else {
    for (let i = 0; i < segmentCount; i++) {
      if (i < free) segments.push("#1E8E3E");
      else if (i < usable) segments.push("#E8710A");
      else segments.push("#80868B");
    }
  }

  return (
    <div className="p-3.5 mx-4 my-2 rounded-xl border border-[#DADCE0] bg-[#F8F9FA] space-y-2.5">
      <div className="flex items-center justify-between">
        {/* Status Chip */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-[12px] font-bold shadow-xs"
          style={{ backgroundColor: hexColor }}
        >
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>{statusText}</span>
        </div>

        {/* Source & Freshness Text */}
        <span className="text-[12px] font-medium text-[#5F6368]">{freshnessText}</span>
      </div>

      {/* Segmented Charger Bar */}
      <div className="flex w-full h-2 rounded-full overflow-hidden gap-1 bg-[#E8EAED]">
        {segments.map((segColor, idx) => (
          <div
            key={idx}
            className="flex-1 h-full rounded-full transition-colors duration-200"
            style={{ backgroundColor: segColor }}
          />
        ))}
      </div>
    </div>
  );
}
