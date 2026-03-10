import assert from "node:assert/strict";
import test from "node:test";
import { buildRepoBlobPath, buildRepoCommitsPath, buildRepoHomePath, buildRepoSettingsPath, buildRepoTreePath } from "../lib/repos/routes";

test("repository route builders preserve branch query parameters and path encoding", () => {
  assert.equal(buildRepoHomePath("ashish", "project-alpha", "main"), "/ashish/project-alpha?branch=main");
  assert.equal(buildRepoTreePath("ashish", "project-alpha", "feature/demo", "docs/intro.md"), "/ashish/project-alpha/tree/docs/intro.md?branch=feature%2Fdemo");
  assert.equal(buildRepoBlobPath("ashish", "project-alpha", "main", "src/index.ts"), "/ashish/project-alpha/blob/src/index.ts?branch=main");
  assert.equal(buildRepoCommitsPath("ashish", "project-alpha", "release/v1"), "/ashish/project-alpha/commits?branch=release%2Fv1");
  assert.equal(buildRepoSettingsPath("ashish", "project-alpha"), "/ashish/project-alpha/settings");
});
