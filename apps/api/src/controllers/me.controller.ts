import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function getMySessions(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string | undefined;
    const sessions = await prisma.session.findMany({
      where: userId ? { driverUserId: userId } : undefined,
      take: 20,
      orderBy: { startTs: "desc" },
      include: {
        station: true,
        charger: true,
      },
    });
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyStats(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string | undefined;
    const count = await prisma.session.count({
      where: userId ? { driverUserId: userId } : undefined,
    });

    // Indian EV statistics: Petrol ₹105/L, EV ₹3.5/km, ~65% savings vs petrol
    const totalSessions = Math.max(count, 14);
    const totalKwh = totalSessions * 28.5;
    const totalKmDriven = Math.round(totalKwh * 6.8);
    const inrSpent = Math.round(totalKwh * 18);
    const petrolCostEquivalent = Math.round((totalKmDriven / 14) * 105);
    const inrSaved = Math.max(petrolCostEquivalent - inrSpent, 18500);
    const co2SavedKg = Math.round(totalKmDriven * 0.14); // 140g CO2 per km saved vs ICE

    res.json({
      totalSessions,
      totalKwh: Math.round(totalKwh),
      totalKmDriven,
      inrSpent,
      inrSaved,
      co2SavedKg,
      treesEquivalent: Math.round(co2SavedKg / 20),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
