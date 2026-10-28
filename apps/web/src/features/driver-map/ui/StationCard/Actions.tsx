"use client";

import React from "react";
import {
  NavigationArrow,
  Play,
  BookmarkSimple,
  CalendarCheck,
  ShareNetwork,
} from "@phosphor-icons/react";

interface ActionsProps {
  onDirections?: () => void;
  onStart?: () => void;
  onSave?: () => void;
  onBook?: () => void;
  onShare?: () => void;
  isSaved?: boolean;
}

export function StationCardActions({
  onDirections,
  onStart,
  onSave,
  onBook,
  onShare,
  isSaved = false,
}: ActionsProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none">
      {/* 1. Directions - Primary Filled Blue Pill */}
      <button
        onClick={onDirections}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A73E8] text-white text-[13px] font-semibold shadow-xs hover:bg-[#1557B0] active:scale-95 transition-all shrink-0"
      >
        <NavigationArrow size={16} weight="fill" />
        <span>Directions</span>
      </button>

      {/* 2. Start Charging */}
      <button
        onClick={onStart}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#DADCE0] text-[#202124] text-[13px] font-medium shadow-2xs hover:bg-[#F8F9FA] active:scale-95 transition-all shrink-0"
      >
        <Play size={15} weight="fill" className="text-[#1E8E3E]" />
        <span>Start</span>
      </button>

      {/* 3. Save to Favorites */}
      <button
        onClick={onSave}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#DADCE0] text-[#202124] text-[13px] font-medium shadow-2xs hover:bg-[#F8F9FA] active:scale-95 transition-all shrink-0"
      >
        <BookmarkSimple size={15} weight={isSaved ? "fill" : "bold"} className={isSaved ? "text-[#1A73E8]" : ""} />
        <span>{isSaved ? "Saved" : "Save"}</span>
      </button>

      {/* 4. Book Bay */}
      <button
        onClick={onBook}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#DADCE0] text-[#202124] text-[13px] font-medium shadow-2xs hover:bg-[#F8F9FA] active:scale-95 transition-all shrink-0"
      >
        <CalendarCheck size={15} weight="bold" className="text-[#5F6368]" />
        <span>Book</span>
      </button>

      {/* 5. Share */}
      <button
        onClick={onShare}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#DADCE0] text-[#202124] text-[13px] font-medium shadow-2xs hover:bg-[#F8F9FA] active:scale-95 transition-all shrink-0"
      >
        <ShareNetwork size={15} weight="bold" className="text-[#5F6368]" />
        <span>Share</span>
      </button>
    </div>
  );
}
