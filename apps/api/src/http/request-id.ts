import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export function attachRequestId(request: Request, response: Response, next: NextFunction): void {
  const requestId = request.header("x-request-id")?.trim() || randomUUID();
  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
}
