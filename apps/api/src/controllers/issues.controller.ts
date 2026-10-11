import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export async function createIssue(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const { stationId, chargerId, type, text } = req.body;
  if (!stationId || !text) {
    throw new AppError(400, "BAD_REQUEST", "stationId and text are required");
  }

  const issue = await prisma.issue.create({
    data: {
      stationId,
      chargerId: chargerId || null,
      reporterId: user.id,
      type: type || "other",
      text,
    },
  });

  res.status(201).json(issue);
}
