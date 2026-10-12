"use client";

import React, { useState } from "react";
import {
  Lightning,
  Play,
  Pause,
  ArrowClockwise,
  Car,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Sparkle,
  X,
  CaretRight,
  ShieldCheck,
  Cpu,
  ChartLineUp,
  Image as ImageIcon,
  Flask,
} from "@phosphor-icons/react";
import { useGhostSimulationStore } from "@/stores/ghost-simulation-store";
import { CURATED_EV_PHOTOS } from "@/lib/station-photos";

interface PresentationSuiteProps {
  stations: any[];
  onSelectStation?: (stationId: string) => void;
}

export function PresentationSuite({ stations, onSelectStation }: PresentationSuiteProps) {
  const {
    ghosts,
    stationOverrides,
    isPaused,
    simSpeed,
    presentationOpen,
    setPresentationOpen,
    togglePause,
    setSimSpeed,
    spawnGhostCar,
    triggerRushHour,
    shrinkWaitTimes,
    freeStationCharger,
    stackGhostToStation,
    resetSimulation,
    isRunningTests,
    testResults,
    testLog,
    runAutomatedTests,
  } = useGhostSimulationStore();

  const [activeTab, setActiveTab] = useState<"pitch" | "tests" | "fleet" | "gallery">("pitch");

  // Selected sample station for testing
  const sampleStation = stations[0] || {
    id: "station-default-bkc",
    name: "Tata Power EZ Charge - BKC",
    lat: 19.0657,
    lng: 72.8687,
    totalChargers: 4,
  };

  const activeGhostsCount = ghosts.length;
  const occupiedStationsCount = Object.values(stationOverrides).filter(
    (s) => s.occupiedChargers > 0
  ).length;

  return (
    <>
      {/* 1. FLOATING PRESENTATION & DEMO DOCK ON MAP */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Main Presentation Guide Launcher Button */}
        <button
          type="button"
          onClick={() => setPresentationOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 text-white backdrop-blur-xl shadow-2xl border border-white/20 transition-all active:scale-95 cursor-pointer"
        >
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
          </span>

          <div className="flex flex-col text-left">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
              Live Demo Mode
            </span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              Presentation Guide & Tests <Sparkle size={13} weight="fill" className="text-amber-400" />
            </span>
          </div>
        </button>
      </div>

      {/* Floating Bottom Quick Action Toolbar */}
      <div className="absolute bottom-6 inset-x-0 mx-auto w-fit max-w-[calc(100vw-2rem)] z-20 bg-slate-900/90 backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl border border-white/15 flex items-center gap-1.5 text-white">
        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePause}
          title={isPaused ? "Resume Simulation" : "Pause Simulation"}
          className="size-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
        >
          {isPaused ? <Play size={16} weight="fill" className="text-emerald-400" /> : <Pause size={16} weight="fill" />}
        </button>

        {/* Speed Multiplier */}
        <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-white/10">
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSimSpeed(s)}
              className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer ${
                simSpeed === s ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-white/15 mx-0.5" />

        {/* Quick Demo: Spawn Ghost Car */}
        <button
          type="button"
          onClick={() => {
            const randomSt = stations[Math.floor(Math.random() * stations.length)] || sampleStation;
            spawnGhostCar(randomSt);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs shadow-md transition cursor-pointer"
        >
          <Car size={15} weight="fill" />
          <span>+ Ghost Car</span>
        </button>

        {/* Quick Demo: Rush Hour (4 cars) */}
        <button
          type="button"
          onClick={() => triggerRushHour(stations.slice(0, 4))}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-xs shadow-md transition cursor-pointer"
        >
          <Lightning size={15} weight="fill" className="text-amber-300" />
          <span className="hidden sm:inline">Rush Hour</span>
        </button>

        {/* Quick Demo: Shrink 5 Min Countdown */}
        <button
          type="button"
          onClick={() => shrinkWaitTimes(5)}
          title="Manually shrink waiting time by 5 minutes across all stations"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs shadow-md transition cursor-pointer"
        >
          <Clock size={15} weight="fill" />
          <span>Shrink 5m</span>
        </button>

        {/* Quick Demo: Free Charger */}
        <button
          type="button"
          onClick={() => {
            if (sampleStation?.id) freeStationCharger(sampleStation.id);
          }}
          title="Free up chargers at nearest station"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs shadow-md transition cursor-pointer"
        >
          <CheckCircle size={15} weight="fill" />
          <span className="hidden sm:inline">Free Bay</span>
        </button>

        <div className="h-5 w-px bg-white/15 mx-0.5" />

        {/* Full Suite Modal Trigger */}
        <button
          type="button"
          onClick={() => setPresentationOpen(true)}
          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition cursor-pointer"
        >
          Suite
        </button>
      </div>

      {/* 2. FULL INTERACTIVE PRESENTATION & TESTING MODAL */}
      {presentationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-white/20 text-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/10 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Sparkle size={22} weight="fill" className="text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-white">
                      EVspark Presentation & Demo Suite
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                      Judge & Pitch Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Live digital twin simulator, dynamic queue stacking validation, and architecture guides
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPresentationOpen(false)}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Nav Tabs */}
            <div className="flex border-b border-white/10 bg-slate-950/50 px-5 gap-2 text-xs font-bold">
              {[
                { id: "pitch" as const, label: "Presentation Pitch", icon: ChartLineUp },
                { id: "tests" as const, label: "Automated Tests (7)", icon: Flask },
                { id: "fleet" as const, label: `Live Ghost Fleet (${activeGhostsCount})`, icon: Car },
                { id: "gallery" as const, label: "HD Station Gallery", icon: ImageIcon },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-3.5 px-3 border-b-2 transition cursor-pointer ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-400 font-extrabold"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={16} weight={activeTab === tab.id ? "fill" : "regular"} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: PRESENTATION PITCH & ARCHITECTURE */}
              {activeTab === "pitch" && (
                <div className="space-y-6">
                  {/* Problem & Solution Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/20 space-y-2">
                      <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                        <Warning size={16} weight="fill" />
                        <span>The Problem: Blind Queuing</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Drivers arrive at EV stations only to find a 45-minute queue with no advance warning.
                        Static maps show "Available" when 5 cars are already 2 minutes away on the highway!
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <CheckCircle size={16} weight="fill" />
                        <span>The EVspark Solution</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Digital Twin physics engine with vehicle telemetry heading prediction. EVspark
                        knows when incoming cars will arrive, pre-allocates bays, and stacks wait times in real time.
                      </p>
                    </div>
                  </div>

                  {/* Core 3 Architectural Pillars */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
                      Key Technical Innovations for Judges
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="size-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                          1
                        </div>
                        <h4 className="text-sm font-bold text-white">Ghost Fleet Simulation</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Autonomous virtual vehicles navigating to charging hubs. When they arrive, they physically
                          occupy chargers or join the FIFO queue stack.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="size-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                          2
                        </div>
                        <h4 className="text-sm font-bold text-white">Dynamic Queue Stacking</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Initial full station gets 15/20/25/30m wait time. When another vehicle arrives, wait time
                          stacks (+15 min each), providing honest real-world ETA.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          3
                        </div>
                        <h4 className="text-sm font-bold text-white">Smart 5m Time Shrinkage</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Wait time decrements dynamically every minute by 5-minute intervals. Once count hits 0m,
                          the charger opens and reverts cleanly to "Free station available"!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Speaker Script Checklist */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/30 border border-blue-500/30 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">
                      30-Second Live Pitch Script
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed italic">
                      "Notice the map markers: green pins display 'Free station available'. Watch as I spawn a ghost car:
                      the vehicle approaches BKC Hub with live heading and headlights. When it docks, the free charger count
                      drops. When all chargers fill, the waiting time initializes at 20 mins. If a second car arrives, the queue
                      stacks to 35 mins! As vehicles finish, the timer shrinks 5 minutes dynamically until chargers free up."
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 2: IN-BROWSER AUTOMATED TESTS */}
              {activeTab === "tests" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <h3 className="text-sm font-bold text-white">Automated Integration Verification Suite</h3>
                      <p className="text-xs text-slate-400">
                        Target Station: <span className="text-blue-400 font-semibold">{sampleStation.name}</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isRunningTests}
                      onClick={() =>
                        runAutomatedTests({
                          id: sampleStation.id,
                          name: sampleStation.name,
                          lat: sampleStation.lat,
                          lng: sampleStation.lng,
                          totalChargers: 4,
                        })
                      }
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isRunningTests ? (
                        <>
                          <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Running Assertions…</span>
                        </>
                      ) : (
                        <>
                          <Play size={16} weight="fill" />
                          <span>Run All 7 Automated Tests</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Test Cases List */}
                  <div className="space-y-2">
                    {testResults.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          {t.status === "passed" && (
                            <CheckCircle size={22} weight="fill" className="text-emerald-400 shrink-0" />
                          )}
                          {t.status === "failed" && (
                            <XCircle size={22} weight="fill" className="text-rose-400 shrink-0" />
                          )}
                          {t.status === "running" && (
                            <div className="size-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
                          )}
                          {t.status === "pending" && (
                            <div className="size-5 rounded-full border-2 border-slate-600 shrink-0" />
                          )}

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-400">{t.id}</span>
                              <h4 className="text-xs font-bold text-white">{t.name}</h4>
                            </div>
                            <p className="text-[11px] text-slate-400">{t.description}</p>
                            {t.details && (
                              <p className="text-[11px] font-mono text-emerald-300 mt-0.5">
                                Assertion: {t.details}
                              </p>
                            )}
                          </div>
                        </div>

                        {t.durationMs !== undefined && (
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            {t.durationMs}ms
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Test Log Output Console */}
                  {testLog.length > 0 && (
                    <div className="rounded-2xl bg-black border border-white/15 p-4 font-mono text-[11px] text-emerald-400 max-h-48 overflow-y-auto space-y-1">
                      <div className="text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-white/10">
                        Execution Console Log
                      </div>
                      {testLog.map((line, idx) => (
                        <div key={idx} className={line.includes("FAIL") ? "text-rose-400" : ""}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LIVE GHOST FLEET */}
              {activeTab === "fleet" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Active Autonomous Ghost Fleet</h3>
                      <p className="text-xs text-slate-400">
                        {ghosts.length} vehicles currently in transit or docked across stations
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const randomSt = stations[Math.floor(Math.random() * stations.length)] || sampleStation;
                        spawnGhostCar(randomSt);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold cursor-pointer"
                    >
                      + Spawn Additional Ghost Car
                    </button>
                  </div>

                  {ghosts.length === 0 ? (
                    <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/10 space-y-2">
                      <Car size={32} className="mx-auto text-slate-500" />
                      <p className="text-xs text-slate-400">No active ghost cars right now.</p>
                      <button
                        type="button"
                        onClick={() => triggerRushHour(stations.slice(0, 4))}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-xs font-bold cursor-pointer"
                      >
                        Launch 4 Rush Hour Cars
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ghosts.map((g) => (
                        <div
                          key={g.id}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold">
                              <Car size={18} weight="fill" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{g.model}</span>
                                <span className="font-mono text-[10px] text-slate-400 bg-white/10 px-1.5 py-0.5 rounded">
                                  {g.plate}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Target: <span className="text-blue-300 font-semibold">{g.targetStationName}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex items-center gap-2">
                            <span className="font-semibold text-emerald-400 font-mono">
                              ⚡ {g.batterySoc}% SoC
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                g.status === "docked_charging"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : g.status === "waiting_in_stack"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-blue-500/20 text-blue-300"
                              }`}
                            >
                              {g.status === "docked_charging"
                                ? "Docked Charging"
                                : g.status === "waiting_in_stack"
                                ? `Queue #${g.queueIndex || 1}`
                                : "En Route"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: HD STATION GALLERY */}
              {activeTab === "gallery" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Verified EV Charging Infrastructure Gallery</h3>
                    <p className="text-xs text-slate-400">
                      Curated photography collection applied across all stations on the map
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {CURATED_EV_PHOTOS.map((photo, i) => (
                      <div
                        key={i}
                        className="group relative rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shadow-lg"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt={photo.caption}
                          className="h-36 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-2.5 flex flex-col justify-between">
                          <span className="self-start px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-emerald-400 border border-white/10">
                            {photo.tag}
                          </span>
                          <p className="text-[10px] font-bold text-white leading-tight line-clamp-2">
                            {photo.caption}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Simulation Active • Time Shrink interval: {60 / (simSpeed || 1)}s</span>
              </div>

              <button
                type="button"
                onClick={() => setPresentationOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition cursor-pointer"
              >
                Close & Return to Map
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
