import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  __resetRedisStateForTests,
  __setRedisClientFactoryForTests,
  buildRedisKey,
  closeRedis,
  delKey,
  getJson,
  getRedisHealth,
  initRedis,
  setJson,
} from "../src/redis/client.js";

type EventHandler = (...args: unknown[]) => void;

class MockRedisClient {
  public isOpen = false;
  public isReady = false;
  public connectCalls = 0;
  public pingCalls = 0;
  public destroyCalls = 0;
  public closeCalls = 0;
  public delCalls = 0;
  public lastSetOptions: unknown;
  public store = new Map<string, string>();
  private readonly handlers = new Map<string, EventHandler[]>();

  constructor(
    private readonly options: {
      failConnect?: boolean;
      failPing?: boolean;
      failClose?: boolean;
    } = {},
  ) {}

  on(event: string, handler: EventHandler): this {
    const existingHandlers = this.handlers.get(event) ?? [];
    existingHandlers.push(handler);
    this.handlers.set(event, existingHandlers);
    return this;
  }

  async connect(): Promise<void> {
    this.connectCalls += 1;

    if (this.options.failConnect) {
      throw new Error("connect failed");
    }

    this.isOpen = true;
    this.emit("connect");
    this.isReady = true;
    this.emit("ready");
  }

  async ping(): Promise<string> {
    this.pingCalls += 1;

    if (this.options.failPing) {
      throw new Error("ping failed");
    }

    return "PONG";
  }

  async set(key: string, value: string, options?: unknown): Promise<void> {
    this.store.set(key, value);
    this.lastSetOptions = options;
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async del(key: string): Promise<number> {
    this.delCalls += 1;
    return this.store.delete(key) ? 1 : 0;
  }

  async close(): Promise<void> {
    this.closeCalls += 1;

    if (this.options.failClose) {
      throw new Error("close failed");
    }

    this.isOpen = false;
    this.isReady = false;
    this.emit("end");
  }

  destroy(): void {
    this.destroyCalls += 1;
    this.isOpen = false;
    this.isReady = false;
    this.emit("end");
  }

  private emit(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }
}

const originalEnvironment = {
  ...process.env,
};

function restoreEnvironment(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnvironment);
}

beforeEach(() => {
  restoreEnvironment();
  __resetRedisStateForTests();
});

afterEach(() => {
  restoreEnvironment();
  __resetRedisStateForTests();
});

test("initRedis creates only one client and reuses the same startup promise", async () => {
  let createdClients = 0;
  const client = new MockRedisClient();

  process.env.REDIS_URL = "redis://localhost:6379";

  __setRedisClientFactoryForTests(() => {
    createdClients += 1;
    return client as never;
  });

  const [firstClient, secondClient] = await Promise.all([initRedis(), initRedis()]);

  assert.equal(firstClient, client);
  assert.equal(secondClient, client);
  assert.equal(createdClients, 1);
  assert.equal(client.connectCalls, 1);
  assert.equal(client.pingCalls, 1);
});

test("initRedis degrades cleanly when Redis is optional and unavailable", async () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (message: string) => {
    warnings.push(message);
  };

  process.env.REDIS_REQUIRED = "false";
  delete process.env.REDIS_URL;

  try {
    const result = await initRedis();
    const health = await getRedisHealth();

    assert.equal(result, undefined);
    assert.equal(health.status, "degraded");
    assert.equal(health.required, false);
    assert.match(health.message, /REDIS_URL is required to enable Redis/);
    assert.equal(warnings.length, 1);
  } finally {
    console.warn = originalWarn;
  }
});

test("initRedis preserves an error health state when required Redis startup fails", async () => {
  const client = new MockRedisClient({ failPing: true });

  process.env.REDIS_URL = "redis://localhost:6379";

  __setRedisClientFactoryForTests(() => client as never);

  await assert.rejects(() => initRedis(), {
    message: /Redis startup check failed/,
  });

  const health = await getRedisHealth();
  assert.equal(health.status, "error");
  assert.equal(health.required, true);
  assert.match(health.message, /Redis startup check failed/);
});

test("buildRedisKey applies the configured prefix consistently", async () => {
  const client = new MockRedisClient();

  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.REDIS_KEY_PREFIX = "::ghclone:api::";

  __setRedisClientFactoryForTests(() => client as never);

  await initRedis();

  assert.equal(buildRedisKey("session", "abc123"), "ghclone:api:session:abc123");
});

test("setJson and getJson round-trip values with TTL support", async () => {
  const client = new MockRedisClient();

  process.env.REDIS_URL = "redis://localhost:6379";

  __setRedisClientFactoryForTests(() => client as never);

  await initRedis();
  await setJson("ghclone:api:session:1", { ok: true }, 60);

  assert.deepEqual(await getJson<{ ok: boolean }>("ghclone:api:session:1"), { ok: true });
  assert.deepEqual(client.lastSetOptions, {
    expiration: {
      type: "EX",
      value: 60,
    },
  });
});

test("getJson throws when Redis contains invalid JSON", async () => {
  const client = new MockRedisClient();

  process.env.REDIS_URL = "redis://localhost:6379";

  __setRedisClientFactoryForTests(() => client as never);

  await initRedis();
  client.store.set("ghclone:api:bad", "{oops");

  await assert.rejects(() => getJson("ghclone:api:bad"), {
    message: /does not contain valid JSON/,
  });
});

test("delKey delegates to the Redis client", async () => {
  const client = new MockRedisClient();

  process.env.REDIS_URL = "redis://localhost:6379";

  __setRedisClientFactoryForTests(() => client as never);

  await initRedis();
  client.store.set("ghclone:api:temp", JSON.stringify({ ok: true }));

  assert.equal(await delKey("ghclone:api:temp"), 1);
  assert.equal(client.delCalls, 1);
});

test("closeRedis clears its shutdown timeout after a successful close", async () => {
  const client = new MockRedisClient();

  process.env.REDIS_URL = "redis://localhost:6379";

  __setRedisClientFactoryForTests(() => client as never);

  await initRedis();

  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const scheduledTimeouts: Array<ReturnType<typeof setTimeout>> = [];
  const clearedTimeouts: Array<ReturnType<typeof setTimeout>> = [];

  globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    const handle = originalSetTimeout(() => undefined, timeout, ...args);
    scheduledTimeouts.push(handle);
    return handle;
  }) as typeof setTimeout;

  globalThis.clearTimeout = ((handle?: ReturnType<typeof setTimeout>) => {
    if (handle !== undefined) {
      clearedTimeouts.push(handle);
    }

    return originalClearTimeout(handle);
  }) as typeof clearTimeout;

  try {
    await closeRedis();
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }

  const health = await getRedisHealth();

  assert.equal(client.closeCalls, 1);
  assert.equal(scheduledTimeouts.length, 1);
  assert.deepEqual(clearedTimeouts, scheduledTimeouts);
  assert.equal(health.status, "error");
  assert.match(health.message, /Redis client is closed/);
});

test("closeRedis rejects after falling back to destroy when graceful shutdown fails", async () => {
  const client = new MockRedisClient({ failClose: true });

  process.env.REDIS_URL = "redis://localhost:6379";

  __setRedisClientFactoryForTests(() => client as never);

  await initRedis();
  await assert.rejects(() => closeRedis(), {
    message: /Failed to close Redis client gracefully: close failed/,
  });

  const health = await getRedisHealth();

  assert.equal(client.closeCalls, 1);
  assert.equal(client.destroyCalls, 1);
  assert.equal(health.status, "error");
  assert.match(health.message, /Failed to close Redis client gracefully: close failed/);
});
