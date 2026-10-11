import React, { type ReactNode } from "react";
import Link from "next/link";
import { Lightning, ShieldCheck, NavigationArrow, Sparkle } from "@phosphor-icons/react/dist/ssr";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F8F9FA]">
      {/* Brand Panel (Desktop Left Column) */}
      <aside className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col justify-between p-12 bg-white border-r border-[#DADCE0] relative overflow-hidden">
        <div>
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#1A73E8] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Lightning size={24} weight="fill" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-[#202124]">
              EV<span className="text-[#1A73E8]">spark</span>
            </span>
          </Link>

          <div className="mt-12 space-y-4">
            <h2 className="text-2xl font-bold text-[#202124] leading-tight">
              Smarter charging across Maharashtra’s electric corridors.
            </h2>
            <p className="text-[#5F6368] text-sm leading-relaxed">
              Real-time wait times, predictive availability, and end-to-end trip planning backed by hardware digital twins.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1A73E8] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkle size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#202124]">AI-Predicted Wait Times</h3>
                <p className="text-xs text-[#5F6368] mt-0.5">Live queue calculations blending hardware states and arrival forecasts.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-green-50 text-[#1E8E3E] flex items-center justify-center shrink-0 mt-0.5">
                <NavigationArrow size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#202124]">Along-Route Charging</h3>
                <p className="text-xs text-[#5F6368] mt-0.5">Accurate detour calculations with zero range anxiety on expressways.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#F9AB00] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck size={18} weight="bold" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#202124]">Verified Station Data</h3>
                <p className="text-xs text-[#5F6368] mt-0.5">70+ live high-power DC fast charging hubs in Mumbai, Pune, and beyond.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#DADCE0] flex items-center justify-between text-xs text-[#5F6368]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] animate-pulse" />
            Simulated charging data
          </span>
          <span>© {new Date().getFullYear()} EVspark</span>
        </div>
      </aside>

      {/* Main Content (Right Column) */}
      <main className="lg:col-span-7 xl:col-span-8 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 min-h-screen">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#1A73E8] flex items-center justify-center text-white">
              <Lightning size={22} weight="fill" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#202124]">
              EV<span className="text-[#1A73E8]">spark</span>
            </span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
