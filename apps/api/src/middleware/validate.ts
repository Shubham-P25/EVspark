import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: ValidationSchemas | ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const targetSchemas: ValidationSchemas =
      "parse" in schemas || "safeParse" in schemas
        ? { body: schemas as ZodType }
        : (schemas as ValidationSchemas);

    if (targetSchemas.params) {
      const result = targetSchemas.params.safeParse(req.params);
      if (!result.success) {
        return next(result.error);
      }
      try {
        Object.defineProperty(req, "params", {
          value: result.data,
          writable: true,
          configurable: true,
        });
      } catch {
        Object.assign(req.params, result.data);
      }
    }

    if (targetSchemas.query) {
      const result = targetSchemas.query.safeParse(req.query);
      if (!result.success) {
        return next(result.error);
      }
      try {
        Object.defineProperty(req, "query", {
          value: result.data,
          writable: true,
          configurable: true,
        });
      } catch {
        Object.assign(req.query, result.data);
      }
    }

    if (targetSchemas.body) {
      const result = targetSchemas.body.safeParse(req.body);
      if (!result.success) {
        return next(result.error);
      }
      req.body = result.data;
    }

    next();
  };
}