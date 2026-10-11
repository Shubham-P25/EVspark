import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import prisma from "../lib/prisma.js";
import { AppError } from "./errorHandler.js";
import logger from "../lib/logger.js";
import type { Role } from "../generated/prisma/enums.js";
import type { AuthUser } from "../types/express.js";

let remoteJWKS: JWTVerifyGetKey | null = null;
let currentJwksUrl: string | null = null;
let testKeyResolver: JWTVerifyGetKey | null = null;

export function setTestKeyResolver(resolver: JWTVerifyGetKey | null) {
  testKeyResolver = resolver;
}

function getJWKS(): JWTVerifyGetKey {
  if (testKeyResolver) {
    return testKeyResolver;
  }
  const jwksUrl =
    process.env.AUTH_JWKS_URL ||
    process.env.CLERK_JWKS_URL ||
    process.env.NEON_AUTH_JWKS_URL;
  if (!jwksUrl) {
    throw new AppError(500, "AUTH_CONFIG_ERROR", "AUTH_JWKS_URL is not configured");
  }
  if (!remoteJWKS || currentJwksUrl !== jwksUrl) {
    remoteJWKS = createRemoteJWKSet(new URL(jwksUrl));
    currentJwksUrl = jwksUrl;
  }
  return remoteJWKS;
}

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyAndAttachUser(token: string): Promise<AuthUser> {
  const jwks = getJWKS();
  const baseIssuer = process.env.AUTH_ISSUER?.replace(/\/$/, "");
  const issuer = testKeyResolver
    ? undefined
    : baseIssuer
    ? [baseIssuer, `${baseIssuer}/`]
    : undefined;

  let payload: any;
  try {
    const verified = await jwtVerify(
      token,
      jwks,
      issuer ? { issuer } : undefined
    );
    payload = verified.payload;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid token";
    logger.warn({ err }, "JWT verification failed");
    throw new AppError(401, "UNAUTHORIZED", message);
  }

  const authId = (payload.sub || "") as string;
  if (!authId) {
    throw new AppError(401, "UNAUTHORIZED", "Missing subject claim in token");
  }

  const email = (payload.email as string) || `${authId}@evspark.local`;
  const normalizedEmail = email.toLowerCase();
  const name = (payload.name as string) || undefined;
  const username =
    (payload.username as string) ||
    ((payload.metadata as any)?.username as string) ||
    undefined;
  const rawRole =
    ((payload.metadata as any)?.role as string) ||
    (payload.role as string) ||
    "DRIVER";

  const isConfiguredAdmin = getAdminEmails().includes(normalizedEmail);
  // User cannot self-assign ADMIN
  let assignedRole: Role = "DRIVER";
  if (isConfiguredAdmin) {
    assignedRole = "ADMIN";
  } else if (rawRole === "OPERATOR") {
    assignedRole = "OPERATOR";
  }

  // Upsert user in database
  let user = await prisma.user.findUnique({
    where: { authId },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          authId,
          role: isConfiguredAdmin ? "ADMIN" : user.role,
          ...(name && !user.name ? { name } : {}),
          ...(username && !user.username ? { username } : {}),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          authId,
          email: normalizedEmail,
          name: name || null,
          username: username || null,
          role: assignedRole,
        },
      });
    }
  } else if (isConfiguredAdmin && user.role !== "ADMIN") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });
  } else if (username && !user.username) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { username },
    });
  }

  return {
    id: user.id,
    authId: user.authId || authId,
    email: user.email,
    role: user.role,
    name: user.name || undefined,
    username: user.username || undefined,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new AppError(401, "UNAUTHORIZED", "Empty token provided");
  }

  const user = await verifyAndAttachUser(token);
  req.user = user;
  next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return next();
  }

  try {
    const user = await verifyAndAttachUser(token);
    req.user = user;
  } catch (err) {
    logger.warn({ err }, "Optional auth token rejected");
    // In optionalAuth, an invalid token does not attach req.user
  }

  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "FORBIDDEN", "Forbidden: insufficient permissions");
    }
    next();
  };
}
