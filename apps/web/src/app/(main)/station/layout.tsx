"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  SquaresFour,
  Lightning,
  UsersThree,
  ChartLineUp,
  CurrencyInr,
  Star,
  Warning,
  Gear,
  Bell,
  SignOut,
  CaretDown,
  Building,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Overview", href: "/station", icon: SquaresFour },
  { label: "Chargers", href: "/station/chargers", icon: Lightning },
  { label: "Queue & Bookings", href: "/station/queue", icon: UsersThree },
  { label: "Analytics", href: "/station/analytics", icon: ChartLineUp },
  { label: "Pricing & Hours", href: "/station/pricing", icon: CurrencyInr },
  { label: "Reviews", href: "/station/reviews", icon: Star },
  { label: "Alerts", href: "/station/alerts", icon: Warning },
  { label: "Settings", href: "/station/settings", icon: Gear },
];

export default function StationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: stations } = useQuery<any[]>({
    queryKey: ["operator-stations"],
    queryFn: () => api.get("/api/operator/stations"),
  });

  const [selectedStationId, setSelectedStationId] = useState<string>("");

  useEffect(() => {
    if (stations && stations.length > 0 && !selectedStationId) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId]);

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] text-[#202124]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#DADCE0] bg-white flex flex-col shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-[#DADCE0] flex items-center justify-between">
          <Link href="/station" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl bg-[#1A73E8] text-white">
              <Lightning size={20} weight="fill" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#202124]">EVspark</span>
              <span className="block text-[10px] font-semibold text-[#5F6368] uppercase tracking-wider">
                Operator Console
              </span>
            </div>
          </Link>
        </div>

        {/* Station switcher if multiple */}
        {stations && stations.length > 1 && (
          <div className="p-3 border-b border-[#DADCE0]">
            <label className="block text-[11px] font-semibold text-[#5F6368] uppercase mb-1">
              Active Station
            </label>
            <div className="relative">
              <select
                value={selectedStationId}
                onChange={(e) => setSelectedStationId(e.target.value)}
                className="w-full text-xs h-9 pl-8 pr-7 rounded-lg border border-[#DADCE0] bg-white font-medium outline-none focus:border-[#1A73E8]"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Building size={14} className="absolute left-2.5 top-2.5 text-[#5F6368] pointer-events-none" />
              <CaretDown size={12} className="absolute right-2.5 top-3 text-[#5F6368] pointer-events-none" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  active
                    ? "bg-[#1A73E8] text-white shadow-sm"
                    : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]"
                }`}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-[#DADCE0] bg-white">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA]">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-[#202124] truncate">
                {user?.fullName || user?.username || "Operator"}
              </p>
              <p className="text-[11px] text-[#5F6368] truncate">
                {user?.primaryEmailAddress?.emailAddress || "Verified"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut(() => router.push("/login"))}
              title="Sign out"
              className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#D93025] hover:bg-white transition cursor-pointer"
            >
              <SignOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-[#DADCE0] bg-white px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] px-3 py-1 text-xs font-semibold text-[#1E8E3E]">
              <span className="size-2 rounded-full bg-[#1E8E3E] animate-pulse" />
              Live · Simulated data
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-[#5F6368] tabular-nums font-semibold bg-[#F8F9FA] px-3 py-1.5 rounded-lg border border-[#DADCE0]">
              {clock || "–"}
            </span>

            <button
              type="button"
              className="relative p-2 rounded-xl text-[#5F6368] hover:bg-[#F8F9FA] border border-[#DADCE0] transition cursor-pointer"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-[#1A73E8]" />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
