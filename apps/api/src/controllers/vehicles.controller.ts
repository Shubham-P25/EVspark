import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function listVehicleModels(req: Request, res: Response) {
  try {
    const vehicles = await prisma.vehicleModel.findMany({
      orderBy: { make: "asc" },
    });
    res.json(vehicles);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
