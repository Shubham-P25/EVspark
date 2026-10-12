"use client";

import React from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Heart,
  CalendarCheck,
  ClockCounterClockwise,
  Car,
  Leaf,
  Gear,
  SignOut,
  House,
  Briefcase,
  User,
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
  user?: {
    name?: string | null;
    username?: string | null;
    vehicleModel?: string | null;
    regNo?: string | null;
  } | null;
  onOpenPanel: (panel: "favorites" | "bookings" | "history" | "vehicle" | "eco" | "settings") => void;
  onOpenHome: () => void;
  onOpenWork: () => void;
}

export function MenuDrawer({
  open,
  onOpenChange,
  user,
  onOpenPanel,
  onOpenHome,
  onOpenWork,
}: MenuDrawerProps) {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const navItems = [
    {
      group: "SAVED",
      items: [
        {
          label: "Saved Stations",
          icon: <Heart size={20} weight="fill" className="text-[#D93025]" />,
          onClick: () => {
            onOpenPanel("favorites");
            onOpenChange(false);
          },
        },
        {
          label: "Home Address",
          icon: <House size={20} weight="fill" className="text-[#1D6BFF]" />,
          onClick: () => {
            onOpenHome();
            onOpenChange(false);
          },
        },
        {
          label: "Work Address",
          icon: <Briefcase size={20} weight="fill" className="text-[#1D6BFF]" />,
          onClick: () => {
            onOpenWork();
            onOpenChange(false);
          },
        },
      ],
    },
    {
      group: "CHARGING & ACTIVITY",
      items: [
        {
          label: "Bookings",
          icon: <CalendarCheck size={20} weight="duotone" className="text-[#1E8E3E]" />,
          onClick: () => {
            onOpenPanel("bookings");
            onOpenChange(false);
          },
        },
        {
          label: "Charging History",
          icon: <ClockCounterClockwise size={20} weight="bold" className="text-[#1D6BFF]" />,
          onClick: () => {
            onOpenPanel("history");
            onOpenChange(false);
          },
        },
        {
          label: "My Vehicle",
          icon: <Car size={20} weight="fill" className="text-[#1D6BFF]" />,
          onClick: () => {
            onOpenPanel("vehicle");
            onOpenChange(false);
          },
        },
        {
          label: "Eco Impact",
          icon: <Leaf size={20} weight="fill" className="text-[#1E8E3E]" />,
          onClick: () => {
            onOpenPanel("eco");
            onOpenChange(false);
          },
        },
      ],
    },
    {
      group: "PREFERENCES",
      items: [
        {
          label: "Settings",
          icon: <Gear size={20} weight="fill" className="text-[#4A5568]" />,
          onClick: () => {
            onOpenPanel("settings");
            onOpenChange(false);
          },
        },
      ],
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] sm:w-[340px] p-0 bg-white border-r border-[#E6EAF2] flex flex-col text-[#0B1220]">
        {/* Profile Header */}
        <SheetHeader className="p-5 border-b border-[#E6EAF2] bg-[#F7F9FC] text-left">
          <SheetTitle className="sr-only">EVspark Driver Menu</SheetTitle>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[#1D6BFF] font-bold text-base">
              {user?.name?.[0]?.toUpperCase() || <User size={20} />}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-sm text-[#0B1220] truncate">
                {user?.name || "EV Driver"}
              </h3>
              <p className="text-xs text-[#4A5568] truncate">
                @{user?.username || "driver"}
              </p>
            </div>
          </div>

          {user?.vehicleModel && (
            <div className="mt-3 flex items-center justify-between text-[11px] p-2 bg-white rounded-xl border border-[#E6EAF2] text-[#4A5568]">
              <span className="font-medium text-[#0B1220]">{user.vehicleModel}</span>
              <span className="font-mono">{user.regNo || "MH12AB1234"}</span>
            </div>
          )}
        </SheetHeader>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
          {navItems.map((grp) => (
            <div key={grp.group} className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#4A5568] px-3 block">
                {grp.group}
              </span>
              <div className="space-y-0.5">
                {grp.items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    onClick={it.onClick}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#F7F9FC] text-[#0B1220] text-xs font-medium transition cursor-pointer"
                  >
                    {it.icon}
                    <span>{it.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sign Out footer */}
        <div className="p-4 border-t border-[#E6EAF2] bg-[#F7F9FC]">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#D93025] hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
          >
            <SignOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
