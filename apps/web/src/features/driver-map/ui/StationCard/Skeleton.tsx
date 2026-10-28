"use client";

import React from "react";

export function StationCardSkeleton() {
  return (
    <div className="flex flex-col w-full animate-pulse p-4 space-y-4">
      {/* Photo Strip Skeleton */}
      <div className="w-full h-44 rounded-xl bg-[#DADCE0]/60" />

      {/* Title & Operator */}
      <div className="space-y-2">
        <div className="h-6 w-3/4 rounded-md bg-[#DADCE0]/80" />
        <div className="h-4 w-1/2 rounded-md bg-[#DADCE0]/50" />
      </div>

      {/* Live Availability Row */}
      <div className="p-3 rounded-xl border border-[#DADCE0] bg-[#F8F9FA] space-y-2">
        <div className="h-5 w-1/3 rounded-full bg-[#DADCE0]/70" />
        <div className="h-2 w-full rounded-full bg-[#DADCE0]/40" />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-full bg-[#1A73E8]/30" />
        <div className="h-9 w-20 rounded-full bg-[#DADCE0]/60" />
        <div className="h-9 w-20 rounded-full bg-[#DADCE0]/60" />
      </div>

      {/* Tabs Placeholder */}
      <div className="pt-2 space-y-3">
        <div className="h-8 w-full rounded-lg bg-[#DADCE0]/40" />
        <div className="h-16 w-full rounded-xl bg-[#DADCE0]/30" />
        <div className="h-16 w-full rounded-xl bg-[#DADCE0]/30" />
      </div>
    </div>
  );
}
