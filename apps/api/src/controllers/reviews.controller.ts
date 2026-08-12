import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function listReviews(req: Request, res: Response) {
  const stationId = req.query.stationId as string | undefined;
  const reviews = await prisma.review.findMany({
    ...(stationId ? { where: { stationId } } : {}),
    include: { user: true },
  });
  res.json(reviews);
}

export async function createReview(req: Request, res: Response) {
  const review = await prisma.review.create({ data: req.body });
  res.status(201).json(review);
}

export async function deleteReview(req: Request, res: Response) {
  await prisma.review.delete({ where: { id: req.params.id } });
  res.status(204).send();
}