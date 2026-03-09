import assert from "node:assert/strict";
import test from "node:test";
import { buildClientSession } from "../lib/auth/session";

test("buildClientSession exposes only the intended user fields", () => {
  const session = buildClientSession(
      {
        expires: new Date("2026-03-09T00:00:00.000Z").toISOString(),
        user: {
          name: null,
          email: null,
          image: null,
        },
      } as unknown as Parameters<typeof buildClientSession>[0],
    {
      id: "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304",
      name: "Ashish",
      email: "ashish@example.com",
      image: "https://example.com/avatar.png",
    },
  );

  assert.deepEqual(session.user, {
    id: "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304",
    name: "Ashish",
    email: "ashish@example.com",
    image: "https://example.com/avatar.png",
  });
});

test("buildClientSession rejects sessions without user ids", () => {
  assert.throws(
    () =>
      buildClientSession(
        {
          expires: new Date("2026-03-09T00:00:00.000Z").toISOString(),
          user: {},
        } as unknown as Parameters<typeof buildClientSession>[0],
        {},
      ),
    {
      message: "Authenticated session is missing user.id.",
    },
  );
});
