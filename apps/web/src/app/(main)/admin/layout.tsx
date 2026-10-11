"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  SquaresFour,
  CheckSquare,
  ChargingStation,
  Users,
  Cpu,
  ChartLineUp,
  WarningOctagon,
  Heartbeat,
  FileText,
  CreditCard,
  SignOut,
  Bell,
  ShieldCheck,
} from "@phosphor-icons/react";

const ADMIN_NAV = [
  { label: "Overview", href: "/admin", icon: SquaresFour },
  { label: "Station Approvals", href: "/admin/approvals", icon: CheckSquare },
  { label: "Stations", href: "/admin/stations", icon: ChargingStation },
  { label: "Users & Roles", href: "/admin/users", icon: Users },
  { label: "Digital Twin Controls", href: "/admin/twin", icon: Cpu },
  { label: "Forecast Evaluation", href: "/admin/forecast", icon: ChartLineUp },
  { label: "Reported Issues", href: "/admin/issues", icon: WarningOctagon },
  { label: "System Health", href: "/admin/health", icon: Heartbeat },
  { label: "Audit Log", href: "/admin/audit", icon: FileText, comingSoon: true },
  { label: "Platform Billing", href: "/admin/billing", icon: CreditCard, comingSoon: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();
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

  return (
    <div className="flex min-h-screen bg-[#F8F9FA] text-[#202124]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#DADCE0] bg-white flex flex-col shrink-0">
        <div className="p-5 border-b border-[#DADCE0] flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-xl bg-[#202124] text-white">
              <ShieldCheck size={20} weight="fill" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-[#202124]">EVspark</span>
              <span className="block text-[10px] font-semibold text-[#1A73E8] uppercase tracking-wider">
                Control Room
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.comingSoon ? "#" : item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  active
                    ? "bg-[#202124] text-white shadow-sm"
                    : item.comingSoon
                    ? "text-[#80868B] cursor-not-allowed opacity-75"
                    : "text-[#5F6368] hover:text-[#202124] hover:bg-[#F8F9FA]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} weight={active ? "fill" : "regular"} />
                  <span>{item.label}</span>
                </div>
                {item.comingSoon && (
                  <span className="text-[10px] bg-[#F1F3F4] text-[#5F6368] px-2 py-0.5 rounded-full font-medium">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#DADCE0] bg-white">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8F9FA]">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-[#202124] truncate">
                {user?.fullName || user?.username || "Admin"}
              </p>
              <p className="text-[10px] font-semibold text-[#1A73E8] uppercase tracking-wider">
                Superuser
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

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#DADCE0] bg-white px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1A73E8]">
              <span className="size-2 rounded-full bg-[#1A73E8]" />
              Platform Administrator
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-[#5F6368] tabular-nums font-semibold bg-[#F8F9FA] px-3 py-1.5 rounded-lg border border-[#DADCE0]">
              {clock || "–"}
            </span>
            <button
              type="button"
              className="p-2 rounded-xl text-[#5F6368] hover:bg-[#F8F9FA] border border-[#DADCE0] transition"
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
