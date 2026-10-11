import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export async function listReviews(req: Request, res: Response) {
  const stationId = req.query.stationId as string | undefined;
  const reviews = await prisma.review.findMany({
    ...(stationId ? { where: { stationId } } : {}),
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
}

export async function createReview(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const { stationId, rating, comment } = req.body;
  if (!stationId || rating === undefined) {
    throw new AppError(400, "BAD_REQUEST", "stationId and rating are required");
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      stationId,
      rating: Number(rating),
      comment: comment || null,
    },
  });
  res.status(201).json(review);
}

export async function deleteReview(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  const reviewId = String(req.params.id);
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new AppError(404, "NOT_FOUND", "Review not found");
  }
  if (user.role !== "ADMIN" && review.userId !== user.id) {
    throw new AppError(403, "FORBIDDEN", "You can only delete your own reviews");
  }
  await prisma.review.delete({ where: { id: reviewId } });
  res.status(204).send();
}