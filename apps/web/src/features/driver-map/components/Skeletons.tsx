'use client';

import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';

export function ListItemSkeleton() {
  return (
    <div className="flex h-[92px] items-center gap-3 rounded-[14px] p-3 border border-transparent">
      {/* 56x56 skeleton */}
      <div className="h-14 w-14 shrink-0 rounded-[12px] bg-ev-cardSoft animate-pulse" />
      <div className="flex flex-1 flex-col justify-between py-1">
        <div className="h-4 w-3/4 rounded bg-ev-cardSoft animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-ev-cardSoft animate-pulse mt-2" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-16 rounded-full bg-ev-cardSoft animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-ev-cardSoft animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <div className="h-40 w-full rounded-[14px] bg-ev-cardSoft animate-pulse" />
      <div className="space-y-2">
        <div className="h-6 w-2/3 rounded bg-ev-cardSoft animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-ev-cardSoft animate-pulse" />
      </div>
      <div className="h-28 w-full rounded-[20px] bg-ev-cardSoft animate-pulse" />
      <div className="space-y-2">
        <div className="h-12 w-full rounded-[14px] bg-ev-cardSoft animate-pulse" />
        <div className="h-12 w-full rounded-[14px] bg-ev-cardSoft animate-pulse" />
      </div>
    </div>
  );
}

export function PinsLoadingPill() {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full border border-ev-line bg-ev-card px-4 py-2 shadow-ev">
      <CircleNotch size={16} className="animate-spin text-ev-accent" />
      <span className="text-xs font-medium text-ev-ink">Loading stations…</span>
    </div>
  );
}

