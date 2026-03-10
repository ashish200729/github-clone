import assert from "node:assert/strict";
import test from "node:test";
import { buildOwnerHomePath, deriveOwnerHandle } from "../lib/auth/owner-handle";

test("deriveOwnerHandle falls back when a reserved route name would collide", () => {
  assert.equal(
    deriveOwnerHandle({
      id: "0d4516f5-b524-4d3a-aebf-8d3fe1f7a304",
      name: "Dashboard",
      email: "dashboard@example.com",
    }),
    "user-0d4516f5",
  );
});

test("buildOwnerHomePath encodes the owner handle as a path segment", () => {
  assert.equal(buildOwnerHomePath("ashish"), "/ashish");
  assert.equal(buildOwnerHomePath("team/demo"), "/team%2Fdemo");
});
