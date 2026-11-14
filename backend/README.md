# FutGrid Backend

Fastify + Prisma + Redis API for FutGrid Phase 1: accounts, server-verified sessions,
leaderboards, guest records, and the shared `@futgrid/game-core` rules package.

## Requirements

- Node.js 20+
- npm 10+
- Docker (for local PostgreSQL 16 and Redis 7)
- PostgreSQL 16 and Redis 7 if not using Docker

## Local setup

From the repository root:

```bash
npm install
cd backend
docker compose up -d
```

The compose file maps PostgreSQL to `5433` and Redis to `6380` to avoid clashing with
services already running on the default ports.

Fill `backend/.env`. The file intentionally contains only variable names. Use these
values for the local Docker setup:

```dotenv
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=public
REDIS_URL=redis://localhost:6380/0
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
JWT_ACCESS_SECRET=<at least 32 random characters>
TOKEN_PEPPER=<random secret>
IP_HASH_SALT=<random secret>
COOKIE_DOMAIN=
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:5173,https://futgrid.az,https://www.futgrid.az,https://staging.futgrid.az,capacitor://localhost,https://localhost
APP_URL=http://localhost:5173
API_URL=http://localhost:3000
DATA_DIR=../packages/game-core/data
DATA_VERSION=v1
RESEND_API_KEY=
EMAIL_FROM=FutGrid <info@futgrid.az>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/v1/auth/google/callback
SENTRY_DSN=
SWAGGER_ENABLED=true
GAME_SESSION_TTL_MINUTES=120
DAILY_RANKED_LIMIT=5
TEAM_LEADERBOARD_TOP=5
RATE_LIMIT_ENABLED=true
TRUST_PROXY=true
LOG_PRETTY=false
```

Generate secrets locally, for example:

```bash
openssl rand -hex 32
```

Do not commit `.env`. `.env.example` is the committed key template.

`futgrid_app/.env` contains only `VITE_API_URL=`. Set it to:

```dotenv
VITE_API_URL=http://localhost:3000/v1
```

For production use `https://api.futgrid.az/v1`.

## Database

```bash
npm run prisma:generate
DATABASE_URL='postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=public' \
  npm run prisma:deploy
```

For a new migration during development:

```bash
DATABASE_URL='postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=public' \
  npm run prisma:migrate -- --name <migration_name>
```

The Phase 1 schema is in `prisma/schema.prisma`. The initial migration is
`prisma/migrations/0001_init`.

## Run

```bash
npm run dev       # tsx watch
npm run build
npm run start
```

OpenAPI is available at `http://localhost:3000/docs` when `SWAGGER_ENABLED=true`.

Health check: `GET http://localhost:3000/health`.

## Tests

Tests use PostgreSQL schema `test` and Redis database `15`.

```bash
DATABASE_URL='postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=test' \
  npx prisma migrate deploy
npm test
```

The test setup defaults to the Docker ports. CI uses the service containers defined in
`.github/workflows/ci.yml`.

## Email in development

Without `RESEND_API_KEY`, email is not sent. The backend writes the message to
`backend/.mail-outbox/` and logs only the outbox path, not the token. Open the generated
HTML file to follow verification/reset links.

## Google OAuth

Create a Google OAuth web client and set:

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/v1/auth/google/callback
```

Authorized redirect URI must match `GOOGLE_REDIRECT_URI`. Without these values the
Google routes return `503 OAUTH_NOT_CONFIGURED`; email/password auth still works.

## Data version

Phase 1 uses the immutable bundle at `packages/game-core/data` with
`DATA_VERSION=v1`. The Phase 3 pipeline will publish versioned bundles to the CDN and
change only the version pointer.

## API summary

- `POST /v1/auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all`
- `GET /v1/auth/google`, `/auth/google/callback`
- `POST /v1/auth/verify-email`, `/forgot-password`, `/reset-password`
- `GET/PATCH/DELETE /v1/me`, `PUT /v1/me/settings/:gameKey`
- `POST /v1/me/import-guest`, `GET /v1/me/export`
- `POST /v1/sessions`, `POST /v1/sessions/:id/finish`, `POST /v1/events`
- `GET /v1/leaderboard`, `/leaderboard/me`, `/leaderboard/teams`

All player endpoints accept `X-Guest-Id: <uuid>` when no account is signed in. Web uses
HttpOnly cookies; mobile sends `X-Client: mobile` and receives tokens in the response
body, then uses `Authorization: Bearer <access>`.

## Decisions and assumptions

- `TODO.txt` is the source of truth because the specification PDF is not in the repository.
- User deletion is a soft delete: the account is anonymized, results stay in the ledger,
  and leaderboard display becomes `Deleted user`.
- A ranked-session day starts at 00:00 Asia/Baku. Only the first five ranked sessions per
  game per user/guest per day are counted on leaderboards.
- Guest records imported through `/me/import-guest` never award ranked points.
- The initial data bundle is local JSON (`v1`), replaced by the Phase 3 pipeline.
- Phase 1 accepts the client's auction win/loss flags because the auction UI is not yet
  server-authoritative; all other game answers are rebuilt and verified server-side.
- Leaderboard ties use Redis member ordering in Phase 1; earlier-to-score tie-breaking is
  a planned refinement when the projection stores timestamps.
- The frontend receives the session hook and API client in Phase 1; each game screen's
  puzzle generation still needs to be switched to the shared seed path as ranked UI work
  continues.

## Deferred

Daily XOX/Wordle, GOAT voting, contact form, homepage stats, admin panel/TOTP, data and
image pipelines, duels, Elo, mobile push, analytics, and prizes.
