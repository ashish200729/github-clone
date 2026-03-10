# GitHub Clone

Monorepo for a Git hosting prototype with:

- `apps/web`: Next.js 16 App Router UI with Auth.js
- `apps/api`: Express API for repository metadata, authz, and orchestration
- `apps/git-service`: Go service for bare repository storage, Git reads/writes, and smart HTTP transport

## Repository Core

This phase implements the first real repository workflow:

- create public or private repositories from the UI
- optionally initialize a repository with a README
- browse branches, commits, trees, and blobs in the browser
- handle empty repositories as first-class states
- create files and upload multiple files from the browser as real commits
- clone, fetch, and push with real Git over smart HTTP
- enforce visibility rules in both the API and the Git transport layer

Repository metadata lives in PostgreSQL. Git objects and refs live only in the Git service under the configured repository root.

## Reliability Hardening

The current stack now also includes:

- Redis-backed rate limiting for high-risk API routes
- BullMQ queue infrastructure for repository follow-up work
- a separate repository worker process
- SSE-based live repository status updates
- queue and worker visibility in health reporting
- explicit degraded-mode handling when live updates or worker state are unavailable

## Quick Start

1. Install Node.js 20+ and Go 1.25+.
2. Run `npm install`.
3. Copy these env templates:
   - `apps/web/.env.example` -> `apps/web/.env`
   - `apps/api/.env.example` -> `apps/api/.env`
   - `apps/git-service/.env.example` -> `apps/git-service/.env`
4. Set the shared secrets consistently:
   - `INTERNAL_API_AUTH_SECRET` must match in `apps/web` and `apps/api`
   - `GIT_SERVICE_INTERNAL_TOKEN` must match in `apps/api` and `apps/git-service`
   - `GIT_TRANSPORT_TOKEN_SECRET` must match in `apps/api` and `apps/git-service`
5. Set `GIT_REPOSITORY_ROOT` in `apps/git-service/.env` to a writable absolute directory outside the repo working tree.
6. Run the API migrations:
   - `npm run db:migrate --workspace apps/api`
7. Start the stack:
   - `npm run dev`

Default local ports:

- web: `http://localhost:3000`
- api: `http://localhost:4000`
- git-service: `http://localhost:8080`

`npm run dev` now runs:

- Next.js web app
- Express API
- BullMQ worker
- Go git-service

## Environment

### `apps/web`

Required:

- `AUTH_SECRET`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`
- `DATABASE_URL`
- `API_INTERNAL_URL`
- `INTERNAL_API_AUTH_SECRET`

Optional:

- `DATABASE_SSL`
- `AUTH_URL`

### `apps/api`

Required:

- `INTERNAL_API_AUTH_SECRET`
- `GIT_SERVICE_URL`
- `GIT_HTTP_BASE_URL`
- `GIT_SERVICE_INTERNAL_TOKEN`
- `GIT_TRANSPORT_TOKEN_SECRET`
- `DATABASE_URL`

Optional:

- `GIT_TRANSPORT_TOKEN_TTL_SECONDS` default `43200`
- `GIT_HTTP_BASE_PATH` default `/git`
- `DATABASE_POOL_MAX`
- `DATABASE_IDLE_TIMEOUT_MS`
- `DATABASE_CONNECTION_TIMEOUT_MS`
- `DATABASE_SSL`
- `REDIS_URL`
- `REDIS_KEY_PREFIX`
- `REDIS_CONNECT_TIMEOUT_MS`
- `REDIS_REQUIRED`

### `apps/git-service`

Required:

- `GIT_REPOSITORY_ROOT`
- `GIT_SERVICE_INTERNAL_TOKEN`
- `GIT_TRANSPORT_TOKEN_SECRET`
- `DATABASE_URL`

Optional:

- `GIT_SERVICE_PORT` default `8080`
- `GIT_HTTP_BASE_PATH` default `/git`
- `DATABASE_SSL`

## Auth and Trust Boundaries

- Browser users authenticate with GitHub OAuth through Auth.js in `apps/web`.
- Next.js server actions and server components forward identity to Express using a short-lived HMAC-signed internal actor token.
- Express does not trust browser-provided user IDs.
- Git CLI access does not use browser cookies.
- Private clone/fetch and all pushes use a temporary repo-scoped Git transport token generated from the repository page.

## Repository Metadata Model

PostgreSQL owns:

- `auth.users`
- `auth.accounts`
- `auth.sessions`
- `public.repositories`

`public.repositories` stores:

- repository id
- owner id
- repository name
- description
- visibility
- default branch
- storage key
- empty/initialized state
- timestamps

Bare repositories live under:

- `${GIT_REPOSITORY_ROOT}/{storage_key}.git`

## API Surface

Express exposes repository routes under `/api/repos`:

- `POST /api/repos`
- `GET /api/repos`
- `GET /api/repos/:owner/:repo`
- `GET /api/repos/:owner/:repo/branches`
- `GET /api/repos/:owner/:repo/commits`
- `GET /api/repos/:owner/:repo/tree`
- `GET /api/repos/:owner/:repo/blob`
- `POST /api/repos/:owner/:repo/upload`
- `POST /api/repos/:owner/:repo/files`
- `POST /api/repos/:owner/:repo/git-token`

The Go service exposes:

- internal JSON routes under `/internal/repos/...` for Express orchestration
- Git smart HTTP transport under `GIT_HTTP_BASE_PATH/:owner/:repo.git/...` where `GIT_HTTP_BASE_PATH` defaults to `/git`

Live update proxy:

- Next.js SSE route at `/api/live`

Internal live stream:

- Express internal SSE route at `/api/internal/live`

## Rate Limiting

Redis-backed rate limiting is applied narrowly by endpoint class.

- repo creation: strict authenticated write limit
- repo file/upload writes: authenticated write limit
- git token generation: authenticated write limit
- expensive repo reads such as tree/blob/commits/overview: softer read limit
- auth sign-in and callback abuse protection: handled on the web auth route with Redis counters
- live update stream reconnects: limited on the internal live stream

Policy direction:

- write-heavy and abuse-prone routes fail closed if the limiter store is unavailable
- read-heavy routes are allowed to degrade more gracefully

## Queue and Worker

BullMQ is used for follow-up repository synchronization work.

- queue name: `repo-maintenance`
- worker entrypoint: `apps/api/src/worker.ts`
- the worker warms repo read caches and emits live repository sync events
- queue jobs are keyed per repository to avoid duplicate job storms
- retries use bounded exponential backoff

Health now reports queue state and worker heartbeat so the app can show degraded-but-working status instead of pretending everything is healthy.

## Local Usage

### Create a repository

1. Sign in at `http://localhost:3000/sign-in`.
2. Open `http://localhost:3000/repos/new`.
3. Choose visibility and optional README initialization.
4. After creation you are redirected to `/:owner/:repo`.

### Empty repository flow

The repo page shows:

- clone URL
- push instructions
- create-file form
- browser upload form
- Git token generation for private repos

### Clone a public repository

If you keep the default `GIT_HTTP_BASE_PATH=/git`:

```bash
git clone http://localhost:8080/git/<owner>/<repo>.git
```

If you change `GIT_HTTP_BASE_PATH`, set the same value in both `apps/api` and `apps/git-service`, and replace `/git` in the clone URL with that configured base path.

### Clone or push a private repository

1. Open the repository page as the owner.
2. Generate a temporary Git token.
3. Use the clone URL shown on the page.
4. When Git prompts for credentials:
   - username: the repository owner handle
   - password: the generated token

### Push an existing local repository

With the default `GIT_HTTP_BASE_PATH=/git`:

```bash
git remote add origin http://localhost:8080/git/<owner>/<repo>.git
git push -u origin main
```

If the Git HTTP base path is customized, use that configured path instead of `/git`.

If the repository is private, Git prompts for the temporary token.

## Browser Write Workflow

The browser UI supports:

- creating a new file with a commit message
- uploading multiple files in the current directory as one commit

Current limitations:

- folder upload is intentionally postponed
- large binary files are not previewed in the browser
- README preview is rendered as safe plain text, not full Markdown HTML

Follow-up repository cache warming and live status updates happen in the background through the worker. Core writes still complete inline so existing behavior stays the same.

## Live Updates

Repository pages subscribe to an SSE stream through `/api/live`.

- live status is scoped to the authenticated user and current repository
- the UI handles connecting, reconnecting, and degraded states
- duplicate events are suppressed by job/status keys
- terminal repository sync events trigger a refresh so the page picks up warmed read models

## Public and Private Behavior

Guests:

- can browse public repositories
- can clone public repositories
- cannot create repos
- cannot push or use browser write flows

Signed-in users:

- can create repositories
- can browse their own public and private repositories
- can browse other users' public repositories
- cannot browse other users' private repositories

Repository owners:

- can push with a temporary Git token
- can upload and create files from the browser
- can generate private clone credentials from the repository page

## Verification

### Automated

- `npm run typecheck --workspace apps/api`
- `npm test --workspace apps/api`
- `npm run build --workspace apps/api`
- `npm run typecheck --workspace apps/web`
- `npm test --workspace apps/web`
- `../../node_modules/.bin/next build --webpack` from `apps/web`
- `cd apps/git-service && GOCACHE=/tmp/github-clone-go-cache go test ./...`

### Manual

1. Create a public repository.
2. Create a private repository.
3. Create an empty repository and verify the empty-state instructions.
4. Create a repository with README initialization and verify the default branch and first commit.
5. Clone a public repository.
6. Generate a Git token and push to your own repository.
7. Verify push rejection without a token or with the wrong owner token.
8. Browse tree, blob, and commits pages in the web UI.
9. Upload files through the browser.
10. Create a new file through the browser.
11. Verify private repository access is denied for a different user or a guest.
12. Verify invalid branches and paths return safe not-found or validation states.
13. Verify repeated write actions hit rate limits instead of duplicating work.
14. Verify the worker heartbeat appears in `/health`.
15. Verify a repo page shows live repository sync status during upload/create-file follow-up work.

## Known Limitations

- repo writes still complete inline; the queue currently handles follow-up synchronization and live-update fan-out rather than replacing core writes
- auth abuse protection is scoped to the Auth.js route surface, not a full standalone auth gateway
- live updates use SSE and user-scoped repo events only; there is no general realtime platform

- no collaborators, pull requests, issues, or stars yet
- no SSH transport or long-lived personal access tokens
- no branch protection rules
- no folder upload in the browser
- no Markdown HTML renderer for README preview
