import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { rankStationsByFuel } from "../services/scoring";

export async function recommendStations(req: Request, res: Response) {
  try {
    const { lat, lng, connector, socNow, targetSoc } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const stations = await prisma.station.findMany({
      where: { status: "APPROVED" },
      include: {
        chargers: true,
        queueEntries: { where: { status: "waiting" } },
      },
    });

    const ranked = rankStationsByFuel(stations, {
      lat: Number(lat),
      lng: Number(lng),
      connector: connector || undefined,
    });

    // Return top 3 recommendations with fuel details
    res.json({
      recommendations: ranked.slice(0, 3),
      all: ranked,
      meta: {
        driverLocation: { lat, lng },
        connectorPreference: connector || "Any",
        socNow: socNow ?? 25,
        targetSoc: targetSoc ?? 90,
      },
    });
  } catch (error: any) {
    console.error("Error in recommendStations:", error);
    res.status(500).json({ error: error.message });
  }
}
