import type { Request, Response } from "express";
import type { StationStatus } from "@prisma/client";
import prisma from "../lib/prisma";

export async function listStations(req: Request, res: Response) {
  const status = req.query.status as StationStatus | undefined;
  const stations = await prisma.station.findMany({
    ...(status ? { where: { status } } : {}),
    include: { chargers: true },
  });
  res.json(stations);
}

export async function getStation(req: Request, res: Response) {
  const station = await prisma.station.findUnique({
    where: { id: req.params.id },
    include: { chargers: true, reviews: true },
  });
  if (!station) return res.status(404).json({ error: "Station not found" });
  res.json(station);
}

export async function createStation(req: Request, res: Response) {
  const station = await prisma.station.create({ data: req.body });
  res.status(201).json(station);
}

export async function updateStation(req: Request, res: Response) {
  const station = await prisma.station.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(station);
}

export async function deleteStation(req: Request, res: Response) {
  await prisma.station.delete({ where: { id: req.params.id } });
  res.status(204).send();
}