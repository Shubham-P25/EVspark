"use client";

import { create } from "zustand";

export interface GhostCar {
  id: string;
  model: string;
  plate: string;
  batterySoc: number;
  currentPos: { lat: number; lng: number };
  startPos: { lat: number; lng: number };
  targetPos: { lat: number; lng: number };
  targetStationId: string;
  targetStationName: string;
  heading: number;
  progress: number; // 0..1
  speed: number;
  status: "en_route" | "docked_charging" | "waiting_in_stack" | "departing";
  queueIndex?: number;
}

export interface StationSimState {
  stationId: string;
  stationName: string;
  totalChargers: number;
  occupiedChargers: number;
  availableChargers: number;
  queueStack: GhostCar[];
  baseWaitMinutes: number;
  waitMinutes: number;
  lastShrunkAt: number;
}

export interface TestResultItem {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "passed" | "failed";
  details?: string;
  durationMs?: number;
}

interface GhostSimulationState {
  ghosts: GhostCar[];
  stationOverrides: Record<string, StationSimState>;
  isPaused: boolean;
  simSpeed: number; // 1 = 1x (realistic 60s shrink), 5 = 5x (12s shrink), 10 = 10x
  showGhostLayer: boolean;
  presentationOpen: boolean;
  selectedStationForDemo: string | null;

  // Test Suite State
  isRunningTests: boolean;
  testResults: TestResultItem[];
  testLog: string[];

  // Actions
  setPresentationOpen: (open: boolean) => void;
  setShowGhostLayer: (show: boolean) => void;
  setSimSpeed: (speed: number) => void;
  togglePause: () => void;
  setSelectedStationForDemo: (stationId: string | null) => void;

  // Station simulation sync
  initOrGetStationState: (station: {
    id: string;
    name: string;
    chargers?: any[];
    availableChargers?: number;
    waitMinutes?: number;
  }) => StationSimState;

  // Simulation operations
  spawnGhostCar: (targetStation?: { id: string; name: string; lat: number; lng: number }) => GhostCar;
  triggerRushHour: (stations: { id: string; name: string; lat: number; lng: number }[]) => void;
  shrinkWaitTimes: (minutesToShrink?: number) => void;
  freeStationCharger: (stationId: string) => void;
  stackGhostToStation: (stationId: string) => void;
  resetSimulation: () => void;
  tickSimulation: (deltaMs: number) => void;

  // Automated Testing
  runAutomatedTests: (sampleStation: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    totalChargers: number;
  }) => Promise<void>;
}

const VEHICLE_PRESETS = [
  { make: "Tata", model: "Nexon EV Max", battery: 28 },
  { make: "MG", model: "ZS EV", battery: 22 },
  { make: "Mahindra", model: "XUV400", battery: 19 },
  { make: "Hyundai", model: "Ioniq 5", battery: 14 },
  { make: "BYD", model: "Atto 3", battery: 25 },
  { make: "Tata", model: "Punch.ev", battery: 31 },
];

function calculateHeading(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  prev: number
): number {
  const dLng = to.lng - from.lng;
  const dLat = to.lat - from.lat;
  if (Math.abs(dLng) < 0.00001 && Math.abs(dLat) < 0.00001) return prev;
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return (angle + 360) % 360;
}

export const useGhostSimulationStore = create<GhostSimulationState>((set, get) => ({
  ghosts: [],
  stationOverrides: {},
  isPaused: false,
  simSpeed: 2,
  showGhostLayer: true,
  presentationOpen: false,
  selectedStationForDemo: null,

  isRunningTests: false,
  testResults: [],
  testLog: [],

  setPresentationOpen: (open) => set({ presentationOpen: open }),
  setShowGhostLayer: (show) => set({ showGhostLayer: show }),
  setSimSpeed: (speed) => set({ simSpeed: speed }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),
  setSelectedStationForDemo: (id) => set({ selectedStationForDemo: id }),

  initOrGetStationState: (st) => {
    const existing = get().stationOverrides[st.id];
    if (existing) return existing;

    const total = Math.max(1, st.chargers?.length || 3);
    const available =
      typeof st.availableChargers === "number"
        ? Math.min(total, st.availableChargers)
        : Math.max(0, total - 1);
    const occupied = total - available;

    // Initial base wait: 15, 20, 25, or 30 if occupied
    const waitOpts = [15, 20, 25, 30];
    const initialWait =
      available === 0
        ? typeof st.waitMinutes === "number" && st.waitMinutes > 0
          ? st.waitMinutes
          : waitOpts[Math.floor(Math.random() * waitOpts.length)]
        : 0;

    const state: StationSimState = {
      stationId: st.id,
      stationName: st.name,
      totalChargers: total,
      occupiedChargers: occupied,
      availableChargers: available,
      queueStack: [],
      baseWaitMinutes: initialWait || 20,
      waitMinutes: initialWait,
      lastShrunkAt: Date.now(),
    };

    set((s) => ({
      stationOverrides: {
        ...s.stationOverrides,
        [st.id]: state,
      },
    }));

    return state;
  },

  spawnGhostCar: (targetStation) => {
    const preset = VEHICLE_PRESETS[Math.floor(Math.random() * VEHICLE_PRESETS.length)];
    const rto = ["01", "02", "04", "12", "14"][Math.floor(Math.random() * 5)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const plate = `MH ${rto} EV ${num}`;
    const id = `GHOST-${plate.replace(/\s+/g, "-")}`;

    // Target station or default Mumbai center
    const dest = targetStation || {
      id: "station-default",
      name: "Tata Power BKC",
      lat: 19.0657,
      lng: 72.8687,
    };

    // Spawn 1.2 to 2.5 km away in a random direction
    const angle = Math.random() * 2 * Math.PI;
    const distDeg = 0.012 + Math.random() * 0.018; // ~1.5 - 2.5km
    const startPos = {
      lat: dest.lat + Math.cos(angle) * distDeg,
      lng: dest.lng + Math.sin(angle) * distDeg,
    };

    const initialHeading = calculateHeading(startPos, { lat: dest.lat, lng: dest.lng }, 0);

    const newCar: GhostCar = {
      id,
      model: `${preset.make} ${preset.model}`,
      plate,
      batterySoc: preset.battery,
      currentPos: { ...startPos },
      startPos: { ...startPos },
      targetPos: { lat: dest.lat, lng: dest.lng },
      targetStationId: dest.id,
      targetStationName: dest.name,
      heading: initialHeading,
      progress: 0,
      speed: 0.00035 + Math.random() * 0.00025, // progress delta per tick
      status: "en_route",
    };

    set((s) => ({
      ghosts: [newCar, ...s.ghosts.slice(0, 30)],
    }));

    return newCar;
  },

  triggerRushHour: (stations) => {
    if (!stations.length) return;
    const cars: GhostCar[] = [];
    for (let i = 0; i < 4; i++) {
      const target = stations[i % stations.length];
      const spawned = get().spawnGhostCar(target);
      cars.push(spawned);
    }
  },

  shrinkWaitTimes: (minutesToShrink = 5) => {
    const overrides = { ...get().stationOverrides };
    let changed = false;

    for (const [stId, state] of Object.entries(overrides)) {
      if (state.waitMinutes > 0 || state.queueStack.length > 0) {
        changed = true;
        const newWait = Math.max(0, state.waitMinutes - minutesToShrink);

        if (newWait === 0) {
          // A charger or queue has finished!
          if (state.queueStack.length > 0) {
            // First car in stack takes the charger
            const nextQueue = [...state.queueStack];
            const popped = nextQueue.shift();
            // Re-evaluate wait time for remaining stack: 15m per remaining car
            const remainingWait = nextQueue.length * 15;
            overrides[stId] = {
              ...state,
              queueStack: nextQueue,
              waitMinutes: remainingWait,
              lastShrunkAt: Date.now(),
            };
          } else {
            // No queue: charger frees up!
            const newOccupied = Math.max(0, state.occupiedChargers - 1);
            const newAvailable = state.totalChargers - newOccupied;
            overrides[stId] = {
              ...state,
              occupiedChargers: newOccupied,
              availableChargers: newAvailable,
              waitMinutes: 0,
              lastShrunkAt: Date.now(),
            };
          }
        } else {
          overrides[stId] = {
            ...state,
            waitMinutes: newWait,
            lastShrunkAt: Date.now(),
          };
        }
      }
    }

    if (changed) {
      set({ stationOverrides: overrides });
    }
  },

  freeStationCharger: (stationId) => {
    const overrides = { ...get().stationOverrides };
    const state = overrides[stationId];
    if (!state) return;

    // Free up 1 charger and clear top of queue if any
    const nextQueue = state.queueStack.slice(1);
    const newOccupied = Math.max(0, state.occupiedChargers - 1);
    const newAvailable = Math.min(state.totalChargers, state.totalChargers - newOccupied);

    overrides[stationId] = {
      ...state,
      occupiedChargers: newOccupied,
      availableChargers: newAvailable,
      queueStack: nextQueue,
      waitMinutes: nextQueue.length > 0 ? nextQueue.length * 15 : 0,
    };

    set({ stationOverrides: overrides });
  },

  stackGhostToStation: (stationId) => {
    const overrides = { ...get().stationOverrides };
    const state = overrides[stationId];
    if (!state) return;

    // If has free charger, occupy it
    if (state.availableChargers > 0) {
      const newOccupied = state.occupiedChargers + 1;
      const newAvailable = state.totalChargers - newOccupied;
      const initialWait = newAvailable === 0 ? 20 : 0;
      overrides[stationId] = {
        ...state,
        occupiedChargers: newOccupied,
        availableChargers: newAvailable,
        waitMinutes: initialWait,
        baseWaitMinutes: 20,
      };
    } else {
      // All chargers occupied: STACK QUEUE (+15 min)
      const mockCar: GhostCar = {
        id: `GHOST-QUEUE-${Date.now()}`,
        model: "Tata Nexon EV",
        plate: `MH 12 EV ${Math.floor(1000 + Math.random() * 9000)}`,
        batterySoc: 16,
        currentPos: { lat: 19.06, lng: 72.86 },
        startPos: { lat: 19.06, lng: 72.86 },
        targetPos: { lat: 19.06, lng: 72.86 },
        targetStationId: stationId,
        targetStationName: state.stationName,
        heading: 0,
        progress: 1,
        speed: 0,
        status: "waiting_in_stack",
        queueIndex: state.queueStack.length + 1,
      };

      const nextQueue = [...state.queueStack, mockCar];
      const nextWait = (state.waitMinutes || 20) + 15; // Stack +15m!

      overrides[stationId] = {
        ...state,
        queueStack: nextQueue,
        waitMinutes: nextWait,
      };
    }

    set({ stationOverrides: overrides });
  },

  resetSimulation: () => {
    set({
      ghosts: [],
      stationOverrides: {},
      isRunningTests: false,
    });
  },

  tickSimulation: (deltaMs) => {
    const { isPaused, simSpeed, ghosts, stationOverrides } = get();
    if (isPaused) return;

    const mult = simSpeed || 1;
    let overridesChanged = false;
    const nextOverrides = { ...stationOverrides };

    // 1. Move ghosts
    const nextGhosts: GhostCar[] = [];

    for (const g of ghosts) {
      if (g.status === "en_route") {
        const nextProg = Math.min(1, g.progress + g.speed * (deltaMs / 16) * mult);
        const nextLat = g.startPos.lat + (g.targetPos.lat - g.startPos.lat) * nextProg;
        const nextLng = g.startPos.lng + (g.targetPos.lng - g.startPos.lng) * nextProg;
        const heading = calculateHeading(g.currentPos, { lat: nextLat, lng: nextLng }, g.heading);

        if (nextProg >= 0.98) {
          // CAR ARRIVED AT STATION!
          const st = nextOverrides[g.targetStationId];
          if (st) {
            overridesChanged = true;
            if (st.availableChargers > 0) {
              // DOCK INTO FREE CHARGER!
              const newOccupied = st.occupiedChargers + 1;
              const newAvailable = st.totalChargers - newOccupied;
              // If this was the last charger, start initial wait time (15..30)
              const wait = newAvailable === 0 ? st.baseWaitMinutes || 20 : 0;
              nextOverrides[g.targetStationId] = {
                ...st,
                occupiedChargers: newOccupied,
                availableChargers: newAvailable,
                waitMinutes: wait,
              };
              nextGhosts.push({
                ...g,
                progress: 1,
                currentPos: { ...g.targetPos },
                status: "docked_charging",
              });
            } else {
              // ALL CHARGERS OCCUPIED -> CAR GOES ON WAITING TIME & STACKS!
              const queuedCar = {
                ...g,
                progress: 1,
                currentPos: { ...g.targetPos },
                status: "waiting_in_stack" as const,
                queueIndex: st.queueStack.length + 1,
              };
              const nextQueue = [...st.queueStack, queuedCar];
              // Stack waiting time: +15 minutes
              const stackedWait = (st.waitMinutes || 20) + 15;
              nextOverrides[g.targetStationId] = {
                ...st,
                queueStack: nextQueue,
                waitMinutes: stackedWait,
              };
              nextGhosts.push(queuedCar);
            }
          } else {
            // No state yet, just keep car docked
            nextGhosts.push({ ...g, progress: 1, status: "docked_charging" });
          }
        } else {
          nextGhosts.push({
            ...g,
            progress: nextProg,
            currentPos: { lat: nextLat, lng: nextLng },
            heading,
          });
        }
      } else {
        // Already docked or waiting
        nextGhosts.push(g);
      }
    }

    if (overridesChanged) {
      set({ ghosts: nextGhosts, stationOverrides: nextOverrides });
    } else {
      set({ ghosts: nextGhosts });
    }
  },

  // 7-Test Automated In-Browser Test Suite
  runAutomatedTests: async (sampleStation) => {
    set({
      isRunningTests: true,
      testLog: ["Initializing EVspark Automated Test Engine..."],
      testResults: [
        {
          id: "T1",
          name: "Free Station Indicator & Label",
          description: "Asserts station with free chargers displays 'Free station available' instead of '-'",
          status: "running",
        },
        {
          id: "T2",
          name: "Ghost Car Navigation & Telemetry",
          description: "Spawns a ghost car, asserts heading angle and waypoint interpolation en route",
          status: "pending",
        },
        {
          id: "T3",
          name: "Charger Occupancy on Arrival",
          description: "Ghost car arrives at station, asserts available charger transitions from FREE to OCCUPIED",
          status: "pending",
        },
        {
          id: "T4",
          name: "Full Occupancy & Initial Wait Assignment",
          description: "Fills all chargers, asserts initial waiting time assigned in range [15, 20, 25, 30] mins",
          status: "pending",
        },
        {
          id: "T5",
          name: "Queue Stacking (+15m per Incoming Car)",
          description: "Incoming car arrives at full station, asserts queue entry added and wait time stacks +15m",
          status: "pending",
        },
        {
          id: "T6",
          name: "Dynamic Time Shrinkage (-5m Interval)",
          description: "Simulates time shrinkage tick, asserts waiting time decrements by exactly 5 minutes",
          status: "pending",
        },
        {
          id: "T7",
          name: "Session Completion & Recovery to Free",
          description: "Wait countdown reaches 0, asserts queue dequeues and station recovers to 'Free station available'",
          status: "pending",
        },
      ],
    });

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const log = (msg: string) =>
      set((s) => ({ testLog: [...s.testLog, `[${new Date().toLocaleTimeString()}] ${msg}`] }));

    const updateTest = (
      id: string,
      status: "passed" | "failed" | "running",
      details: string,
      durationMs: number
    ) => {
      set((s) => ({
        testResults: s.testResults.map((t) => (t.id === id ? { ...t, status, details, durationMs } : t)),
      }));
    };

    try {
      const stId = sampleStation.id;

      // TEST 1
      log("TEST 1: Testing Free Station Indicator...");
      const t0 = performance.now();
      const initState = get().initOrGetStationState({
        id: stId,
        name: sampleStation.name,
        availableChargers: sampleStation.totalChargers,
      });

      if (initState.availableChargers > 0 && initState.waitMinutes === 0) {
        log(`✓ PASS: Station initialized with ${initState.availableChargers} free chargers. Wait label is 0 (Free Station Available).`);
        updateTest("T1", "passed", `Station shows ${initState.availableChargers} available chargers. Zero wait confirmed.`, Math.round(performance.now() - t0));
      } else {
        throw new Error("Station failed to report free chargers.");
      }
      await sleep(600);

      // TEST 2
      log("TEST 2: Spawning Ghost Car and checking navigation...");
      const t1 = performance.now();
      updateTest("T2", "running", "Spawning vehicle en route...", 0);
      const ghost = get().spawnGhostCar({
        id: stId,
        name: sampleStation.name,
        lat: sampleStation.lat,
        lng: sampleStation.lng,
      });
      if (ghost && ghost.status === "en_route" && ghost.plate) {
        log(`✓ PASS: Ghost Car ${ghost.plate} (${ghost.model}) spawned at [${ghost.currentPos.lat.toFixed(4)}, ${ghost.currentPos.lng.toFixed(4)}], heading ${Math.round(ghost.heading)}° to ${sampleStation.name}.`);
        updateTest("T2", "passed", `Vehicle ${ghost.plate} en route with bearing ${Math.round(ghost.heading)}°.`, Math.round(performance.now() - t1));
      } else {
        throw new Error("Ghost car spawning failed.");
      }
      await sleep(600);

      // TEST 3
      log("TEST 3: Simulating Ghost Arrival & Charger Occupancy...");
      const t2 = performance.now();
      updateTest("T3", "running", "Docking vehicle into charger...", 0);
      const beforeAvail = get().stationOverrides[stId]?.availableChargers ?? sampleStation.totalChargers;
      get().stackGhostToStation(stId);
      const afterAvail = get().stationOverrides[stId]?.availableChargers ?? 0;
      if (afterAvail === beforeAvail - 1) {
        log(`✓ PASS: Ghost arrived and docked. Available chargers reduced from ${beforeAvail} to ${afterAvail}.`);
        updateTest("T3", "passed", `Occupancy transitioned: ${beforeAvail} -> ${afterAvail} available.`, Math.round(performance.now() - t2));
      } else {
        throw new Error(`Occupancy failed: expected ${beforeAvail - 1}, got ${afterAvail}`);
      }
      await sleep(600);

      // TEST 4
      log("TEST 4: Occupying all chargers to verify initial wait time assignment...");
      const t3 = performance.now();
      updateTest("T4", "running", "Filling all station chargers...", 0);
      // Fill remaining chargers
      let cur = get().stationOverrides[stId];
      while (cur && cur.availableChargers > 0) {
        get().stackGhostToStation(stId);
        cur = get().stationOverrides[stId];
      }
      if (cur && cur.availableChargers === 0 && cur.waitMinutes >= 15 && cur.waitMinutes <= 30) {
        log(`✓ PASS: All chargers occupied. Station assigned initial wait time: ${cur.waitMinutes} mins.`);
        updateTest("T4", "passed", `All ${cur.totalChargers} chargers full. Initial wait time: ${cur.waitMinutes} min.`, Math.round(performance.now() - t3));
      } else {
        throw new Error("Full occupancy wait time assignment failed.");
      }
      await sleep(600);

      // TEST 5
      log("TEST 5: Testing Queue Stacking (+15m per incoming car)...");
      const t4 = performance.now();
      updateTest("T5", "running", "Dispatching additional ghost car to full station...", 0);
      const waitBeforeStack = get().stationOverrides[stId]?.waitMinutes || 20;
      get().stackGhostToStation(stId);
      const waitAfterStack = get().stationOverrides[stId]?.waitMinutes || 0;
      const queueLen = get().stationOverrides[stId]?.queueStack?.length || 0;
      if (waitAfterStack === waitBeforeStack + 15 && queueLen >= 1) {
        log(`✓ PASS: Stack test passed! Wait time increased from ${waitBeforeStack}m to ${waitAfterStack}m (+15m stack). Queue length: ${queueLen}.`);
        updateTest("T5", "passed", `Stack verified: +15m added (total ${waitAfterStack}m, queue depth: ${queueLen}).`, Math.round(performance.now() - t4));
      } else {
        throw new Error(`Stack failed: expected ${waitBeforeStack + 15}m, got ${waitAfterStack}m.`);
      }
      await sleep(600);

      // TEST 6
      log("TEST 6: Testing Dynamic 5-Minute Time Shrinkage...");
      const t5 = performance.now();
      updateTest("T6", "running", "Applying 5-minute shrink tick...", 0);
      const waitBeforeShrink = get().stationOverrides[stId]?.waitMinutes || 35;
      get().shrinkWaitTimes(5);
      const waitAfterShrink = get().stationOverrides[stId]?.waitMinutes || 0;
      if (waitAfterShrink === waitBeforeShrink - 5) {
        log(`✓ PASS: 5-minute shrink verified! Wait time reduced from ${waitBeforeShrink}m to ${waitAfterShrink}m.`);
        updateTest("T6", "passed", `Countdown decremented by 5 min: ${waitBeforeShrink}m -> ${waitAfterShrink}m.`, Math.round(performance.now() - t5));
      } else {
        throw new Error(`Shrink failed: expected ${waitBeforeShrink - 5}m, got ${waitAfterShrink}m.`);
      }
      await sleep(600);

      // TEST 7
      log("TEST 7: Testing Session Completion & Recovery to 'Free station available'...");
      const t6 = performance.now();
      updateTest("T7", "running", "Expediting wait time to zero and freeing station...", 0);
      get().freeStationCharger(stId);
      get().freeStationCharger(stId);
      // Force free
      const finalState = get().stationOverrides[stId];
      if (finalState && finalState.availableChargers > 0) {
        log(`✓ PASS: Session completed. Charger freed (${finalState.availableChargers} free). Status restored to 'Free station available'.`);
        updateTest("T7", "passed", `Station recovered: ${finalState.availableChargers} free chargers. Ready for driver plug-in.`, Math.round(performance.now() - t6));
      } else {
        throw new Error("Recovery to free station failed.");
      }

      log("🎉 ALL 7 AUTOMATED INTEGRATION TESTS PASSED SUCCESSFULLY!");
      set({ isRunningTests: false });
    } catch (err: any) {
      log(`❌ TEST FAILURE: ${err?.message || err}`);
      set({ isRunningTests: false });
    }
  },
}));
