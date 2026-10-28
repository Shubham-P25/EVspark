"use client";

import React from "react";
import {
  House,
  Briefcase,
  Heart,
  NavigationArrow,
  MapPin,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenPanel: (panel: "favorites") => void;
  onOpenHome: () => void;
  onOpenWork: () => void;
}

export function MenuDrawer({
  open,
  onOpenChange,
  onOpenPanel,
  onOpenHome,
  onOpenWork,
}: MenuDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] sm:w-[320px] p-0 bg-white border-r border-[#DADCE0] flex flex-col text-[#202124]"
      >
        {/* Header */}
        <SheetHeader className="p-5 border-b border-[#DADCE0] bg-[#F8F9FA] text-left">
          <SheetTitle className="text-base font-bold text-[#202124] flex items-center gap-2">
            <span className="size-7 rounded-lg bg-[#1A73E8] text-white flex items-center justify-center">
              <NavigationArrow size={16} weight="fill" />
            </span>
            <span>Map Navigation</span>
          </SheetTitle>
          <p className="text-xs text-[#5F6368] mt-1">
            Quick navigation to your saved coordinates.
          </p>
        </SheetHeader>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#5F6368] px-3 block">
              Saved Locations
            </span>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  onOpenHome();
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F8F9FA] text-[#202124] font-medium transition cursor-pointer"
              >
                <House size={18} weight="fill" className="text-[#1A73E8]" />
                <span>Home Address</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenWork();
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F8F9FA] text-[#202124] font-medium transition cursor-pointer"
              >
                <Briefcase size={18} weight="fill" className="text-[#1A73E8]" />
                <span>Work Address</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenPanel("favorites");
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F8F9FA] text-[#202124] font-medium transition cursor-pointer"
              >
                <Heart size={18} weight="fill" className="text-[#D93025]" />
                <span>Saved Stations</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#DADCE0] bg-[#F8F9FA] text-[11px] text-[#5F6368] flex items-center gap-2">
          <MapPin size={14} />
          <span>India EV Charging Network</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default MenuDrawer;
