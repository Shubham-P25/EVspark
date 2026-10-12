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

export async function verifyAndAttachUser(token: string, clientEmail?: string): Promise<AuthUser> {
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

  const rawTokenEmail = (payload.email as string)?.trim()?.toLowerCase();
  const normalizedClientEmail = clientEmail?.trim()?.toLowerCase();
  const realEmail = (rawTokenEmail && rawTokenEmail.includes("@") ? rawTokenEmail : undefined) ||
                    (normalizedClientEmail && normalizedClientEmail.includes("@") ? normalizedClientEmail : undefined);
  const normalizedEmail = realEmail || `${authId.toLowerCase()}@evspark.local`;

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

  // 1. Try finding by authId
  let user = await prisma.user.findUnique({
    where: { authId },
  });

  // 2. If not found by authId and real email is available, find by email
  if (!user && realEmail) {
    user = await prisma.user.findUnique({
      where: { email: realEmail },
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
    }
  }

  // 3. If still not found, create new user
  if (!user) {
    user = await prisma.user.create({
      data: {
        authId,
        email: normalizedEmail,
        name: name || null,
        username: username || null,
        role: assignedRole,
      },
    });
  } else {
    // If existing user has placeholder email and real email is now known, upgrade email
    const dataToUpdate: Record<string, any> = {};
    if (realEmail && user.email !== realEmail && user.email.endsWith("@evspark.local")) {
      dataToUpdate.email = realEmail;
    }
    if (isConfiguredAdmin && user.role !== "ADMIN") {
      dataToUpdate.role = "ADMIN";
    }
    if (username && !user.username) {
      dataToUpdate.username = username;
    }
    if (name && !user.name) {
      dataToUpdate.name = name;
    }
    if (Object.keys(dataToUpdate).length > 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: dataToUpdate,
      });
    }
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

  const clientEmail = (req.headers["x-user-email"] as string) || undefined;
  const user = await verifyAndAttachUser(token, clientEmail);
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
    const clientEmail = (req.headers["x-user-email"] as string) || undefined;
    const user = await verifyAndAttachUser(token, clientEmail);
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
