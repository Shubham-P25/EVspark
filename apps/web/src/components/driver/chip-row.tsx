"use client";

import React from "react";
import { House, Briefcase, Lightning, Check, Sparkle } from "@phosphor-icons/react";

interface ChipRowProps {
  hasHome: boolean;
  hasWork: boolean;
  onHomeClick: () => void;
  onWorkClick: () => void;
  selectedFilter: string;
  onFilterChange: (f: string) => void;
}

export function ChipRow({
  hasHome,
  hasWork,
  onHomeClick,
  onWorkClick,
  selectedFilter,
  onFilterChange,
}: ChipRowProps) {
  const chips = [
    { id: "home", label: "Home", icon: <House size={14} weight="fill" />, onClick: onHomeClick, isSpecial: true },
    { id: "work", label: "Work", icon: <Briefcase size={14} weight="fill" />, onClick: onWorkClick, isSpecial: true },
    { id: "ALL", label: "All Stations" },
    { id: "AVAILABLE", label: "Available Now", icon: <Check size={14} weight="bold" /> },
    { id: "FAST_DC", label: "Fast DC (>50 kW)", icon: <Lightning size={14} weight="fill" /> },
    { id: "CCS2", label: "CCS2" },
    { id: "Type2", label: "Type 2" },
    { id: "CHAdeMO", label: "CHAdeMO" },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs select-none">
      {chips.map((c) => {
        const isSelected = selectedFilter === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              if (c.onClick) {
                c.onClick();
              } else {
                onFilterChange(c.id);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium shadow-sm transition whitespace-nowrap cursor-pointer shrink-0 border ${
              isSelected
                ? "bg-[#1A73E8] border-[#1A73E8] text-white"
                : "bg-white border-[#DADCE0] text-[#202124] hover:bg-[#F8F9FA]"
            }`}
          >
            {c.icon}
            <span>{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
