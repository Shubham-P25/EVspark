import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client";
import logger from "../lib/logger";

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  const requestId = (req.headers["x-request-id"] as string) || (res.getHeader("x-request-id") as string) || undefined;

  // 1. Custom AppError
  if (err instanceof AppError) {
    logger.warn({ err, requestId }, `AppError: ${err.message}`);
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const flattened = err.flatten();
    logger.warn({ issues: err.issues, requestId }, "Validation error");
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        requestId,
        details: flattened.fieldErrors,
      },
    });
  }

  // 3. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      logger.warn({ err, requestId }, "Prisma unique constraint violation");
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: "A resource with these details already exists",
          requestId,
          details: err.meta,
        },
      });
    }
    if (err.code === "P2025") {
      logger.warn({ err, requestId }, "Prisma record not found");
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Requested resource not found",
          requestId,
        },
      });
    }
  }

  // 4. Unexpected generic errors
  logger.error({ err, requestId }, "Unexpected server error");
  const isProd = process.env.NODE_ENV === "production";
  const message = isProd
    ? "Internal server error"
    : err instanceof Error
      ? err.message
      : "Internal server error";

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message,
      requestId,
    },
  });
}