import type { NextFunction, Request, Response } from "express";

export interface ApiErrorDetails {
  fields?: Record<string, string>;
  [key: string]: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetails;

  constructor(status: number, code: string, message: string, details?: ApiErrorDetails) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function sendApiError(response: Response, error: ApiError): void {
  response.status(error.status).json({
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}

function isBodySizeError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.too.large"
  );
}

function isInvalidJsonError(error: unknown): boolean {
  return error instanceof SyntaxError && "status" in error && error.status === 400;
}

function isMissingSchemaError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "42P01" || error.code === "42703")
  );
}

export function errorHandler(error: unknown, _request: Request, response: Response, next: NextFunction): void {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (isApiError(error)) {
    sendApiError(response, error);
    return;
  }

  if (isBodySizeError(error)) {
    sendApiError(response, new ApiError(413, "PAYLOAD_TOO_LARGE", "The request body exceeded the allowed size limit."));
    return;
  }

  if (isInvalidJsonError(error)) {
    sendApiError(response, new ApiError(400, "INVALID_JSON", "The request body must be valid JSON."));
    return;
  }

  if (isMissingSchemaError(error)) {
    sendApiError(
      response,
      new ApiError(
        503,
        "SETUP_REQUIRED",
        "Repository schema is not ready. Run `npm run db:migrate --workspace apps/api` and restart the API.",
      ),
    );
    return;
  }

  console.error("Unhandled API error.", error);
  sendApiError(response, new ApiError(500, "INTERNAL_SERVER_ERROR", "The API could not complete the request."));
}
