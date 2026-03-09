import type { NextFunction, Request, Response } from "express";
import { loadInternalAuthConfig } from "./config.js";
import {
  AuthenticatedInternalActor,
  INTERNAL_AUTH_HEADER,
  InternalAuthVerificationError,
  verifyInternalApiActorToken,
} from "./internal.js";

declare global {
  namespace Express {
    interface Request {
      authenticatedActor?: AuthenticatedInternalActor;
    }
  }
}

function unauthorized(response: Response, message: string): void {
  response.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message,
    },
  });
}

export function authenticateInternalRequest(request: Request, response: Response, next: NextFunction): void {
  const headerValue = request.header(INTERNAL_AUTH_HEADER);

  if (!headerValue) {
    unauthorized(response, "Trusted internal auth header is required.");
    return;
  }

  try {
    const actor = verifyInternalApiActorToken(
      headerValue,
      loadInternalAuthConfig().secret,
      request.method,
      request.originalUrl,
    );

    request.authenticatedActor = actor;
    next();
  } catch (error) {
    const message =
      error instanceof InternalAuthVerificationError
        ? error.message
        : "Trusted internal auth verification failed.";

    console.warn("[internal-auth] Rejected request.", { path: request.originalUrl, method: request.method, message });
    unauthorized(response, message);
  }
}
