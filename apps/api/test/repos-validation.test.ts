import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../src/http/errors.js";
import {
  MAX_UPLOAD_FILE_BYTES,
  normalizeRepositoryPath,
  parseUploadInput,
  validateBranchName,
  validateRepositoryName,
} from "../src/repos/validation.js";

test("validateRepositoryName accepts safe slugs and rejects traversal-like input", () => {
  assert.equal(validateRepositoryName("project-alpha"), "project-alpha");

  assert.throws(() => validateRepositoryName("../secret"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "INVALID_REPOSITORY_NAME");
    return true;
  });
});

test("validateBranchName rejects invalid Git refs", () => {
  assert.equal(validateBranchName("feature/refactor"), "feature/refactor");

  assert.throws(() => validateBranchName("bad..branch"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "INVALID_BRANCH");
    return true;
  });
});

test("normalizeRepositoryPath rejects traversal and preserves normalized repo paths", () => {
  assert.equal(normalizeRepositoryPath("docs/intro.md"), "docs/intro.md");

  assert.throws(() => normalizeRepositoryPath("../etc/passwd"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "INVALID_PATH");
    return true;
  });
});

test("parseUploadInput enforces duplicate-path and size protections", () => {
  const payload = parseUploadInput({
    branch: "main",
    path: "",
    commitMessage: "Upload files",
    files: [
      {
        path: "README.md",
        sizeBytes: 5,
        contentBase64: Buffer.from("hello").toString("base64"),
      },
    ],
  });

  assert.equal(payload.files[0]?.path, "README.md");

  assert.throws(
    () =>
      parseUploadInput({
        branch: "main",
        files: [
          {
            path: "README.md",
            sizeBytes: 5,
            contentBase64: "aGVsbG8=",
          },
          {
            path: "README.md",
            sizeBytes: 5,
            contentBase64: "aGVsbG8=",
          },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, "INVALID_UPLOAD");
      return true;
    },
  );
});

test("parseUploadInput rejects uploads whose declared size does not match the base64 payload", () => {
  assert.throws(
    () =>
      parseUploadInput({
        branch: "main",
        files: [
          {
            path: "README.md",
            sizeBytes: 1,
            contentBase64: Buffer.from("hello").toString("base64"),
          },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, "INVALID_UPLOAD");
      assert.match(error.message, /size does not match/i);
      return true;
    },
  );
});

test("parseUploadInput enforces upload size limits from the decoded payload", () => {
  const oversizedContent = Buffer.alloc(MAX_UPLOAD_FILE_BYTES + 1, 65).toString("base64");

  assert.throws(
    () =>
      parseUploadInput({
        branch: "main",
        files: [
          {
            path: "large.bin",
            sizeBytes: MAX_UPLOAD_FILE_BYTES + 1,
            contentBase64: oversizedContent,
          },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, "INVALID_UPLOAD");
      assert.match(error.message, /exceeds/i);
      return true;
    },
  );
});
