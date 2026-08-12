import type { Request, Response } from "express";
import prisma from "../lib/prisma";

export async function listUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany();
  res.json(users);
}

export async function getUser(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
}

export async function createUser(req: Request, res: Response) {
  const user = await prisma.user.create({ data: req.body });
  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
}