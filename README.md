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

## Auth Setup

Authentication now lives in `apps/web` with Auth.js and GitHub OAuth.

- `apps/web/auth.ts` owns the Auth.js configuration
- `apps/web/app/api/auth/[...nextauth]/route.ts` exposes the callback/session routes
- PostgreSQL stores Auth.js users, accounts, sessions, and verification tokens under the existing `auth.*` schema
- Express does not run Auth.js and does not trust browser-supplied identities

### Session Strategy

This integration uses Auth.js database sessions.

- Why:
  - PostgreSQL is already part of the stack
  - server-side session revocation is safer for a Git hosting product than long-lived self-contained JWT sessions
  - it gives a cleaner path for future admin controls, PATs, SSH keys, and account management
- Client-visible session fields are intentionally minimal:
  - `user.id`
  - `user.name`
  - `user.email`
  - `user.image`
  - optional future-safe `role`

### Custom `auth` Schema Compatibility

The Auth.js PostgreSQL adapter uses a dedicated pool in `apps/web/lib/auth/postgres.ts`.

- The pool is isolated from other application DB access
- It sets `options=-c search_path=auth,public`
- Auth sign-in verification explicitly checks that these tables exist:
  - `auth.users`
  - `auth.accounts`
  - `auth.sessions`
  - `auth.verification_token`

If those tables are missing, sign-in fails closed instead of silently creating data in the wrong schema.

### Trusted Next.js to Express Boundary

Express is protected by a short-lived signed internal actor token.

- Next.js verifies the Auth.js session on the server
- Next.js mints a compact HMAC-signed actor token with:
  - authenticated user id
  - optional email
  - optional role
  - request method
  - request path
  - short expiry
- Express verifies that signature with `INTERNAL_API_AUTH_SECRET`
- Express rejects missing, expired, forged, or path/method-mismatched actor tokens

Browser clients cannot choose a user id for Express. The trusted identity only exists after a successful server-side Auth.js session check.

### Required Environment Variables

`apps/web/.env.example` shows the web auth contract.

- Required in `apps/web`:
  - `AUTH_SECRET`
  - `AUTH_GITHUB_ID`
  - `AUTH_GITHUB_SECRET`
  - `DATABASE_URL`
  - `API_INTERNAL_URL`
  - `INTERNAL_API_AUTH_SECRET`
- Optional in `apps/web`:
  - `DATABASE_SSL` values: `disable` or `require`
  - `AUTH_URL` when the deployment runtime cannot infer the public base URL safely

`apps/api/.env.example` now also requires:

- `INTERNAL_API_AUTH_SECRET`

Use the same `INTERNAL_API_AUTH_SECRET` value in `apps/web` and `apps/api`.

Generate `AUTH_SECRET` with either:

- `npx auth secret`
- `openssl rand -base64 33`

### GitHub OAuth App

Create a GitHub OAuth App with:

- Homepage URL:
  - local: `http://localhost:3000`
  - production: `https://your-domain.example`
- Authorization callback URL:
  - local: `http://localhost:3000/api/auth/callback/github`
  - production: `https://your-domain.example/api/auth/callback/github`

GitHub callback URLs must match exactly. If they do not, the callback fails safely and Auth.js redirects to the configured error page.

### Protected Routes

The Next.js app now protects:

- `/dashboard`
- `/repos/new`
- `/settings`

Protected server actions re-check the session before forwarding any request to Express.

### Redis

Redis is intentionally not part of the core Auth.js session storage in this phase.

- PostgreSQL remains the source of truth for users, accounts, and sessions
- Redis remains available for future auth-adjacent work such as sign-in rate limiting or short-lived anti-abuse state
- If Redis is unavailable and `REDIS_REQUIRED=false`, auth still works because it does not depend on Redis in this phase

### Local Verification Checklist

1. Copy the env examples into your local env files and provide real GitHub OAuth credentials.
2. Run `npm run db:migrate --workspace apps/api`.
3. Start the stack with `npm run dev`.
4. Open `http://localhost:3000/sign-in` and complete GitHub sign-in.
5. Confirm rows are created under `auth.users`, `auth.accounts`, and `auth.sessions`.
6. Visit `/dashboard`, `/repos/new`, and `/settings` while signed in.
7. Sign out and confirm those routes redirect back to sign-in.
8. Confirm direct requests to `http://localhost:4000/api/internal/viewer` fail without the trusted header.

### Automated Checks

- `npm run typecheck --workspace apps/web`
- `npm run lint --workspace apps/web`
- `npm test --workspace apps/web`
- `npm run typecheck --workspace apps/api`
- `npm test --workspace apps/api`

### Known Limitations and Next Steps

- GitHub is the only provider in this phase
- No passkeys, magic links, PATs, or SSH key management are included yet
- No advanced RBAC is implemented yet beyond a future-ready optional `role` field
- Repository authorization remains separate from simple “is signed in”

## Endpoints

- API: `GET /health`, `GET /api/hello`
  - `GET /api/internal/viewer` requires the trusted internal actor token
  - `POST /api/internal/repos` requires the trusted internal actor token
  - `GET /health` now includes `database` and `redis` dependency objects with `status`, `required`, `message`, and `latencyMs` when available
  - `GET /health` returns HTTP `503` when a required dependency is unhealthy, and HTTP `200` for healthy or degraded optional-dependency states
- Go service: `GET /health`, `GET /hello`
