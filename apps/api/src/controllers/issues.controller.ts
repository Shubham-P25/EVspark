import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function createIssue(req: Request, res: Response) {
  try {
    const { stationId, chargerId, reporterId, type, text } = req.body;

    let user = reporterId;
    if (!user) {
      const demoDriver = await prisma.user.findFirst({ where: { role: "DRIVER" } });
      user = demoDriver?.id;
    }

    const issue = await prisma.issue.create({
      data: {
        stationId,
        chargerId: chargerId || null,
        reporterId: user,
        type: type || "other",
        text,
      },
    });

    res.status(201).json(issue);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
