import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { emitOverloadAlert } from "../lib/socket";

export async function getPendingStations(req: Request, res: Response) {
  try {
    const pending = await prisma.station.findMany({
      where: { status: "PENDING" },
      include: { chargers: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(pending);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function approveStation(req: Request, res: Response) {
  try {
    const { status } = req.body; // "APPROVED" | "REJECTED"
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await prisma.station.update({
      where: { id: String(req.params.id) },
      data: { status },
      include: { chargers: true },
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function getAdminOverview(req: Request, res: Response) {
  try {
    const [totalStations, totalChargers, totalUsers, totalSessions] = await Promise.all([
      prisma.station.count(),
      prisma.charger.count(),
      prisma.user.count(),
      prisma.session.count(),
    ]);

    res.json({
      totalStations,
      totalChargers,
      totalUsers,
      totalSessions,
      networkUptime: 99.4,
      systemHealth: "OPTIMAL",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAdminUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      include: { driverProfile: true, operatorProfile: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAdminIssues(req: Request, res: Response) {
  try {
    const issues = await prisma.issue.findMany({
      include: { station: true, reporter: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(issues);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateSimConfig(req: Request, res: Response) {
  try {
    const { speed, surge, seed } = req.body;

    const config = await prisma.simConfig.upsert({
      where: { id: "default" },
      update: {
        speed: speed !== undefined ? Number(speed) : undefined,
        surgeStations: Array.isArray(surge) ? surge.join(",") : surge,
        seed: seed !== undefined ? Number(seed) : undefined,
      },
      create: {
        id: "default",
        speed: speed ? Number(speed) : 10,
        surgeStations: Array.isArray(surge) ? surge.join(",") : (surge || ""),
        seed: seed ? Number(seed) : 42,
      },
    });

    if (surge && surge.length > 0) {
      for (const stId of (Array.isArray(surge) ? surge : surge.split(","))) {
        if (stId) {
          emitOverloadAlert({
            stationId: stId,
            message: `Surge alert triggered for station ${stId}`,
            severity: "critical",
          });
        }
      }
    }

    res.json(config);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
