import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export async function listFavorites(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id },
    include: {
      station: {
        include: {
          chargers: true,
        },
      },
    },
  });
  res.json(favorites);
}

export async function createFavorite(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { stationId } = req.body;
  if (!stationId) {
    throw new AppError(400, "BAD_REQUEST", "stationId is required");
  }

  const existing = await prisma.favorite.findFirst({
    where: { userId: user.id, stationId },
  });
  if (existing) {
    return res.json(existing);
  }

  const favorite = await prisma.favorite.create({
    data: {
      userId: user.id,
      stationId,
    },
    include: { station: true },
  });
  res.status(201).json(favorite);
}

export async function deleteFavorite(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const id = String(req.params.id);
  const existing = await prisma.favorite.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Favorite not found");
  }

  if (user.role !== "ADMIN" && existing.userId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You can only remove your own favorites");
  }

  await prisma.favorite.delete({ where: { id } });
  res.status(204).send();
}