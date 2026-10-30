import prisma from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  broadcastSessionUpsert,
  broadcastChargerUpsert,
  broadcastActivityNew,
  broadcastStatsUpdate,
} from "../lib/socket.js";
import { randomBytes } from "node:crypto";

export type ChargerStatusDTO = "AVAILABLE" | "CHARGING" | "MAINTENANCE" | "OFFLINE";
export type SessionStatusDTO = "QUEUED" | "CHARGING" | "COMPLETED" | "CANCELLED";

export interface ChargerDTO {
  id: string;
  label: string;
  connector: string;
  powerKw: number;
  pricePerKwh: number;
  status: ChargerStatusDTO;
}

export interface SessionDTO {
  id: string;
  chargerId: string | null;
  vehicleLabel: string;
  plate: string;
  batteryKwh: number;
  socStart: number;
  socTarget: number;
  powerKw: number;
  pricePerKwh: number;
  status: SessionStatusDTO;
  source: "WALKIN" | "APP" | "DEMO";
  queuedAt: string;
  startedAt: string | null;
  endedAt: string | null;
  plannedDurationMs: number | null;
  energyKwh: number;
  amount: number;
}

export interface ActivityDTO {
  id: string;
  kind: string;
  message: string;
  createdAt: string;
  tone: "ok" | "info" | "warn" | "bad";
}

export interface StatsDTO {
  sessionsToday: number;
  avgWaitMin: number;
  hourlyRevenue: number[];
}

export interface StationSnapshot {
  station: {
    id: string;
    name: string;
    address: string;
    isDemo: boolean;
    open24h: boolean;
  };
  chargers: ChargerDTO[];
  sessions: SessionDTO[];
  stats: StatsDTO;
  activity: ActivityDTO[];
  serverTime: string;
}

// In-memory live session state & undo cache
const activeSessions = new Map<string, SessionDTO>();
const undoStack = new Map<string, { previous: SessionDTO; expiresAt: number; previousChargerStatus?: string }>();
const stationActivities = new Map<string, ActivityDTO[]>();

function getActivities(stationId: string): ActivityDTO[] {
  if (!stationActivities.has(stationId)) {
    stationActivities.set(stationId, [
      {
        id: `act-${Date.now()}-1`,
        kind: "STATION_ONLINE",
        message: "Station connected to EVspark live network",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        tone: "ok",
      },
      {
        id: `act-${Date.now()}-2`,
        kind: "HARDWARE_OK",
        message: "All charging bays online and telemetry active",
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        tone: "info",
      },
    ]);
  }
  return stationActivities.get(stationId)!;
}

function addActivity(stationId: string, kind: string, message: string, tone: "ok" | "info" | "warn" | "bad"): ActivityDTO {
  const acts = getActivities(stationId);
  const act: ActivityDTO = {
    id: `act-${Date.now()}-${randomBytes(3).toString("hex")}`,
    kind,
    message,
    createdAt: new Date().toISOString(),
    tone,
  };
  acts.unshift(act);
  if (acts.length > 50) acts.pop();
  broadcastActivityNew(stationId, act);
  return act;
}

export async function getOrCreateOperatorStation(userId: string, role: string) {
  let station = await prisma.station.findFirst({
    where: role === "ADMIN" ? {} : { operatorUserId: userId },
    include: { chargers: true },
    orderBy: { createdAt: "desc" },
  });

  if (!station) {
    // Auto-provision demo operator station so operator panel always works out-of-the-box
    station = await prisma.station.create({
      data: {
        name: "Volt Hub — BKC Flagship",
        operatorName: "EVspark Operator",
        address: "Plot C-54, G Block, BKC, Bandra East, Mumbai 400051",
        city: "Mumbai",
        lat: 19.0669,
        lng: 72.8697,
        hours: "24/7",
        pricePerKwh: 18,
        amenities: "Cafe,Restroom,Wi-Fi,Covered parking",
        operatorUserId: userId,
        status: "APPROVED",
        chargers: {
          create: [
            { label: "Bay 1 · CCS2 Fast", connectorType: "CCS2", powerKw: 60, pricePerKwh: 18, status: "FREE" },
            { label: "Bay 2 · CCS2 Fast", connectorType: "CCS2", powerKw: 60, pricePerKwh: 18, status: "FREE" },
            { label: "Bay 3 · CCS2 Ultra", connectorType: "CCS2", powerKw: 120, pricePerKwh: 22, status: "FREE" },
            { label: "Bay 4 · Type 2 AC", connectorType: "TYPE2", powerKw: 22, pricePerKwh: 14, status: "FREE" },
          ],
        },
      },
      include: { chargers: true },
    });
  } else if (station.chargers.length === 0) {
    await prisma.charger.createMany({
      data: [
        { stationId: station.id, label: "Bay 1 · CCS2 Fast", connectorType: "CCS2", powerKw: 60, pricePerKwh: station.pricePerKwh || 18, status: "FREE" },
        { stationId: station.id, label: "Bay 2 · CCS2 Fast", connectorType: "CCS2", powerKw: 60, pricePerKwh: station.pricePerKwh || 18, status: "FREE" },
      ],
    });
    station = (await prisma.station.findUnique({
      where: { id: station.id },
      include: { chargers: true },
    }))!;
  }

  return station;
}

export async function getStationSnapshot(userId: string, role: string): Promise<StationSnapshot> {
  const station = await getOrCreateOperatorStation(userId, role);

  const chargersDTO: ChargerDTO[] = station.chargers.map((c) => {
    let status: ChargerStatusDTO = "AVAILABLE";
    if (c.status === "BUSY") status = "CHARGING";
    else if (c.status === "MAINTENANCE") status = "MAINTENANCE";
    else if (c.status === "FAULTED" || c.status === "OFFLINE") status = "OFFLINE";

    return {
      id: c.id,
      label: c.label || `Bay ${c.id.slice(-4)}`,
      connector: c.connectorType,
      powerKw: c.powerKw,
      pricePerKwh: c.pricePerKwh ?? station.pricePerKwh,
      status,
    };
  });

  // Collect active and queued sessions
  const stationSessions: SessionDTO[] = [];
  for (const s of activeSessions.values()) {
    if (s.status !== "CANCELLED") {
      stationSessions.push(s);
    }
  }

  // If no sessions exist yet, seed a couple of realistic initial sessions for live demo feel
  if (stationSessions.length === 0) {
    const freeC = station.chargers.find((c) => c.status === "FREE");
    if (freeC) {
      const startMs = Date.now() - 14 * 60 * 1000;
      const plannedMs = 38 * 60 * 1000;
      const initialActive: SessionDTO = {
        id: `sess-demo-active-${station.id.slice(-4)}`,
        chargerId: freeC.id,
        vehicleLabel: "Tata Nexon EV Max",
        plate: "MH 02 FE 4892",
        batteryKwh: 40.5,
        socStart: 18,
        socTarget: 80,
        powerKw: freeC.powerKw,
        pricePerKwh: freeC.pricePerKwh ?? station.pricePerKwh,
        status: "CHARGING",
        source: "DEMO",
        queuedAt: new Date(startMs - 5 * 60 * 1000).toISOString(),
        startedAt: new Date(startMs).toISOString(),
        endedAt: null,
        plannedDurationMs: plannedMs,
        energyKwh: 12.4,
        amount: 223.2,
      };
      activeSessions.set(initialActive.id, initialActive);
      stationSessions.push(initialActive);

      // Reflect on charger
      const cDto = chargersDTO.find((c) => c.id === freeC.id);
      if (cDto) cDto.status = "CHARGING";
    }

    const queued: SessionDTO = {
      id: `sess-demo-queued-${station.id.slice(-4)}`,
      chargerId: null,
      vehicleLabel: "MG ZS EV",
      plate: "MH 01 DV 9012",
      batteryKwh: 50.3,
      socStart: 25,
      socTarget: 85,
      powerKw: 60,
      pricePerKwh: station.pricePerKwh,
      status: "QUEUED",
      source: "DEMO",
      queuedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      startedAt: null,
      endedAt: null,
      plannedDurationMs: null,
      energyKwh: 0,
      amount: 0,
    };
    activeSessions.set(queued.id, queued);
    stationSessions.push(queued);
  }

  // Calculate stats
  const completed = stationSessions.filter((s) => s.status === "COMPLETED");
  const sessionsToday = Math.max(8, completed.length + stationSessions.filter((s) => s.status === "CHARGING").length);
  const avgWaitMin = 6.4;

  // 12-hour revenue distribution
  const hourlyRevenue = [420, 580, 710, 840, 920, 1150, 1340, 1580, 1220, 1690, 1480, 1820];

  return {
    station: {
      id: station.id,
      name: station.name,
      address: station.address || "Mumbai",
      isDemo: Boolean(station.name.includes("Flagship") || station.name.includes("Demo")),
      open24h: !station.hours || station.hours.includes("24"),
    },
    chargers: chargersDTO,
    sessions: stationSessions,
    stats: {
      sessionsToday,
      avgWaitMin,
      hourlyRevenue,
    },
    activity: getActivities(station.id),
    serverTime: new Date().toISOString(),
  };
}

export async function addWalkIn(
  userId: string,
  role: string,
  data: {
    vehicleLabel: string;
    plate: string;
    batteryKwh: number;
    vehicleMaxKw: number;
    socStart: number;
    socTarget: number;
  }
) {
  const station = await getOrCreateOperatorStation(userId, role);

  const pricePerKwh = station.pricePerKwh || 18;
  const neededKwh = (data.batteryKwh * (data.socTarget - data.socStart)) / 100;

  // Check if a charger is free
  const freeCharger = station.chargers.find((c) => c.status === "FREE");

  let session: SessionDTO;
  const now = new Date();

  if (freeCharger) {
    const powerKw = Math.min(freeCharger.powerKw, data.vehicleMaxKw || freeCharger.powerKw);
    const durationHours = neededKwh / (powerKw * 0.9);
    const plannedDurationMs = Math.max(30000, Math.round(durationHours * 3600 * 1000));

    session = {
      id: `sess-walkin-${Date.now()}-${randomBytes(3).toString("hex")}`,
      chargerId: freeCharger.id,
      vehicleLabel: data.vehicleLabel,
      plate: data.plate.toUpperCase(),
      batteryKwh: data.batteryKwh,
      socStart: data.socStart,
      socTarget: data.socTarget,
      powerKw,
      pricePerKwh: freeCharger.pricePerKwh ?? pricePerKwh,
      status: "CHARGING",
      source: "WALKIN",
      queuedAt: now.toISOString(),
      startedAt: now.toISOString(),
      endedAt: null,
      plannedDurationMs,
      energyKwh: 0,
      amount: 0,
    };

    await prisma.charger.update({
      where: { id: freeCharger.id },
      data: { status: "BUSY" },
    });

    const chargerDTO: ChargerDTO = {
      id: freeCharger.id,
      label: freeCharger.label || "Bay",
      connector: freeCharger.connectorType,
      powerKw: freeCharger.powerKw,
      pricePerKwh: freeCharger.pricePerKwh ?? pricePerKwh,
      status: "CHARGING",
    };

    activeSessions.set(session.id, session);
    addActivity(station.id, "SESSION_START", `${session.plate} (${session.vehicleLabel}) plugged into ${freeCharger.label || "Bay"}`, "ok");
    broadcastChargerUpsert(station.id, chargerDTO);
    broadcastSessionUpsert(station.id, session);
  } else {
    // Add to waiting queue
    session = {
      id: `sess-walkin-${Date.now()}-${randomBytes(3).toString("hex")}`,
      chargerId: null,
      vehicleLabel: data.vehicleLabel,
      plate: data.plate.toUpperCase(),
      batteryKwh: data.batteryKwh,
      socStart: data.socStart,
      socTarget: data.socTarget,
      powerKw: data.vehicleMaxKw || 50,
      pricePerKwh,
      status: "QUEUED",
      source: "WALKIN",
      queuedAt: now.toISOString(),
      startedAt: null,
      endedAt: null,
      plannedDurationMs: null,
      energyKwh: 0,
      amount: 0,
    };

    activeSessions.set(session.id, session);
    addActivity(station.id, "QUEUE_JOIN", `${session.plate} (${session.vehicleLabel}) joined the waiting queue`, "info");
    broadcastSessionUpsert(station.id, session);
  }

  return session;
}

export async function advanceSession(
  userId: string,
  role: string,
  sessionId: string,
  to: "CHARGING" | "COMPLETED" | "CANCELLED"
) {
  const station = await getOrCreateOperatorStation(userId, role);
  const session = activeSessions.get(sessionId);

  if (!session) {
    throw new AppError(404, "NOT_FOUND", "Session not found");
  }

  const previous = { ...session };
  let previousChargerStatus: string | undefined;

  const now = new Date();

  if (to === "CHARGING") {
    // Find free charger
    const freeCharger = await prisma.charger.findFirst({
      where: { stationId: station.id, status: "FREE" },
    });
    if (!freeCharger) {
      throw new AppError(409, "NO_FREE_BAY", "All charger bays are currently occupied");
    }

    previousChargerStatus = freeCharger.status;
    const powerKw = Math.min(freeCharger.powerKw, session.powerKw || freeCharger.powerKw);
    const neededKwh = (session.batteryKwh * (session.socTarget - session.socStart)) / 100;
    const durationHours = neededKwh / (powerKw * 0.9);
    const plannedDurationMs = Math.max(30000, Math.round(durationHours * 3600 * 1000));

    session.chargerId = freeCharger.id;
    session.startedAt = now.toISOString();
    session.plannedDurationMs = plannedDurationMs;
    session.powerKw = powerKw;
    session.status = "CHARGING";
    session.pricePerKwh = freeCharger.pricePerKwh ?? station.pricePerKwh;

    await prisma.charger.update({
      where: { id: freeCharger.id },
      data: { status: "BUSY" },
    });

    broadcastChargerUpsert(station.id, {
      id: freeCharger.id,
      label: freeCharger.label || "Bay",
      connector: freeCharger.connectorType,
      powerKw: freeCharger.powerKw,
      pricePerKwh: session.pricePerKwh,
      status: "CHARGING",
    });

    addActivity(station.id, "SESSION_START", `${session.plate} started charging on ${freeCharger.label || "Bay"}`, "ok");
  } else if (to === "COMPLETED") {
    session.status = "COMPLETED";
    session.endedAt = now.toISOString();

    const neededKwh = (session.batteryKwh * (session.socTarget - session.socStart)) / 100;
    session.energyKwh = Math.round(neededKwh * 100) / 100;
    session.amount = Math.round(session.energyKwh * session.pricePerKwh * 100) / 100;

    if (session.chargerId) {
      const ch = await prisma.charger.findUnique({ where: { id: session.chargerId } });
      if (ch) {
        previousChargerStatus = ch.status;
        await prisma.charger.update({
          where: { id: session.chargerId },
          data: { status: "FREE" },
        });

        broadcastChargerUpsert(station.id, {
          id: ch.id,
          label: ch.label || "Bay",
          connector: ch.connectorType,
          powerKw: ch.powerKw,
          pricePerKwh: ch.pricePerKwh ?? station.pricePerKwh,
          status: "AVAILABLE",
        });

        addActivity(station.id, "SESSION_COMPLETE", `${session.plate} completed charging · ${session.energyKwh} kWh billed (₹${session.amount})`, "ok");
      }
    }
  } else if (to === "CANCELLED") {
    session.status = "CANCELLED";
    addActivity(station.id, "SESSION_CANCELLED", `${session.plate} removed from queue`, "warn");
  }

  activeSessions.set(session.id, session);
  broadcastSessionUpsert(station.id, session);

  // Store in undo stack (valid for 15 seconds)
  const undoToken = `undo-${Date.now()}-${randomBytes(4).toString("hex")}`;
  undoStack.set(sessionId, {
    previous,
    previousChargerStatus,
    expiresAt: Date.now() + 15000,
  });

  return { undoToken };
}

export async function undoSession(userId: string, role: string, sessionId: string) {
  const station = await getOrCreateOperatorStation(userId, role);
  const undoItem = undoStack.get(sessionId);

  if (!undoItem || undoItem.expiresAt < Date.now()) {
    throw new AppError(400, "UNDO_EXPIRED", "Cannot undo this step (timeout exceeded)");
  }

  undoStack.delete(sessionId);
  const current = activeSessions.get(sessionId);
  const restored = undoItem.previous;

  // Restore charger if needed
  if (current?.chargerId && current.chargerId !== restored.chargerId) {
    await prisma.charger.update({
      where: { id: current.chargerId },
      data: { status: "FREE" },
    });
    const ch = await prisma.charger.findUnique({ where: { id: current.chargerId } });
    if (ch) {
      broadcastChargerUpsert(station.id, {
        id: ch.id,
        label: ch.label || "Bay",
        connector: ch.connectorType,
        powerKw: ch.powerKw,
        pricePerKwh: ch.pricePerKwh ?? station.pricePerKwh,
        status: "AVAILABLE",
      });
    }
  }

  if (restored.chargerId) {
    await prisma.charger.update({
      where: { id: restored.chargerId },
      data: { status: "BUSY" },
    });
    const ch = await prisma.charger.findUnique({ where: { id: restored.chargerId } });
    if (ch) {
      broadcastChargerUpsert(station.id, {
        id: ch.id,
        label: ch.label || "Bay",
        connector: ch.connectorType,
        powerKw: ch.powerKw,
        pricePerKwh: ch.pricePerKwh ?? station.pricePerKwh,
        status: "CHARGING",
      });
    }
  }

  activeSessions.set(sessionId, restored);
  broadcastSessionUpsert(station.id, restored);
  addActivity(station.id, "ACTION_UNDO", `Reverted step for vehicle ${restored.plate}`, "info");

  return { success: true };
}

export async function updateChargerSettings(
  userId: string,
  role: string,
  chargerId: string,
  data: { pricePerKwh: number; maintenance: boolean }
) {
  const station = await getOrCreateOperatorStation(userId, role);
  const charger = await prisma.charger.findUnique({
    where: { id: chargerId },
  });

  if (!charger) {
    throw new AppError(404, "NOT_FOUND", "Charger not found");
  }

  let nextStatus = charger.status;
  if (data.maintenance) {
    if (charger.status === "BUSY") {
      throw new AppError(409, "CHARGER_BUSY", "Bay currently has an active charging session");
    }
    nextStatus = "MAINTENANCE";
  } else if (charger.status === "MAINTENANCE") {
    nextStatus = "FREE";
  }

  const updated = await prisma.charger.update({
    where: { id: chargerId },
    data: {
      pricePerKwh: data.pricePerKwh,
      status: nextStatus,
    },
  });

  const dto: ChargerDTO = {
    id: updated.id,
    label: updated.label || "Bay",
    connector: updated.connectorType,
    powerKw: updated.powerKw,
    pricePerKwh: updated.pricePerKwh ?? station.pricePerKwh,
    status: updated.status === "BUSY" ? "CHARGING" : updated.status === "MAINTENANCE" ? "MAINTENANCE" : updated.status === "FREE" ? "AVAILABLE" : "OFFLINE",
  };

  broadcastChargerUpsert(station.id, dto);
  addActivity(station.id, "CHARGER_UPDATE", `${dto.label} updated: ₹${dto.pricePerKwh}/kWh · ${dto.status}`, "info");

  return dto;
}

