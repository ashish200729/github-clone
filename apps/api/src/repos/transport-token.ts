import { createHmac } from "node:crypto";
import { loadGitServiceConfig } from "../git-service/config.js";

export interface GitTransportTokenPayload {
  aud: "github-clone-git";
  iss: "github-clone-api";
  sub: string;
  owner: string;
  repo: string;
  scope: Array<"read" | "write">;
  iat: number;
  exp: number;
}

function createSignature(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function buildGitTransportToken(
  payload: Omit<GitTransportTokenPayload, "aud" | "iss" | "iat" | "exp">,
  now = new Date(),
): { token: string; expiresAt: string } {
  const config = loadGitServiceConfig();
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + config.transportTokenTtlSeconds;

  const signedPayload: GitTransportTokenPayload = {
    aud: "github-clone-git",
    iss: "github-clone-api",
    ...payload,
    iat: issuedAt,
    exp: expiresAt,
  };

  const encodedPayload = Buffer.from(JSON.stringify(signedPayload)).toString("base64url");
  const encodedSignature = createSignature(encodedPayload, config.transportTokenSecret);

  return {
    token: `${encodedPayload}.${encodedSignature}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}
