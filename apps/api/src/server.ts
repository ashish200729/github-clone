import { type Server } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import { closeDatabasePool, getDatabaseHealth, verifyDatabaseConnection } from "./db/index.js";
import { summarizeServiceHealth } from "./health.js";
import { closeRedis, getRedisHealth, initRedis } from "./redis/index.js";

const DEFAULT_API_PORT = 4000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

function parseStrictInteger(value: string | undefined, envName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  const parsedValue = Number.parseInt(normalizedValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsedValue;
}

export function loadApiPort(value: string | undefined): number {
  const port = parseStrictInteger(value, "API_PORT") ?? DEFAULT_API_PORT;

  if (port > 65_535) {
    throw new Error("API_PORT must be an integer between 1 and 65535.");
  }

  return port;
}

export function loadShutdownTimeoutMs(value: string | undefined): number {
  return parseStrictInteger(value, "API_SHUTDOWN_TIMEOUT_MS") ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
}

const port = loadApiPort(process.env.API_PORT);
const shutdownTimeoutMs = loadShutdownTimeoutMs(process.env.API_SHUTDOWN_TIMEOUT_MS);

const application = express();
application.disable("x-powered-by");

async function closeDependencies(): Promise<void> {
  const shutdownResults = await Promise.allSettled([closeRedis(), closeDatabasePool()]);
  const shutdownErrors = shutdownResults
    .filter((result): result is PromiseRejectedResult => result.status === "rejected")
    .map((result) => result.reason);

  if (shutdownErrors.length > 0) {
    throw new AggregateError(shutdownErrors, "Failed to close API dependencies cleanly.");
  }
}

function isEntrypointModule(): boolean {
  return process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
}

async function listen(applicationInstance: typeof application, listenPort: number): Promise<Server> {
  return await new Promise<Server>((resolve, reject) => {
    const server = applicationInstance.listen(listenPort);

    const handleListening = () => {
      server.off("error", handleError);
      resolve(server);
    };
    const handleError = (error: Error) => {
      server.off("listening", handleListening);
      reject(error);
    };

    server.once("listening", handleListening);
    server.once("error", handleError);
  });
}

application.get("/health", async (_request: Request, response: Response) => {
  const [database, redis] = await Promise.all([getDatabaseHealth(), getRedisHealth()]);
  const summary = summarizeServiceHealth([
    {
      name: "database",
      status: database.status,
      required: database.required,
    },
    {
      name: "redis",
      status: redis.status,
      required: redis.required,
    },
  ]);

  response.status(summary.httpStatus).json({
    status: summary.status,
    service: "api",
    message: summary.message,
    port,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    database,
    redis,
  });
});

application.get("/api/hello", (_request: Request, response: Response) => {
  response.json({
    message: "Hello from Express",
  });
});

async function startServer(): Promise<void> {
  let server: Server | undefined;

  try {
    await verifyDatabaseConnection();
    await initRedis();
    server = await listen(application, port);
  } catch (error) {
    console.error("Failed to start the API.", error);

    try {
      await closeDependencies();
    } catch (cleanupError) {
      console.error("Failed to clean up API dependencies after startup failure.", cleanupError);
    }

    process.exit(1);
  }

  console.log(`starter api listening on http://localhost:${port}`);

  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      console.error(`Received ${signal} during shutdown. Forcing exit.`);
      process.exit(1);
    }

    isShuttingDown = true;
    console.log(`Received ${signal}. Closing HTTP server, Redis client, and PostgreSQL pool.`);
    const forcedShutdownTimer = setTimeout(() => {
      console.error(`HTTP shutdown exceeded ${shutdownTimeoutMs}ms. Forcing exit.`);
      server.closeAllConnections?.();
      process.exit(1);
    }, shutdownTimeoutMs);
    forcedShutdownTimer.unref?.();
    server.closeIdleConnections?.();

    server.close(async (error) => {
      if (error) {
        console.error("Failed to close the HTTP server cleanly.", error);
        process.exitCode = 1;
      }

      try {
        await closeDependencies();
      } catch (shutdownError) {
        console.error("Failed to close API dependencies cleanly.", shutdownError);
        process.exitCode = 1;
      } finally {
        clearTimeout(forcedShutdownTimer);
      }

      process.exit(process.exitCode ?? 0);
    });
  };

  process.once("SIGINT", () => {
    shutdown("SIGINT");
  });

  process.once("SIGTERM", () => {
    shutdown("SIGTERM");
  });
}

if (isEntrypointModule()) {
  await startServer();
}
