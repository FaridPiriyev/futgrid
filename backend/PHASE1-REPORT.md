# Phase 1 Report — Account & Ranking

## Built

- npm workspace root linking `futgrid_app`, `backend`, and `packages/game-core`
- Fastify 5 + TypeScript strict backend
- Prisma schema, initial migration, and all 13 Phase 1 tables
- `@futgrid/game-core` with deterministic builders, verifiers, scorers, and tests for all
  11 ranked games
- Auth: register, login, refresh rotation with reuse detection, logout, logout-all, email
  verification, forgot/reset password, Google OAuth
- Users: `/me`, profile updates, per-game settings, guest record import, JSON export,
  soft delete
- Sessions: create, finish, event recording, server-side puzzle rebuild and verification,
  timing sanity checks, five-per-day ranked limit, flag detection, append-only ledger,
  stats updates, Redis leaderboard projection
- Leaderboards: weekly/monthly/all-time, per-game, team ranking, current-user rank and
  neighbors, Redis rebuild from ledger, 30-second response cache, scheduled snapshots
- Security: helmet/HSTS, CORS allowlist, Origin checks for cookie mutations, Zod request
  validation, argon2id passwords, hashed tokens, hashed IPs, scoped rate limits
- OpenAPI/Swagger at `/docs` when enabled
- Docker Compose for PostgreSQL 16 and Redis 7
- CI workflow for lint, typecheck, test, and build
- Minimal frontend integration: API client, guest-id bootstrap, auth provider, account
  page, navbar account route/initials, ranked-session hook, pending-result queue

## Tests

- `packages/game-core`: 48 tests covering all 11 games, seed reproducibility, invalid
  answers, and known scoring cases
- `backend`: integration tests for auth verification/login/refresh reuse, password reset, guest
  session lifecycle, daily limit, double-finish, expiry, invalid answers, guest import,
  export, soft delete, and leaderboard placement

## Deferred

- Daily XOX and Wordle
- GOAT voting and ranking
- Contact form and homepage statistics
- Admin panel and mandatory TOTP
- Versioned data pipeline, image pipeline, market values
- Real-time duels, Elo, FCM push

## Deviations and decisions needing review

1. The specification PDF is not present in the repository. `TODO.txt` was used as the
   source of truth. Details not present there are documented as assumptions in
   `backend/README.md` and `backend/PLAN.md`.
2. Auction scoring accepts the client's per-lot win/loss flags. The other games are fully
   server-verified. A fully server-authoritative auction simulation is deferred.
3. Leaderboard ties currently use Redis member ordering. Earlier-to-score tie-breaking
   needs a timestamp-aware projection.
4. The shared `game-core` package is implemented and tested, but the existing game
   screens still use their local generators. `useRankedSession` and the API client are
   ready; wiring each ranked game UI to the server seed is the remaining frontend work.
5. Email delivery in development writes HTML to `backend/.mail-outbox/`. Production uses
   Resend and requires `RESEND_API_KEY`.
6. Google OAuth is implemented but requires Google client credentials to activate.

## How to verify

```bash
npm install
cd backend
docker compose up -d
# fill backend/.env using backend/README.md
DATABASE_URL='postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=public' \
  npm run prisma:deploy
npm run test --workspace @futgrid/game-core
npm run test --workspace @futgrid/backend
npm run lint
npm run typecheck
npm run build
```
