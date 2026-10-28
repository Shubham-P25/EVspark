"use client";

import React from "react";
import { CheckCircle, Clock, NavigationArrow } from "@phosphor-icons/react";

interface PredictedWaitProps {
  free: number;
  waitMinutes?: number;
  headingCarsCount?: number;
}

export function StationCardPredictedWait({
  free,
  waitMinutes = 15,
  headingCarsCount = 0,
}: PredictedWaitProps) {
  if (free > 0) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 mx-4 my-1 rounded-xl border border-[#CEEAD6] bg-[#E6F4EA] text-[#137333]">
        <div className="flex items-center gap-2">
          <CheckCircle size={18} weight="fill" />
          <span className="text-[13px] font-semibold">No wait · Instant plug-in</span>
        </div>
        <span className="text-[12px] font-medium">Bays ready</span>
      </div>
    );
  }

  const effectiveWait = Math.max(5, Math.round(waitMinutes));

  return (
    <div className="flex items-center justify-between px-4 py-2.5 mx-4 my-1 rounded-xl border border-[#FAD2CF] bg-[#FCE8E6] text-[#C5221F]">
      <div className="flex items-center gap-2">
        <Clock size={18} weight="fill" />
        <span className="text-[13px] font-semibold">
          Wait ≈ {effectiveWait} min
        </span>
      </div>
      {headingCarsCount > 0 && (
        <span className="text-[12px] font-medium flex items-center gap-1 text-[#5F6368]">
          <NavigationArrow size={12} weight="fill" className="text-[#1A73E8]" />
          {headingCarsCount} {headingCarsCount === 1 ? "car" : "cars"} en route
        </span>
      )}
    </div>
  );
}
