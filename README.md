# Web3 Social Platform Phase 0

This is the foundational scaffold for the Web3-native social platform monorepo.

## Stack
- Runtime: Node.js (v20+) with TypeScript
- Framework: Fastify
- ORM: Drizzle ORM
- Database: PostgreSQL 16
- Cache/Queue: Redis 7
- Package manager: pnpm (v8+) workspaces

## Setup Instructions

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   # Update .env if necessary
   ```

3. **Start Infrastructure Services**
   The project requires PostgreSQL and Redis. Use Docker Compose to start them locally:
   ```bash
   docker-compose up -d
   ```

4. **Run Database Migrations**
   Generate and push database migrations via Drizzle:
   ```bash
   pnpm migrate:generate
   pnpm migrate
   ```

5. **Start Dev Server**
   Start the Fastify API (apps/api) in watch mode:
   ```bash
   pnpm dev
   ```
   The API will be accessible at `http://localhost:3000`. You can test the health endpoint at `GET /health`.

## Monorepo Commands
- `pnpm test` - Runs Vitest across all workspaces.
- `pnpm lint` - Runs ESLint across all workspaces.
- `pnpm typecheck` - Runs tsc without emitting across workspaces.
- `pnpm build` - Builds all packages.
