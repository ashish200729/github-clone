import express, { type Request, type Response } from "express";
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

application.listen(port, () => {
  console.log(`starter api listening on http://localhost:${port}`);
});