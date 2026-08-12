import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function listFavorites(req: Request, res: Response) {
  const userId = req.query.userId as string | undefined;
  const favorites = await prisma.favorite.findMany({
    ...(userId ? { where: { userId } } : {}),
    include: { station: true },
  });
  res.json(favorites);
}

export async function createFavorite(req: Request, res: Response) {
  const favorite = await prisma.favorite.create({ data: req.body });
  res.status(201).json(favorite);
}

export async function deleteFavorite(req: Request, res: Response) {
  await prisma.favorite.delete({ where: { id: req.params.id } });
  res.status(204).send();
}