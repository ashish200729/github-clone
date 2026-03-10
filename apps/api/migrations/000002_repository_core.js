export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE auth.users
      ADD COLUMN IF NOT EXISTS handle TEXT;

    ALTER TABLE auth.users
      ADD CONSTRAINT auth_users_handle_format_chk
      CHECK (handle IS NULL OR handle ~ '^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$');

    CREATE UNIQUE INDEX IF NOT EXISTS auth_users_handle_idx
      ON auth.users (handle)
      WHERE handle IS NOT NULL;

    CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TABLE IF NOT EXISTS public.repositories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
      default_branch TEXT NOT NULL DEFAULT 'main',
      storage_key TEXT NOT NULL UNIQUE,
      is_empty BOOLEAN NOT NULL DEFAULT TRUE,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      initialized_at TIMESTAMPTZ,
      last_pushed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT repositories_name_format_chk CHECK (name ~ '^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$'),
      CONSTRAINT repositories_unique_owner_name UNIQUE (owner_id, name)
    );

    DROP TRIGGER IF EXISTS repositories_set_updated_at ON public.repositories;

    CREATE TRIGGER repositories_set_updated_at
      BEFORE UPDATE ON public.repositories
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at_timestamp();

    CREATE INDEX IF NOT EXISTS repositories_owner_id_idx ON public.repositories (owner_id);
    CREATE INDEX IF NOT EXISTS repositories_visibility_idx ON public.repositories (visibility);
    CREATE INDEX IF NOT EXISTS repositories_last_pushed_at_idx ON public.repositories (last_pushed_at DESC);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS public.repositories_last_pushed_at_idx;
    DROP INDEX IF EXISTS public.repositories_visibility_idx;
    DROP INDEX IF EXISTS public.repositories_owner_id_idx;

    DROP TRIGGER IF EXISTS repositories_set_updated_at ON public.repositories;
    DROP TABLE IF EXISTS public.repositories;

    DROP FUNCTION IF EXISTS public.set_updated_at_timestamp;

    DROP INDEX IF EXISTS auth.auth_users_handle_idx;
    ALTER TABLE auth.users
      DROP CONSTRAINT IF EXISTS auth_users_handle_format_chk;
    ALTER TABLE auth.users
      DROP COLUMN IF EXISTS handle;
  `);
};
