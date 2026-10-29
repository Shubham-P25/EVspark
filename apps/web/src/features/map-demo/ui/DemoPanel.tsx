"use client";

import React, { useState } from "react";
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
  WarningCircle,
} from "@phosphor-icons/react";
import { useMapDemo, LIVE_TEST_CASES } from "./useMapDemo";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export function DemoPanel() {
  const {
    state,
    paused,
    speed,
    stations,
    log,
    testResults,
    runningTestId,
    activeTestNarrative,
    togglePause,
    setSpeed,
    reset,
    forceSpawn,
    toggleFault,
    runLiveTestCase,
    runAllLiveTestCases,
    stop,
  } = useMapDemo();

  const [activeTab, setActiveTab] = useState<"tests" | "stations" | "log">("tests");
  const [minimized, setMinimized] = useState(false);

  if (state !== "running" && state !== "loading") return null;

  const currentStation = stations[0];
  const passedCount = Object.values(testResults).filter((r) => r.status === "passed").length;
  const totalCount = LIVE_TEST_CASES.length;
  const progressPercent = Math.round((passedCount / totalCount) * 100);

  return (
    <div
      role="region"
      aria-label="Simulation Demo Panel"
      className="absolute bottom-4 left-4 z-30 w-full max-w-[560px] max-h-[90vh] flex flex-col bg-white border border-[#CBD5E1] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] text-[#1E293B] overflow-hidden select-none transition-all font-sans"
    >
      {/* 1. Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
            <span className="size-2.5 rounded-full bg-[#2563EB] animate-pulse" />
            Digital Twin Simulation (3-Bay Hub)
          </span>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="How it works"
                className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-full hover:bg-[#E2E8F0] transition-colors"
              >
                <Info size={18} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-88 p-4 text-xs bg-white text-[#1E293B] border border-[#CBD5E1] shadow-2xl rounded-xl z-50 space-y-2.5"
            >
              <h4 className="font-extrabold text-sm text-[#1D4ED8] flex items-center gap-1.5">
                <Sparkle size={18} weight="fill" />
                Senior Geofence Test Engine
              </h4>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong>1. Fast Demo Charging:</strong> EV charging completes in 15-20s for live visual feedback.
              </p>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong>2. Dynamic Queuing:</strong> Active chargers turn bright green; queued cars turn amber and wait in bays.
              </p>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong>3. Anti-Collision:</strong> Dual-lane geometry and lateral offset ensure 0 collisions.
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
          {/* 2. Top Playback & Vehicle Spawner Controls */}
          <div className="p-3.5 bg-white border-b border-[#E2E8F0] space-y-3">
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
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-white border border-transparent hover:border-[#CBD5E1] transition-all"
              >
                <ArrowCounterClockwise size={16} />
              </button>
            </div>

            {/* Spawner Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => forceSpawn("CHARGER")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-xs font-bold hover:bg-[#D1FAE5] active:scale-[0.98] transition-all shadow-sm"
              >
                <Car size={18} weight="fill" />
                <span>+ Spawn Charging EV</span>
              </button>

              <button
                type="button"
                onClick={() => forceSpawn("STAYER")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE] text-xs font-bold hover:bg-[#E0E7FF] active:scale-[0.98] transition-all shadow-sm"
              >
                <User size={18} weight="bold" />
                <span>+ Spawn Visitor Car</span>
              </button>
            </div>
          </div>

          {/* 3. Station Real-Time KPI Cards (HUD) */}
          {currentStation && (
            <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between text-xs font-extrabold text-[#0F172A] mb-2">
                <span className="flex items-center gap-1.5">
                  <Queue size={16} className="text-[#2563EB]" />
                  Telemetry Inside Fence: {currentStation.insideFenceCount} Total Vehicles
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] text-xs font-bold">
                  <Clock size={13} weight="bold" />
                  Avg Wait: ~{currentStation.nextWaitMin} min
                </span>
              </div>

              {/* 4 Prominent Stat Cards */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-center">
                  <span className="text-[10px] font-bold text-[#065F46] block uppercase tracking-wider">Bays Active</span>
                  <span className="text-base font-black text-[#047857]">{currentStation.chargingQ} / 3</span>
                </div>
                <div className="p-2 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-center">
                  <span className="text-[10px] font-bold text-[#92400E] block uppercase tracking-wider">In Queue</span>
                  <span className="text-base font-black text-[#B45309]">{currentStation.waiting}</span>
                </div>
                <div className="p-2 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-center">
                  <span className="text-[10px] font-bold text-[#3730A3] block uppercase tracking-wider">Visitor</span>
                  <span className="text-base font-black text-[#4338CA]">
                    {Math.max(0, currentStation.insideFenceCount - currentStation.chargingQ - currentStation.waiting)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[#F1F5F9] border border-[#CBD5E1] text-center">
                  <span className="text-[10px] font-bold text-[#475569] block uppercase tracking-wider">Road Standby</span>
                  <span className="text-base font-black text-[#334155]">{currentStation.standbyRoadCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Active Live Test Scenario Execution Banner */}
          {activeTestNarrative && (
            <div className="px-4 py-2 bg-[#FEF08A] text-[#854D0E] text-xs font-bold flex items-center gap-2 border-b border-[#FDE047] animate-pulse">
              <Sparkle size={16} weight="fill" className="text-[#CA8A04] shrink-0" />
              <span className="truncate">{activeTestNarrative}</span>
            </div>
          )}

          {/* 4. Tab Navigation */}
          <div className="flex border-b border-[#E2E8F0] bg-white text-xs font-bold text-[#64748B]">
            <button
              type="button"
              onClick={() => setActiveTab("tests")}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "tests"
                  ? "border-[#2563EB] text-[#2563EB] bg-[#F8FAFC]"
                  : "border-transparent hover:text-[#0F172A]"
              }`}
            >
              <Flask size={16} weight={activeTab === "tests" ? "fill" : "regular"} />
              Live Tests ({passedCount}/{totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stations")}
              className={`flex-1 py-2.5 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "stations"
                  ? "border-[#2563EB] text-[#2563EB] bg-[#F8FAFC]"
                  : "border-transparent hover:text-[#0F172A]"
              }`}
            >
              <Lightning size={16} weight={activeTab === "stations" ? "fill" : "regular"} />
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

          {/* 5. Tab Panels */}
          <div className="overflow-y-auto max-h-[46vh] p-3.5 space-y-3">
            {/* Tab: Live Interactive Test Cases */}
            {activeTab === "tests" && (
              <div className="space-y-3">
                {/* Progress Summary Banner */}
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#0F172A]">
                      Interactive Test Suite ({passedCount}/{totalCount} Passed)
                    </span>
                    <button
                      type="button"
                      onClick={runAllLiveTestCases}
                      disabled={runningTestId !== null}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
                    >
                      {runningTestId !== null ? "Running Suite..." : "Run All 10 Tests"}
                    </button>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#10B981] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* 10 Test Cards */}
                {LIVE_TEST_CASES.map((tc) => {
                  const res = testResults[tc.id] || { status: "idle", detail: "Ready to run" };
                  const isRunning = runningTestId === tc.id;

                  return (
                    <div
                      key={tc.id}
                      className="p-3 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#94A3B8] transition-all space-y-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#334155] border border-[#E2E8F0]">
                              {tc.id}
                            </span>
                            <h4 className="text-xs font-extrabold text-[#0F172A]">{tc.title}</h4>
                          </div>
                          <p className="text-xs text-[#64748B] leading-relaxed">{tc.desc}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => runLiveTestCase(tc.id)}
                          disabled={runningTestId !== null}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] text-xs font-bold disabled:opacity-40 transition-colors border border-[#BFDBFE]"
                        >
                          <PlayCircle size={16} weight="fill" />
                          <span>{isRunning ? "Running..." : "Run Test"}</span>
                        </button>
                      </div>

                      {/* Result State & Detail */}
                      <div className="flex items-center gap-2 pt-2 text-xs border-t border-[#F1F5F9]">
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
            )}

            {/* Tab: Charger Bays Controls & Fault Injection */}
            {activeTab === "stations" && currentStation && (
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
                  Hardware Charger Bays (3 Bays)
                </span>
                <div className="space-y-2">
                  {currentStation.chargers.map((ch, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs shadow-sm"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-[#0F172A] text-sm">Bay {idx + 1}</span>
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
                        {ch.online ? "Trip Fault" : "Restore Bay"}
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
