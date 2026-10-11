"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, BatteryCharging, Bell, User, Shield, Compass, Activity, LogOut, Sun, Moon } from "lucide-react";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { user, token, setRole, logout } = useAuthStore();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("evspark-theme");
    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("evspark-theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("evspark-theme", "dark");
      setIsDark(true);
    }
  };

  const navLinks = [
    { label: "Driver Map", href: "/", icon: <Compass className="h-4 w-4" /> },
    { label: "Route Planner", href: "/journey", icon: <Zap className="h-4 w-4" /> },
    { label: "Operator Hub", href: "/operator", icon: <Activity className="h-4 w-4" /> },
    { label: "Admin Twin", href: "/admin", icon: <Shield className="h-4 w-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#0B0F17]/85 backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-transform group-hover:scale-105">
              <Zap className="h-5 w-5 fill-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                EV<span className="text-emerald-600 dark:text-emerald-400">spark</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              </span>
              <span className="text-[10px] font-mono tracking-wider text-slate-500 dark:text-gray-400 uppercase -mt-1">
                Digital Twin AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold shadow-sm dark:bg-white/10 dark:text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5"
                  )}
                >
                  {link.icon}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {mounted ? (
            <>
              {/* Driver Vehicle Battery Indicator */}
              {user?.role === "DRIVER" && (
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                  <BatteryCharging className="h-4 w-4 animate-pulse text-emerald-600 dark:text-emerald-400" />
                  <span className="font-mono font-bold">78%</span>
                  <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 border-l border-emerald-500/30 pl-2">
                    {user.vehicleModelName || "Nexon EV"}
                  </span>
                </div>
              )}

              {/* Light / Dark Mode Toggle */}
              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition"
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
              </button>

              {/* Role Switcher for Testing */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-gray-300 hover:border-slate-300 dark:hover:border-white/20"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="uppercase font-mono text-[11px]">{user?.role || "DRIVER"}</span>
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-1.5 shadow-xl backdrop-blur-2xl z-50">
                    <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-400 dark:text-gray-400">
                      Switch Role (Dev)
                    </div>
                    {(["DRIVER", "OPERATOR", "ADMIN"] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRole(r);
                          setShowRoleMenu(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition",
                          user?.role === r
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 font-semibold"
                            : "text-slate-700 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-white/5"
                        )}
                      >
                        <span>{r}</span>
                        {user?.role === r && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white transition">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0B0F17]" />
              </button>

              {/* User profile / Logout */}
              {token ? (
                <div className="flex items-center gap-2 pl-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-gradient-to-tr dark:from-slate-800 dark:to-slate-700 text-xs font-bold text-slate-800 dark:text-white">
                    {user?.name ? user.name[0] : <User className="h-4 w-4 text-slate-600 dark:text-gray-300" />}
                  </div>
                  <button
                    onClick={logout}
                    title="Logout"
                    className="hidden sm:flex rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-rose-500 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-rose-400 transition"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-950 transition hover:bg-emerald-500"
                >
                  Sign In
                </Link>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/5 animate-pulse" />
              <div className="h-8 w-20 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
