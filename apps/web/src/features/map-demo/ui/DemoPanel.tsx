"use client";

import React, { useState, useMemo } from "react";
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  Car,
  User,
  Info,
  X,
  Sparkle,
  CheckCircle,
  XCircle,
  Flask,
  PlayCircle,
  ShieldCheck,
  Queue,
  Lightning,
  Clock,
  MagnifyingGlass,
  WarningCircle,
  CarSimple,
  Sliders,
} from "@phosphor-icons/react";
import { useMapDemo } from "./useMapDemo";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const GROUPS = [
  "All",
  "Geometry",
  "Movement",
  "Queue",
  "Wait time",
  "Faults",
  "Clock",
  "Sanity",
  "Checked in CI / E2E",
] as const;

export function DemoPanel() {
  const {
    state,
    paused,
    speed,
    stations,
    log,
    allCases,
    caseResults,
    runningAllCases,
    runningCaseId,
    activeFilterGroup,
    searchQuery,
    togglePause,
    setSpeed,
    reset,
    forceSpawn,
    toggleFault,
    rushHour,
    runDemoCase,
    runAllDemoCases,
    setFilterGroup,
    setSearchQuery,
    stop,
  } = useMapDemo();

  const [activeTab, setActiveTab] = useState<"cases" | "scenarios" | "bays" | "log">("cases");
  const [minimized, setMinimized] = useState(false);

  if (state !== "running" && state !== "loading") return null;

  const currentStation = stations[0];

  // Counts across all 68 test cases
  const totalCount = allCases.length;
  const passedCount = useMemo(
    () => Object.values(caseResults).filter((r) => r.status === "passed").length,
    [caseResults]
  );
  const progressPercent = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  // Filter cases based on selected group & search query
  const filteredCases = useMemo(() => {
    return allCases.filter((c) => {
      const matchGroup = activeFilterGroup === "All" || c.group === activeFilterGroup;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        c.id.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.group.toLowerCase().includes(query);
      return matchGroup && matchQuery;
    });
  }, [allCases, activeFilterGroup, searchQuery]);

  return (
    <div
      role="region"
      aria-label="Simulation Demo Panel"
      className="absolute bottom-4 left-4 z-30 w-full max-w-[620px] max-h-[88vh] flex flex-col bg-white border border-[#CBD5E1] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.18)] text-[#1E293B] overflow-hidden select-none transition-all font-sans"
    >
      {/* 1. Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            <span className="size-2.5 rounded-full bg-[#2563EB] animate-pulse" />
            Standalone Demo Station (Away from Road)
          </span>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Demo Information"
                className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-full hover:bg-[#E2E8F0] transition-colors"
              >
                <Info size={18} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-96 p-4 text-xs bg-white text-[#1E293B] border border-[#CBD5E1] shadow-2xl rounded-xl z-50 space-y-2.5"
            >
              <h4 className="font-extrabold text-sm text-[#1D4ED8] flex items-center gap-1.5">
                <Sparkle size={18} weight="fill" />
                Dedicated Hub & 68 Test Invariants
              </h4>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong>1. Standalone Demo Station:</strong> Positioned in an open ground (BKC grounds) with a 32m buffer from public roads, completely eliminating road overlaps.
              </p>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong>2. Comprehensive 68 Cases:</strong> Covers Geometry (7), Movement (8), Queue (11), Wait time (10), Faults (4), Clock (6), Sanity (2), and CI/E2E (20).
              </p>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong>3. Rich EV Animations:</strong> Glowing geofence, animated DC fast charger cables, real-time battery percentage pills, and turn/brake lights.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            className="text-xs px-2.5 py-1 text-[#475569] hover:bg-[#E2E8F0] rounded-lg font-semibold transition-colors"
          >
            {minimized ? "Expand" : "Minimize"}
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="Close demo"
            className="text-[#64748B] hover:text-[#DC2626] p-1.5 rounded-full hover:bg-[#FEE2E2] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* 2. Top Playback Controls & Quick Spawners */}
          <div className="p-3 bg-white border-b border-[#E2E8F0] space-y-2.5">
            {/* Play/Pause/Speed Bar */}
            <div className="flex items-center justify-between gap-1.5 p-1.5 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
              <button
                type="button"
                onClick={togglePause}
                className="px-3 py-1.5 rounded-lg bg-white shadow-sm text-[#0F172A] hover:bg-[#F8FAFC] font-bold text-xs flex items-center gap-1.5 border border-[#CBD5E1] transition-all"
              >
                {paused ? <Play size={15} weight="fill" className="text-[#2563EB]" /> : <Pause size={15} weight="fill" />}
                <span>{paused ? "Resume" : "Pause"}</span>
              </button>

              <div className="flex items-center gap-1">
                {([1, 2, 5, 10] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                      speed === s
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "text-[#64748B] hover:text-[#0F172A] hover:bg-white"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={reset}
                title="Reset simulation"
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-white border border-transparent hover:border-[#CBD5E1] transition-all flex items-center gap-1 text-xs font-semibold"
              >
                <ArrowCounterClockwise size={16} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>

            {/* Quick Vehicle Spawner Bar */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => forceSpawn("CHARGER")}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-xs font-bold hover:bg-[#D1FAE5] active:scale-[0.98] transition-all shadow-sm"
              >
                <Car size={16} weight="fill" />
                <span>+ Spawn EV</span>
              </button>

              <button
                type="button"
                onClick={() => forceSpawn("STAYER")}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] text-xs font-bold hover:bg-[#E0E7FF] active:scale-[0.98] transition-all shadow-sm"
              >
                <User size={16} weight="bold" />
                <span>+ Visitor</span>
              </button>

              <button
                type="button"
                onClick={rushHour}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-xs font-bold hover:bg-[#FDE68A] active:scale-[0.98] transition-all shadow-sm"
              >
                <Sparkle size={16} weight="fill" />
                <span>Rush Hour</span>
              </button>
            </div>
          </div>

          {/* 3. Station Real-Time KPI Cards (HUD) */}
          {currentStation && (
            <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-center">
                  <span className="text-[10px] font-bold text-[#065F46] block uppercase tracking-wider">3 Bays Active</span>
                  <span className="text-sm font-black text-[#047857]">{currentStation.chargingQ} / 3</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-center">
                  <span className="text-[10px] font-bold text-[#92400E] block uppercase tracking-wider">In Queue</span>
                  <span className="text-sm font-black text-[#B45309]">{currentStation.waiting}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-center">
                  <span className="text-[10px] font-bold text-[#3730A3] block uppercase tracking-wider">Visitor Stalls</span>
                  <span className="text-sm font-black text-[#4338CA]">
                    {Math.max(0, currentStation.insideFenceCount - currentStation.chargingQ - currentStation.waiting)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-center">
                  <span className="text-[10px] font-bold text-[#166534] block uppercase tracking-wider">Road Clearance</span>
                  <span className="text-sm font-black text-[#15803D]">32m (Clear)</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Tab Navigation Bar */}
          <div className="flex border-b border-[#E2E8F0] bg-white text-xs font-bold text-[#64748B]">
            <button
              type="button"
              onClick={() => setActiveTab("cases")}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "cases"
                  ? "border-[#2563EB] text-[#2563EB] bg-[#F8FAFC]"
                  : "border-transparent hover:text-[#0F172A]"
              }`}
            >
              <Flask size={16} weight={activeTab === "cases" ? "fill" : "regular"} />
              Test Cases ({passedCount}/{totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("bays")}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "bays"
                  ? "border-[#2563EB] text-[#2563EB] bg-[#F8FAFC]"
                  : "border-transparent hover:text-[#0F172A]"
              }`}
            >
              <Lightning size={16} weight={activeTab === "bays" ? "fill" : "regular"} />
              Charger Bays (3)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("log")}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "log"
                  ? "border-[#2563EB] text-[#2563EB] bg-[#F8FAFC]"
                  : "border-transparent hover:text-[#0F172A]"
              }`}
            >
              Event Log ({log.length})
            </button>
          </div>

          {/* 5. Main Tab Content */}
          <div className="overflow-y-auto max-h-[46vh] p-3 space-y-3">
            {/* Tab: All 68 Test Cases */}
            {activeTab === "cases" && (
              <div className="space-y-3">
                {/* Top Verification Summary Card */}
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-[#0F172A] flex items-center gap-1.5">
                        <ShieldCheck size={18} weight="fill" className="text-[#10B981]" />
                        Official Demo Test Suite: {passedCount} / {totalCount} Passed
                      </h4>
                      <p className="text-[11px] text-[#64748B]">
                        Pure mathematical invariants, queue mechanics, clock precision & zero road encroachment.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={runAllDemoCases}
                      disabled={runningAllCases}
                      className="text-xs font-bold px-3.5 py-2 rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-50 transition-all shadow-sm active:scale-[0.98] shrink-0 flex items-center gap-1.5"
                    >
                      <PlayCircle size={16} weight="fill" />
                      <span>{runningAllCases ? "Running 68..." : "Run All 68 Cases"}</span>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#10B981] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Search Bar & Category Filter Pills */}
                <div className="space-y-2">
                  {/* Search Bar */}
                  <div className="relative">
                    <MagnifyingGlass
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                    />
                    <input
                      type="text"
                      placeholder="Search 68 cases by ID or keyword (e.g. G1, M2, Erlang, queue)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
                    {GROUPS.map((grp) => {
                      const count = grp === "All" ? allCases.length : allCases.filter((c) => c.group === grp).length;
                      const isActive = activeFilterGroup === grp;

                      return (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setFilterGroup(grp)}
                          className={`px-2.5 py-1 rounded-lg shrink-0 transition-all text-[11px] ${
                            isActive
                              ? "bg-[#2563EB] text-white font-bold shadow-sm"
                              : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                          }`}
                        >
                          {grp} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Test Cards List */}
                <div className="space-y-2">
                  {filteredCases.map((tc) => {
                    const res = caseResults[tc.id] || { status: "idle", detail: "Ready to run" };
                    const isRunning = runningCaseId === tc.id;

                    return (
                      <div
                        key={tc.id}
                        className="p-3 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#94A3B8] transition-all space-y-2 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                                {tc.id}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B]">
                                {tc.group}
                              </span>
                              <h4 className="text-xs font-extrabold text-[#0F172A]">{tc.title}</h4>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => runDemoCase(tc.id)}
                            disabled={runningAllCases}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] text-xs font-bold disabled:opacity-40 transition-colors border border-[#BFDBFE]"
                          >
                            <PlayCircle size={15} weight="fill" />
                            <span>{isRunning ? "Running..." : "Run"}</span>
                          </button>
                        </div>

                        {/* Result State & Detail */}
                        <div className="flex items-center gap-2 pt-1.5 text-xs border-t border-[#F8FAFC]">
                          {res.status === "passed" ? (
                            <CheckCircle size={16} weight="fill" className="text-[#10B981] shrink-0" />
                          ) : res.status === "failed" ? (
                            <XCircle size={16} weight="fill" className="text-[#EF4444] shrink-0" />
                          ) : isRunning ? (
                            <span className="size-2.5 rounded-full bg-[#2563EB] animate-ping shrink-0" />
                          ) : (
                            <ShieldCheck size={16} className="text-[#94A3B8] shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              res.status === "passed"
                                ? "text-[#059669] font-bold"
                                : res.status === "failed"
                                ? "text-[#DC2626] font-bold"
                                : "text-[#64748B]"
                            }`}
                          >
                            {res.detail}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Hardware Charger Bays Controls */}
            {activeTab === "bays" && currentStation && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
                  Hardware Charger Bays (3 Bays DC Fast)
                </span>
                <div className="space-y-2">
                  {currentStation.chargers.map((ch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-[#0F172A] text-sm">Bay C{idx + 1}</span>
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                            ch.state === "CHARGING"
                              ? "bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]"
                              : ch.state === "FREE"
                              ? "bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]"
                              : "bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]"
                          }`}
                        >
                          {ch.state}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFault(currentStation.id, idx)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${
                          ch.online
                            ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA] hover:bg-[#FCA5A5]"
                            : "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]"
                        }`}
                      >
                        {ch.online ? "Trip Fault (Test F1)" : "Restore Bay"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Real-Time Event Stream */}
            {activeTab === "log" && (
              <div className="space-y-1.5 font-mono text-xs">
                {log.length === 0 ? (
                  <p className="text-center text-[#64748B] py-6">No events recorded yet.</p>
                ) : (
                  log.map((e, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] leading-snug">
                      <span className="text-[#2563EB] font-bold mr-1.5">t={e.t.toFixed(1)}s</span>
                      <span className="font-bold text-[#334155] mr-1.5">[{e.type}]</span>
                      <span className="text-[#0F172A]">{e.msg}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default DemoPanel;
