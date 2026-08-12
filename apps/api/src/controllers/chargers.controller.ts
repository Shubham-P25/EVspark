import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { getIO } from "../lib/socket";

export async function listChargers(req: Request, res: Response) {
  const stationId = req.query.stationId as string | undefined;
  const chargers = await prisma.charger.findMany({
    ...(stationId ? { where: { stationId } } : {}),
  });
  res.json(chargers);
}

export async function getCharger(req: Request, res: Response) {
  const charger = await prisma.charger.findUnique({ where: { id: req.params.id } });
  if (!charger) return res.status(404).json({ error: "Charger not found" });
  res.json(charger);
}

export async function createCharger(req: Request, res: Response) {
  const charger = await prisma.charger.create({ data: req.body });
  res.status(201).json(charger);
}

export async function updateCharger(req: Request, res: Response) {
  const charger = await prisma.charger.update({
    where: { id: req.params.id },
    data: req.body,
  });
  getIO().emit("charger:update", charger);
  res.json(charger);
}

export async function deleteCharger(req: Request, res: Response) {
  await prisma.charger.delete({ where: { id: req.params.id } });
  res.status(204).send();
}