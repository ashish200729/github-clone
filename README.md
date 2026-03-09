# GitHub Clone

Minimal starter monorepo with a Next.js frontend, an Express API, and a Go service.

## Apps

- `apps/web`: Next.js 16 app-router frontend
- `apps/api`: Express hello endpoint
- `apps/git-service`: Go hello endpoint

## Quick Start

1. Install Node.js 20+ and Go 1.22+.
2. Run `npm install`.
3. Start the app stack with `npm run dev`.

## Commands

- `npm run dev`: run web, API, and git-service together
- `npm run build`: build API and frontend
- `npm run lint`: lint the web app and typecheck the API
- `npm run typecheck`: typecheck the whole monorepo

## PostgreSQL Setup

The API now expects a PostgreSQL connection before it will start.

- Required env: `DATABASE_URL`
- Optional env:
  - `DATABASE_POOL_MAX` default `10`
  - `DATABASE_IDLE_TIMEOUT_MS` default `30000`
  - `DATABASE_CONNECTION_TIMEOUT_MS` default `10000`
  - `DATABASE_SSL` values: `disable` or `require`

Database commands for `apps/api`:

- `npm run db:migrate --workspace apps/api`
- `npm run db:rollback --workspace apps/api`
- `npm run db:status --workspace apps/api`

The API reads its database env from `apps/api/.env`.

The initial schema is intentionally custom and namespaced under `auth.*`. It is Auth.js-ready, but not the exact default Auth.js PostgreSQL adapter schema. A later Auth.js integration must use an adapter connection or pool configured with `search_path=auth,public` and must be verified explicitly.

## Redis Setup

The API also bootstraps Redis before it will serve requests.

- Required env:
  - `REDIS_URL` when `REDIS_REQUIRED=true`
- Optional env:
  - `API_SHUTDOWN_TIMEOUT_MS` default `10000`
  - `REDIS_KEY_PREFIX` default `ghclone:api:`
  - `REDIS_CONNECT_TIMEOUT_MS` default `10000`
  - `REDIS_REQUIRED` values: `true` or `false`, default `true`

Accepted Redis connection string schemes:

- `redis://`
- `rediss://`

If `REDIS_REQUIRED=true`, the API exits before `listen()` when the Redis env is invalid or Redis cannot answer `PING`.

If `REDIS_REQUIRED=false`, the API starts in degraded mode and `GET /health` reports Redis as degraded.

On `SIGINT` or `SIGTERM`, the API attempts a graceful shutdown. If the HTTP server has not drained within `API_SHUTDOWN_TIMEOUT_MS`, it force-closes open connections and exits with status `1`.

The API reads database and Redis env from `apps/api/.env`. Use `apps/api/.env.example` as the starter template.

## Endpoints

- API: `GET /health`, `GET /api/hello`
  - `GET /health` now includes `database` and `redis` dependency objects with `status`, `required`, `message`, and `latencyMs` when available
  - `GET /health` returns HTTP `503` when a required dependency is unhealthy, and HTTP `200` for healthy or degraded optional-dependency states
- Go service: `GET /health`, `GET /hello`
