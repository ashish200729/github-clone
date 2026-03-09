import express, { type Request, type Response } from "express";
import { closeDatabasePool, verifyDatabaseConnection } from "./db/index.js";

const port = Number(process.env.API_PORT ?? 4000);

const application = express();

application.get("/health", (_request: Request, response: Response) => {
  response.json({
    status: "ok",
    service: "api",
    message: "Hello from the API starter",
    port,
  });
});

application.get("/api/hello", (_request: Request, response: Response) => {
  response.json({
    message: "Hello from Express",
  });
});

async function startServer(): Promise<void> {
  try {
    await verifyDatabaseConnection();
  } catch (error) {
    console.error("Failed to initialize PostgreSQL for the API.", error);
    await closeDatabasePool();
    process.exit(1);
  }

  const server = application.listen(port, () => {
    console.log(`starter api listening on http://localhost:${port}`);
  });

  let isShuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`Received ${signal}. Closing HTTP server and PostgreSQL pool.`);

    server.close(async (error) => {
      if (error) {
        console.error("Failed to close the HTTP server cleanly.", error);
        process.exitCode = 1;
      }

      try {
        await closeDatabasePool();
      } catch (databaseError) {
        console.error("Failed to close the PostgreSQL pool cleanly.", databaseError);
        process.exitCode = 1;
      }

      process.exit();
    });
  };

  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });
}

await startServer();
