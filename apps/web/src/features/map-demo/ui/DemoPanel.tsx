"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  ArrowCounterClockwise,
  Lightning,
  Car,
  User,
  Info,
  X,
  WarningCircle,
  Clock,
  Sparkle,
  CheckCircle,
  XCircle,
  Flask,
  MagnifyingGlass,
  ArrowClockwise,
} from "@phosphor-icons/react";
import { useMapDemo } from "./useMapDemo";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DEMO_CASES, type DemoCase, type CaseResult } from "@evspark/shared";

const PRESETS = [
  { key: "empty", label: "1. Empty → first car (default)" },
  { key: "free_charger", label: "2. Free charger (direct to bay)" },
  { key: "fill_chargers", label: "3. Fill all chargers" },
  { key: "overflow", label: "4. Overflow → Waiting queue" },
  { key: "other_jobs", label: "5. Other jobs (visitor discard)" },
  { key: "tired_waiting", label: "6. Tired of waiting (reneging)" },
  { key: "balk", label: "7. Waiting full (balking)" },
  { key: "charger_fault", label: "8. Charger fault & re-queue" },
  { key: "rush_hour", label: "9. Rush hour (3× arrival rate)" },
  { key: "visitors_only", label: "10. Visitors only (100% stayers)" },
  { key: "shrunken_fence", label: "11. Shrunken fence clearance" },
];

export function DemoPanel() {
  const {
    state,
    paused,
    speed,
    arrivalMeanS,
    chargerShare,
    colorMode,
    currentPreset,
    stations,
    log,
    togglePause,
    setSpeed,
    setArrivalMeanS,
    setChargerShare,
    setColorMode,
    reset,
    forceSpawn,
    toggleFault,
    rushHour,
    runPreset,
    stop,
  } = useMapDemo();

  const [activeTab, setActiveTab] = useState<"controls" | "stations" | "log" | "tests">("controls");
  const [minimized, setMinimized] = useState(false);
  const [testFilter, setTestFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [testResults, setTestResults] = useState<Record<string, CaseResult>>(() => {
    const initial: Record<string, CaseResult> = {};
    for (const c of DEMO_CASES) {
      try {
        initial[c.id] = c.run();
      } catch (err) {
        initial[c.id] = { pass: false, detail: err instanceof Error ? err.message : "Error" };
      }
    }
    return initial;
  });
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [isRunningAllTests, setIsRunningAllTests] = useState<boolean>(false);

  const handleRunAllTests = async () => {
    if (isRunningAllTests) return;
    setIsRunningAllTests(true);
    for (const c of DEMO_CASES) {
      setRunningTestId(c.id);
      await new Promise((r) => setTimeout(r, 20));
      try {
        const res = c.run();
        setTestResults((prev) => ({ ...prev, [c.id]: res }));
      } catch (err) {
        setTestResults((prev) => ({
          ...prev,
          [c.id]: { pass: false, detail: err instanceof Error ? err.message : "Case failed" },
        }));
      }
    }
    setRunningTestId(null);
    setIsRunningAllTests(false);
  };

  const handleRunSingleTest = (c: DemoCase) => {
    setRunningTestId(c.id);
    setTimeout(() => {
      try {
        const res = c.run();
        setTestResults((prev) => ({ ...prev, [c.id]: res }));
      } catch (err) {
        setTestResults((prev) => ({
          ...prev,
          [c.id]: { pass: false, detail: err instanceof Error ? err.message : "Case failed" },
        }));
      } finally {
        setRunningTestId(null);
      }
    }, 40);
  };

  const passCount = Object.values(testResults).filter((r) => r.pass).length;
  const filteredCases = DEMO_CASES.filter((c) => {
    const matchesGroup = testFilter === "All" || c.group === testFilter;
    const matchesSearch =
      !searchQuery ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  if (state !== "running" && state !== "loading") return null;

  return (
    <div
      role="region"
      aria-label="Simulation Demo Panel"
      className="absolute bottom-4 left-4 z-30 w-full max-w-[420px] max-h-[85vh] flex flex-col bg-white border border-[#DADCE0] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] text-[#202124] overflow-hidden select-none transition-all"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F8F9FA] border-b border-[#DADCE0]">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
            <span className="size-2 rounded-full bg-[#1A73E8] animate-pulse" />
            Simulated demo
          </span>

          {/* How It Works Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="How it works"
                className="text-[#5F6368] hover:text-[#202124] p-1 rounded-full hover:bg-[#E8EAED] transition-colors"
              >
                <Info size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-80 p-4 text-xs bg-white text-[#202124] border border-[#DADCE0] shadow-xl rounded-xl z-50 space-y-2.5"
            >
              <h4 className="font-bold text-sm text-[#1A73E8] flex items-center gap-1.5">
                <Sparkle size={16} weight="fill" />
                How the Geofence Demo Works
              </h4>
              <p className="text-[11px] text-[#5F6368] leading-relaxed">
                <strong>1. Road Clearance:</strong> Fences dynamically shrink (and shift away if needed) so they never overlap adjacent roads.
              </p>
              <p className="text-[11px] text-[#5F6368] leading-relaxed">
                <strong>2. Dual Queues:</strong> <em>Charging queue</em> holds only cars with reserved bays. Overflow joins the <em>Waiting queue</em>.
              </p>
              <p className="text-[11px] text-[#5F6368] leading-relaxed">
                <strong>3. Intent Detection:</strong> Platforms cannot read minds. When offered a charger, if a car doesn't plug in within grace time, it is classified <em>Other jobs</em> and discarded.
              </p>
              <p className="text-[11px] text-[#5F6368] leading-relaxed">
                <strong>4. Time Compression:</strong> 1 real second = 20 simulation seconds.
              </p>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            className="text-xs px-2 py-0.5 text-[#5F6368] hover:bg-[#E8EAED] rounded font-medium"
          >
            {minimized ? "Expand" : "Minimize"}
          </button>
          <button
            type="button"
            onClick={stop}
            aria-label="Close demo"
            className="text-[#5F6368] hover:text-[#D93025] p-1 rounded-full hover:bg-[#FCE8E6] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Navigation Tabs */}
          <div className="flex border-b border-[#DADCE0] bg-white text-xs font-semibold text-[#5F6368]">
            <button
              type="button"
              onClick={() => setActiveTab("controls")}
              className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                activeTab === "controls"
                  ? "border-[#1A73E8] text-[#1A73E8] bg-[#F8F9FA]"
                  : "border-transparent hover:text-[#202124]"
              }`}
            >
              Controls
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stations")}
              className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                activeTab === "stations"
                  ? "border-[#1A73E8] text-[#1A73E8] bg-[#F8F9FA]"
                  : "border-transparent hover:text-[#202124]"
              }`}
            >
              Stations ({stations.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("log")}
              className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                activeTab === "log"
                  ? "border-[#1A73E8] text-[#1A73E8] bg-[#F8F9FA]"
                  : "border-transparent hover:text-[#202124]"
              }`}
            >
              Events ({log.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tests")}
              className={`flex-1 py-2 text-center border-b-2 transition-colors flex items-center justify-center gap-1 ${
                activeTab === "tests"
                  ? "border-[#1A73E8] text-[#1A73E8] bg-[#F8F9FA]"
                  : "border-transparent hover:text-[#202124]"
              }`}
            >
              <Flask size={13} weight={activeTab === "tests" ? "fill" : "regular"} />
              Tests ({passCount}/{DEMO_CASES.length})
            </button>
          </div>

          {/* Tab 1: Controls */}
          {activeTab === "controls" && (
            <div className="p-3.5 space-y-3.5 overflow-y-auto max-h-[50vh]">
              {/* Preset Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#5F6368] uppercase mb-1">
                  Scenario Preset
                </label>
                <select
                  value={currentPreset}
                  onChange={(e) => runPreset(e.target.value)}
                  className="w-full text-xs font-medium py-1.5 px-2 bg-[#F8F9FA] border border-[#DADCE0] rounded-lg text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
                >
                  {PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Main Playback Bar */}
              <div className="flex items-center justify-between gap-1 p-1 bg-[#F1F3F4] rounded-xl">
                <button
                  type="button"
                  onClick={togglePause}
                  className="p-1.5 rounded-lg bg-white shadow-sm text-[#202124] hover:bg-[#F8F9FA] font-bold text-xs flex items-center gap-1"
                >
                  {paused ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />}
                  {paused ? "Play" : "Pause"}
                </button>

                <div className="flex items-center gap-0.5">
                  {([1, 2, 5, 10] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                        speed === s
                          ? "bg-[#1A73E8] text-white"
                          : "text-[#5F6368] hover:text-[#202124]"
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
                  className="p-1.5 rounded-lg text-[#5F6368] hover:text-[#202124] hover:bg-white"
                >
                  <ArrowCounterClockwise size={14} />
                </button>
              </div>

              {/* Quick Spawns & Rush Hour */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => forceSpawn("CHARGER")}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6] text-xs font-semibold hover:bg-[#CEEAD6] transition-colors"
                >
                  <Car size={14} weight="bold" />
                  + Charger
                </button>

                <button
                  type="button"
                  onClick={() => forceSpawn("STAYER")}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#F3E8FD] text-[#8430CE] border border-[#E9D2FD] text-xs font-semibold hover:bg-[#E9D2FD] transition-colors"
                >
                  <User size={14} weight="bold" />
                  + Visitor
                </button>

                <button
                  type="button"
                  onClick={rushHour}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#FEF7E0] text-[#B06000] border border-[#FEEFC3] text-xs font-semibold hover:bg-[#FEEFC3] transition-colors"
                >
                  <Lightning size={14} weight="fill" />
                  Rush Hour
                </button>
              </div>

              {/* Sliders */}
              <div className="space-y-2 pt-1 border-t border-[#DADCE0]">
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-[#5F6368] mb-1">
                    <span>Arrival Interval</span>
                    <span className="font-bold text-[#202124]">~{Math.round(arrivalMeanS)}s</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="60"
                    step="1"
                    value={arrivalMeanS}
                    onChange={(e) => setArrivalMeanS(Number(e.target.value))}
                    className="w-full accent-[#1A73E8] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-medium text-[#5F6368] mb-1">
                    <span>Charging Intent Share</span>
                    <span className="font-bold text-[#202124]">{Math.round(chargerShare * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={chargerShare}
                    onChange={(e) => setChargerShare(Number(e.target.value))}
                    className="w-full accent-[#1A73E8] cursor-pointer"
                  />
                </div>
              </div>

              {/* Color Mode Switch & Legend */}
              <div className="pt-2 border-t border-[#DADCE0] flex items-center justify-between text-xs">
                <span className="font-semibold text-[#5F6368]">Show True Intent (Truth)</span>
                <button
                  type="button"
                  onClick={() => setColorMode(colorMode === "system" ? "truth" : "system")}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    colorMode === "truth" ? "bg-[#1A73E8]" : "bg-[#BDC1C6]"
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                      colorMode === "truth" ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Compact Legend */}
              <div className="p-2 bg-[#F8F9FA] rounded-lg text-[10px] text-[#5F6368] space-y-1">
                <div className="font-bold uppercase text-[9px] text-[#80868B]">Legend</div>
                {colorMode === "system" ? (
                  <div className="grid grid-cols-2 gap-1">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[#16a34a]" /> Charging
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[#f59e0b]" /> Waiting
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[#64748b]" /> Approaching
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-sm border border-[#7c3aed]" /> Other jobs
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1">
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[#16a34a]" /> Charger Car
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[#7c3aed]" /> Visitor (Stayer)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Stations */}
          {activeTab === "stations" && (
            <div className="p-3 space-y-3 overflow-y-auto max-h-[50vh]">
              {stations.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#5F6368]">
                  Loading demo stations...
                </div>
              ) : (
                stations.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 bg-[#F8F9FA] border border-[#DADCE0] rounded-xl text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#202124]">{st.name}</span>
                      <span className="text-[10px] text-[#1A73E8] font-semibold bg-[#E8F0FE] px-1.5 py-0.5 rounded">
                        Fence {Math.round(st.radiusM)}m · Clr {Math.round(st.clearanceM)}m
                      </span>
                    </div>

                    {st.centerShifted && (
                      <div className="text-[10px] font-semibold text-[#B06000] bg-[#FEF7E0] px-2 py-0.5 rounded flex items-center gap-1">
                        <WarningCircle size={12} weight="bold" />
                        Fence center shifted away from road frontage
                      </div>
                    )}

                    {/* Chargers State with Fault Toggling */}
                    <div>
                      <div className="text-[10px] text-[#5F6368] font-bold uppercase mb-1">
                        Chargers (click to toggle fault)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {st.chargers.map((ch, idx) => {
                          const bg = !ch.online
                            ? "bg-[#FCE8E6] text-[#C5221F] border-[#FAD2CF]"
                            : ch.state === "CHARGING"
                            ? "bg-[#E8F0FE] text-[#1A73E8] border-[#D2E3FC]"
                            : ch.state === "RESERVED"
                            ? "bg-[#FEF7E0] text-[#B06000] border-[#FEEFC3]"
                            : "bg-[#E6F4EA] text-[#137333] border-[#CEEAD6]";

                          return (
                            <button
                              key={ch.idx}
                              type="button"
                              onClick={() => toggleFault(st.id, idx)}
                              title={`Toggle fault on charger #${idx + 1}`}
                              className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer hover:opacity-80 transition-opacity ${bg}`}
                            >
                              #{idx + 1}: {ch.state}
                              {ch.progress > 0 && ` (${Math.round(ch.progress * 100)}%)`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Queue Status */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#DADCE0]">
                      <div className="bg-white p-2 rounded-lg border border-[#E8EAED]">
                        <div className="text-[10px] text-[#5F6368] font-semibold">Charging Queue</div>
                        <div className="text-sm font-bold text-[#137333]">
                          {st.chargingQ} / {st.chargingCap}
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-[#E8EAED]">
                        <div className="text-[10px] text-[#5F6368] font-semibold">Waiting Queue</div>
                        <div className="text-sm font-bold text-[#E37400]">
                          {st.waiting}{" "}
                          <span className="text-[10px] font-normal text-[#5F6368]">
                            (~{st.nextWaitMin ?? "–"} min)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div className="grid grid-cols-4 gap-1 text-[10px] text-center pt-1 border-t border-[#DADCE0] text-[#5F6368]">
                      <div>
                        <div className="font-bold text-[#202124]">{st.stats.served}</div>
                        <div>Served</div>
                      </div>
                      <div>
                        <div className="font-bold text-[#7c3aed]">{st.stats.otherJobs}</div>
                        <div>Other jobs</div>
                      </div>
                      <div>
                        <div className="font-bold text-[#D93025]">{st.stats.reneged}</div>
                        <div>Left</div>
                      </div>
                      <div>
                        <div className="font-bold text-[#5F6368]">{st.stats.balked}</div>
                        <div>Balked</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 3: Live Event Log */}
          {activeTab === "log" && (
            <div
              role="log"
              aria-live="polite"
              aria-label="Simulation event stream"
              className="p-2 space-y-1 overflow-y-auto max-h-[50vh] text-[11px] font-mono"
            >
              {log.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#5F6368]">
                  Waiting for events...
                </div>
              ) : (
                log.map((ev, i) => {
                  const tagColor =
                    ev.type === "PLUG_IN" || ev.type === "CHARGE_DONE"
                      ? "text-[#137333] bg-[#E6F4EA]"
                      : ev.type === "OTHER_JOBS"
                      ? "text-[#8430CE] bg-[#F3E8FD]"
                      : ev.type === "RENEGED" || ev.type === "BALKED" || ev.type === "FAULT"
                      ? "text-[#C5221F] bg-[#FCE8E6]"
                      : "text-[#1A73E8] bg-[#E8F0FE]";

                  return (
                    <div
                      key={`${ev.t}-${i}`}
                      className="p-1.5 rounded bg-[#F8F9FA] border border-[#E8EAED] flex items-start gap-1.5 leading-snug"
                    >
                      <span className="text-[9px] text-[#80868B] shrink-0 mt-0.5">
                        {ev.t.toFixed(1)}s
                      </span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${tagColor}`}
                      >
                        {ev.type}
                      </span>
                      <span className="text-[#202124] break-words">{ev.msg}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 4: 66 Automated Tests Suite */}
          {activeTab === "tests" && (
            <div className="p-3 space-y-2.5 overflow-y-auto max-h-[52vh] text-xs">
              {/* Header Status & Run All Button */}
              <div className="flex items-center justify-between p-2.5 bg-[#F8F9FA] rounded-xl border border-[#DADCE0]">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#E6F4EA] text-[#137333]">
                    <CheckCircle size={18} weight="fill" />
                  </span>
                  <div>
                    <div className="font-bold text-[12px] text-[#202124]">
                      {passCount} of {DEMO_CASES.length} Passing
                    </div>
                    <div className="text-[10px] text-[#5F6368]">
                      Engine invariants & CI assertions
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isRunningAllTests}
                  onClick={handleRunAllTests}
                  className="px-2.5 py-1.5 rounded-lg bg-[#1A73E8] hover:bg-[#1557B0] text-white font-bold text-[11px] shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isRunningAllTests ? (
                    <>
                      <div className="size-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} weight="fill" />
                      <span>Run All</span>
                    </>
                  )}
                </button>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                {[
                  "All",
                  "Geometry",
                  "Movement",
                  "Queue",
                  "Wait time",
                  "Faults",
                  "Clock",
                  "Sanity",
                  "Checked in CI / E2E",
                ].map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setTestFilter(grp)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 transition-colors ${
                      testFilter === grp
                        ? "bg-[#1A73E8] text-white"
                        : "bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124]"
                    }`}
                  >
                    {grp === "Checked in CI / E2E" ? "CI/E2E" : grp}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlass
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#5F6368]"
                />
                <input
                  type="text"
                  placeholder="Filter by ID (e.g. G1, Q5) or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-[11px] pl-7 pr-3 py-1 bg-[#F8F9FA] border border-[#DADCE0] rounded-lg text-[#202124] focus:outline-none focus:ring-1 focus:ring-[#1A73E8]"
                />
              </div>

              {/* Test List */}
              <div className="space-y-1.5 pt-1">
                {filteredCases.map((c) => {
                  const res = testResults[c.id];
                  const isRunning = runningTestId === c.id;
                  const isPassed = res?.pass ?? false;

                  return (
                    <div
                      key={c.id}
                      className="p-2 rounded-lg bg-[#FAFAFA] border border-[#E8EAED] hover:border-[#DADCE0] transition-colors space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#E8F0FE] text-[#1A73E8] shrink-0">
                            {c.id}
                          </span>
                          <span className="font-semibold text-[11px] text-[#202124] truncate" title={c.title}>
                            {c.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isRunning ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#E8F0FE] text-[#1A73E8]">
                              <div className="size-2 rounded-full border border-[#1A73E8] border-t-transparent animate-spin" />
                              Running
                            </span>
                          ) : isPassed ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#E6F4EA] text-[#137333]">
                              <CheckCircle size={11} weight="fill" />
                              PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FCE8E6] text-[#C5221F]">
                              <XCircle size={11} weight="fill" />
                              FAIL
                            </span>
                          )}

                          <button
                            type="button"
                            title="Re-run test"
                            disabled={isRunning || isRunningAllTests}
                            onClick={() => handleRunSingleTest(c)}
                            className="p-1 rounded text-[#5F6368] hover:text-[#1A73E8] hover:bg-[#E8EAED] transition cursor-pointer"
                          >
                            <ArrowClockwise size={12} />
                          </button>
                        </div>
                      </div>

                      {res?.detail && (
                        <div className="text-[10px] font-mono text-[#5F6368] bg-[#F1F3F4] px-2 py-1 rounded break-words">
                          {res.detail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
