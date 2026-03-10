import assert from "node:assert/strict";
import test from "node:test";
import { buildGitCloneUrl, loadGitServiceConfig } from "../src/git-service/config.js";

test("loadGitServiceConfig defaults the public Git HTTP base path", () => {
  const config = loadGitServiceConfig({
    GIT_SERVICE_URL: "http://localhost:8080",
    GIT_HTTP_BASE_URL: "https://git.example.com",
    GIT_SERVICE_INTERNAL_TOKEN: "internal-token",
    GIT_TRANSPORT_TOKEN_SECRET: "transport-secret",
  });

  assert.equal(config.httpBasePath, "/git");
});

test("buildGitCloneUrl honors a custom Git HTTP base path", () => {
  const cloneUrl = buildGitCloneUrl("ashish", "project-alpha", {
    cloneBaseUrl: "https://git.example.com",
    httpBasePath: "/scm",
  });

  assert.equal(cloneUrl, "https://git.example.com/scm/ashish/project-alpha.git");
});

test("buildGitCloneUrl preserves an existing clone base path prefix without duplicating the Git mount", () => {
  const cloneUrl = buildGitCloneUrl("ashish", "project-alpha", {
    cloneBaseUrl: "https://git.example.com/proxy/git",
    httpBasePath: "/git",
  });

  assert.equal(cloneUrl, "https://git.example.com/proxy/git/ashish/project-alpha.git");
});
