import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { computeWaitTime, haversineKm, estimateDriveMinutes } from "../services/scoring";

export type StationStatus = "PENDING" | "APPROVED" | "REJECTED";

export async function listStations(req: Request, res: Response) {
  try {
    const status = (req.query.status as StationStatus) || "APPROVED";
    const connector = req.query.connector as string | undefined;
    const minKw = req.query.minKw ? Number(req.query.minKw) : undefined;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : undefined;
    const city = req.query.city as string | undefined;
    const lat = req.query.lat ? Number(req.query.lat) : undefined;
    const lng = req.query.lng ? Number(req.query.lng) : undefined;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 50;

    const where: any = { status };
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (maxPrice) where.pricePerKwh = { lte: maxPrice };

    let stations = await prisma.station.findMany({
      where,
      include: {
        chargers: true,
        queueEntries: { where: { status: "waiting" } },
        reviews: { take: 5, orderBy: { createdAt: "desc" } },
      },
    });

    if (connector && connector !== "All") {
      stations = stations.filter((s) =>
        s.chargers.some((c) => c.connectorType.toLowerCase() === connector.toLowerCase())
      );
    }

    if (minKw) {
      stations = stations.filter((s) => s.chargers.some((c) => c.powerKw >= minKw));
    }

    const enriched = stations.map((st) => {
      const waitInfo = computeWaitTime({
        chargers: st.chargers as any,
        queueLength: st.queueEntries.length,
        targetConnector: connector !== "All" ? connector : undefined,
      });

      let distanceKm: number | undefined;
      let etaMin: number | undefined;

      if (lat && lng) {
        distanceKm = +haversineKm(lat, lng, st.lat, st.lng).toFixed(1);
        etaMin = estimateDriveMinutes(distanceKm);
      }

      return {
        ...st,
        distanceKm,
        etaMinutes: etaMin,
        waitMinutes: waitInfo.waitMinutes,
        predictedWaitMinutes: waitInfo.waitMinutes,
        markerColor: waitInfo.markerColor,
        isOverloaded: waitInfo.isOverloaded,
        availableChargers: waitInfo.availableChargers,
        totalChargers: st.chargers.length,
        availableSlots: waitInfo.availableChargers,
        totalSlots: st.chargers.length,
        powerKw: Math.max(...st.chargers.map((c) => c.powerKw), 0),
        connectorType: st.chargers.map((c) => c.connectorType).join(", "),
        amenities: st.amenities ? st.amenities.split(",").map((a) => a.trim()) : [],
      };
    });

    if (lat && lng && radiusKm) {
      const filteredByRadius = enriched.filter((st) => (st.distanceKm ?? 0) <= radiusKm);
      return res.json(filteredByRadius.length ? filteredByRadius : enriched);
    }

    res.json(enriched);
  } catch (error: any) {
    console.error("Error in listStations:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function getStation(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        chargers: true,
        reviews: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
        queueEntries: { where: { status: "waiting" } },
        sessions: { take: 5, orderBy: { startTs: "desc" } },
      },
    });

    if (!station) return res.status(404).json({ error: "Station not found" });

    const waitInfo = computeWaitTime({
      chargers: (station as any).chargers as any,
      queueLength: (station as any).queueEntries.length,
    });

    res.json({
      ...station,
      waitMinutes: waitInfo.waitMinutes,
      markerColor: waitInfo.markerColor,
      isOverloaded: waitInfo.isOverloaded,
      availableChargers: waitInfo.availableChargers,
      amenities: station.amenities ? station.amenities.split(",").map((a) => a.trim()) : [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createStation(req: Request, res: Response) {
  try {
    const { chargers, ...data } = req.body;
    const station = await prisma.station.create({
      data: {
        ...data,
        status: "PENDING",
        chargers: chargers
          ? {
              create: chargers.map((c: any) => ({
                label: c.label,
                connectorType: c.connectorType,
                powerKw: Number(c.powerKw),
                status: "FREE",
                ocppId: `CP-${c.label || Math.random().toString(36).substring(7)}`,
              })),
            }
          : undefined,
      },
      include: { chargers: true },
    });
    res.status(201).json(station);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function updateStation(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const station = await prisma.station.update({
      where: { id },
      data: req.body,
    });
    res.json(station);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function deleteStation(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    await prisma.station.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}