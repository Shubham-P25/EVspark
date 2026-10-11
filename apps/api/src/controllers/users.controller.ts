import type { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export async function listUsers(req: Request, res: Response) {
  const currentUser = req.user;
  if (!currentUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }
  if (currentUser.role !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Admin privileges required to list all users");
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      authId: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  res.json(users);
}

export async function getUser(req: Request, res: Response) {
  const currentUser = req.user;
  if (!currentUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const targetId = String(req.params.id);
  if (currentUser.role !== "ADMIN" && currentUser.id !== targetId) {
    throw new AppError(403, "FORBIDDEN", "You can only view your own profile");
  }

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    include: {
      driverProfile: true,
      operatorProfile: true,
    },
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }
  res.json(user);
}

export async function createUser(req: Request, res: Response) {
  const currentUser = req.user;
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Admin privileges required to create arbitrary users");
  }

  const user = await prisma.user.create({ data: req.body });
  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const currentUser = req.user;
  if (!currentUser) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required");
  }

  const targetId = String(req.params.id);
  if (currentUser.role !== "ADMIN" && currentUser.id !== targetId) {
    throw new AppError(403, "FORBIDDEN", "You can only update your own profile");
  }

  // Regular users cannot elevate their own role
  const updateData = { ...req.body };
  if (currentUser.role !== "ADMIN") {
    delete updateData.role;
    delete updateData.authId;
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: updateData,
  });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  const currentUser = req.user;
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new AppError(403, "FORBIDDEN", "Admin privileges required to delete users");
  }

  await prisma.user.delete({ where: { id: String(req.params.id) } });
  res.status(204).send();
}