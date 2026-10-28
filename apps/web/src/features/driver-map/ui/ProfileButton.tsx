"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  CalendarCheck,
  ClockCounterClockwise,
  Car,
  Leaf,
  Gear,
  SignOut,
  ArrowsClockwise,
  Lightning,
} from "@phosphor-icons/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { apiFetch } from "@/lib/api";
import { useMapUiStore, type MapPanel } from "../stores/map-ui-store";

interface ProfileResponse {
  user?: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    role?: "DRIVER" | "OPERATOR" | "ADMIN";
  };
  profile?: {
    vehicleRegNo?: string | null;
    batteryPct?: number | null;
    connectorPref?: string | null;
    vehicleModelId?: string | null;
  } | null;
}

function getAvatarColor(seed: string): string {
  const colors = [
    "#1A73E8", // Blue
    "#1E8E3E", // Green
    "#E8710A", // Orange
    "#9334E6", // Purple
    "#12B5CB", // Teal
    "#D93025", // Red
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ProfileButton() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const setPanel = useMapUiStore((s) => s.setPanel);

  // Fetch full profile and vehicle info
  const { data: profileData } = useQuery<ProfileResponse | null>({
    queryKey: ["my-profile"],
    queryFn: async () => {
      try {
        return await apiFetch<ProfileResponse>("/api/me/profile");
      } catch {
        return null;
      }
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 60_000,
  });

  const handleOpenPanel = (panel: MapPanel) => {
    setPanel(panel);
    setOpen(false);
    // Sync URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set("panel", panel);
    router.replace(url.pathname + url.search);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch {
      // fallback
      window.location.href = "/login";
    }
  };

  // 1. Loading State: 40px skeleton circle
  if (!isLoaded) {
    return (
      <div
        role="status"
        aria-label="Loading profile"
        className="size-10 rounded-full bg-[#E8EAED] animate-pulse border-2 border-white shadow-[0_1px_2px_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]"
      />
    );
  }

  // 2. Signed-Out State: "Sign in" pill
  if (!isSignedIn || !user) {
    return (
      <Link
        href="/login"
        className="h-10 px-4 rounded-full flex items-center justify-center text-xs font-semibold bg-white border border-[#DADCE0] text-[#1A73E8] shadow-[0_1px_2px_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] hover:bg-[#F8F9FA] transition-colors select-none focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
      >
        Sign in
      </Link>
    );
  }

  // 3. User Avatar & Initials
  const displayName = user.fullName || user.firstName || profileData?.user?.name || "EV Driver";
  const displayEmail = user.primaryEmailAddress?.emailAddress || profileData?.user?.email || "";
  const initials = (displayName || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarBg = getAvatarColor(user.id || displayName);

  const vehicle = profileData?.profile;
  const batteryPct = vehicle?.batteryPct ?? 82;
  const connectors = vehicle?.connectorPref || "CCS2";
  const userRole = profileData?.user?.role || "DRIVER";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          aria-expanded={open}
          className="size-10 rounded-full ring-2 ring-white shadow-[0_1px_2px_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] flex items-center justify-center overflow-hidden cursor-pointer select-none transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
          style={{ backgroundColor: avatarBg }}
        >
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={displayName}
              className="size-full object-cover"
            />
          ) : (
            <span className="text-white text-xs font-bold tracking-tight">
              {initials}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 bg-white border border-[#DADCE0] shadow-xl rounded-2xl overflow-hidden text-[#202124] z-50"
      >
        {/* Header */}
        <div className="p-4 bg-[#F8F9FA] border-b border-[#DADCE0] flex items-center gap-3">
          <div
            className="size-12 rounded-full ring-2 ring-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden"
            style={{ backgroundColor: avatarBg }}
          >
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={displayName}
                className="size-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-bold tracking-tight">
                {initials}
              </span>
            )}
          </div>
          <div className="overflow-hidden min-w-0">
            <h3 className="text-sm font-bold text-[#202124] truncate">
              {displayName}
            </h3>
            <p className="text-xs text-[#5F6368] truncate">
              {displayEmail}
            </p>
          </div>
        </div>

        {/* Vehicle Chip */}
        <div className="p-3 border-b border-[#DADCE0] bg-white">
          <div className="p-2.5 bg-[#F8F9FA] border border-[#DADCE0] rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-[#E8F0FE] flex items-center justify-center text-[#1A73E8]">
                <Car size={18} weight="fill" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#202124] block">
                  {vehicle?.vehicleRegNo || "Tata Nexon EV"}
                </span>
                <div className="flex items-center gap-2 text-[11px] text-[#5F6368]">
                  <span className="inline-flex items-center gap-0.5 text-[#1E8E3E] font-medium">
                    <Lightning size={12} weight="fill" />
                    {batteryPct}%
                  </span>
                  <span>·</span>
                  <span>{connectors}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenPanel("vehicle")}
              className="text-xs font-semibold text-[#1A73E8] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-2 space-y-0.5 text-xs">
          <button
            type="button"
            onClick={() => handleOpenPanel("favorites")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          >
            <Heart size={16} weight="fill" className="text-[#D93025]" />
            <span className="font-medium">Saved places</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPanel("bookings")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          >
            <CalendarCheck size={16} weight="duotone" className="text-[#1E8E3E]" />
            <span className="font-medium">Bookings</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPanel("history")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          >
            <ClockCounterClockwise size={16} weight="bold" className="text-[#1A73E8]" />
            <span className="font-medium">Charging history</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPanel("eco")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          >
            <Leaf size={16} weight="fill" className="text-[#1E8E3E]" />
            <span className="font-medium">Eco stats</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenPanel("settings")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#202124] hover:bg-[#F8F9FA] transition-colors cursor-pointer"
          >
            <Gear size={16} weight="fill" className="text-[#5F6368]" />
            <span className="font-medium">Settings</span>
          </button>
        </div>

        {/* Role Switcher if Admin / Operator */}
        {(userRole === "OPERATOR" || userRole === "ADMIN") && (
          <div className="p-2 border-t border-[#DADCE0] bg-[#F8F9FA]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368] px-3 block mb-1">
              Switch Workspace
            </span>
            {userRole === "OPERATOR" && (
              <Link
                href="/operator"
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-[#202124] hover:bg-white transition-colors"
              >
                <ArrowsClockwise size={14} />
                <span>Operator Dashboard</span>
              </Link>
            )}
            {userRole === "ADMIN" && (
              <Link
                href="/admin"
                className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium text-[#202124] hover:bg-white transition-colors"
              >
                <ArrowsClockwise size={14} />
                <span>Admin Console</span>
              </Link>
            )}
          </div>
        )}

        {/* Sign Out Footer */}
        <div className="p-2 border-t border-[#DADCE0]">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#D93025] hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            <SignOut size={16} weight="bold" />
            <span>Sign out</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ProfileButton;
