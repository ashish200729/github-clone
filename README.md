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

## Endpoints

- API: `GET /health`, `GET /api/hello`
- Go service: `GET /health`, `GET /hello`