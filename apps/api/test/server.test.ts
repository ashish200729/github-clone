import assert from "node:assert/strict";
import test from "node:test";
import { loadApiPort, loadShutdownTimeoutMs } from "../src/server.js";

test("loadApiPort defaults and validates strictly", () => {
  assert.equal(loadApiPort(undefined), 4000);
  assert.equal(loadApiPort("8080"), 8080);

  assert.throws(() => loadApiPort("8080http"), {
    message: "API_PORT must be a positive integer.",
  });

  assert.throws(() => loadApiPort("70000"), {
    message: "API_PORT must be an integer between 1 and 65535.",
  });
});

test("loadShutdownTimeoutMs defaults and validates strictly", () => {
  assert.equal(loadShutdownTimeoutMs(undefined), 10000);
  assert.equal(loadShutdownTimeoutMs("15000"), 15000);

  assert.throws(() => loadShutdownTimeoutMs("15s"), {
    message: "API_SHUTDOWN_TIMEOUT_MS must be a positive integer.",
  });
});
