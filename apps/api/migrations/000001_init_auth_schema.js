export const up = (pgm) => {
  pgm.sql(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      email TEXT UNIQUE,
      "emailVerified" TIMESTAMPTZ,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS auth.accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at BIGINT,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      oauth_token_secret TEXT,
      oauth_token TEXT,
      UNIQUE (provider, "providerAccountId")
    );

    CREATE TABLE IF NOT EXISTS auth.sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      "sessionToken" TEXT NOT NULL UNIQUE,
      "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      expires TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth.verification_token (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (identifier, token)
    );

    CREATE INDEX IF NOT EXISTS auth_accounts_user_id_idx ON auth.accounts ("userId");
    CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth.sessions ("userId");
    CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth.sessions (expires);
    CREATE INDEX IF NOT EXISTS auth_verification_token_expires_idx ON auth.verification_token (expires);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS auth.auth_verification_token_expires_idx;
    DROP INDEX IF EXISTS auth.auth_sessions_expires_idx;
    DROP INDEX IF EXISTS auth.auth_sessions_user_id_idx;
    DROP INDEX IF EXISTS auth.auth_accounts_user_id_idx;

    DROP TABLE IF EXISTS auth.accounts;
    DROP TABLE IF EXISTS auth.sessions;
    DROP TABLE IF EXISTS auth.verification_token;
    DROP TABLE IF EXISTS auth.users;
  `);
};
