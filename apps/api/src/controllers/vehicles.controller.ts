import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function listVehicleModels(req: Request, res: Response) {
  const vehicles = await prisma.vehicleModel.findMany({
    orderBy: { make: "asc" },
  });
  res.json(vehicles);
}
