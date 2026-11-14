# FutGrid Backend Plan

## 1. Scope, Decisions, Assumptions

Phase 1 is the only phase implemented in this build: accounts, sessions, server-verified
scoring, guest support, leaderboards, records, and guest migration.

Decisions:

- `TODO.txt` is the source of truth because `FutGrid backend sənədi.pdf` is not in the
  repository.
- Phase 1 includes the account/ranking frontend integration. Home-page stats, the contact
  form, daily games, and GOAT voting remain Phase 2 work.
- The current `futgrid_app/public/data` JSON files are bundled as immutable data version
  `v1`. The Phase 3 pipeline replaces this bundle without changing the game-core contract.
- Development and test email delivery uses a console transport. Production uses Resend.
- User deletion is a soft delete. Leaderboard entries can continue to show `Deleted user`.
- Ranked sessions are limited to five scored sessions per game per user/guest per day.
- No prizes or analytics in Phase 1.
- Admin TOTP, data pipelines, daily games, duels, and mobile push are deferred to later
  phases.

Assumptions for details missing from the PDF:

- Opaque refresh tokens are random 256-bit values hashed with SHA-256 plus an
  `IP_HASH_SALT`-independent token pepper before storage.
- Access tokens are signed JWTs valid for 15 minutes. Refresh tokens are opaque and valid
  for 30 days, rotated on every use.
- Guest identities are server-created on first use if the supplied UUID is valid. A guest
  cannot be converted into a user except through `POST /me/import-guest`, which imports
  records only and never awards ranked points.
- Soft-deleted users keep their `user_game_stats` and ledger rows. Personal data is
  cleared; the leaderboard display becomes `Deleted user`.
- A session is owned by exactly one `userId` or `guestId`, never both.
- `points_ledger` is append-only. Corrections use compensating entries.

## 2. Repository And Tooling

```text
futgrid/
  package.json                  npm workspaces
  futgrid_app/                  existing frontend (integration files only)
  backend/                      Fastify + Prisma API
  packages/game-core/           pure deterministic game rules
  .github/workflows/ci.yml      lint, typecheck, test, build
```

Tooling:

- Node.js 20+, TypeScript strict mode
- Fastify 4, `fastify-type-provider-zod`, Zod
- PostgreSQL 16 + Prisma
- Redis 7 (`ioredis`)
- Vitest + Fastify injection (supertest available for HTTP-level tests)
- ESLint + Prettier
- pino JSON logs
- Docker Compose for local Postgres and Redis

Configuration is validated at boot with Zod. Secrets live only in `.env`.

## 3. Phase 1 Architecture And Data Flow

1. A client requests `POST /v1/sessions` with game, mode, difficulty, and settings.
   The server authenticates the user or guest, chooses a cryptographically random seed,
   records the session, and returns `{ sessionId, seed, dataVersion, expiresAt }`.
2. The client builds the puzzle locally from the seed and `dataVersion` using
   `@futgrid/game-core`. Gameplay never requires the API.
3. At the end, the client sends `POST /v1/sessions/:id/finish` with answers.
4. The server rebuilds the puzzle from the stored seed, verifies each answer, checks
   timing, computes the score, writes an append-only ledger row, updates stats and Redis.
5. Leaderboard reads use Redis sorted sets. If a projection is missing or empty, it is
   rebuilt from the ledger.
6. If the API is down, the frontend queues the finish payload in
   `futgrid:pending-results` and retries later.

Authentication transports:

- Web: `access` and `refresh` HttpOnly cookies.
- Mobile: `Authorization: Bearer <access token>`, refresh token in the response body.
- Guests: `X-Guest-Id: <uuid>` on every request that accepts a player.

## 4. Data Model

Phase 1 tables:

- `users`
- `oauth_accounts`
- `refresh_tokens`
- `email_tokens`
- `teams`
- `user_settings`
- `guest_links`
- `games`
- `game_sessions`
- `points_ledger`
- `user_game_stats`
- `leaderboard_snapshots`
- `events`

Rules:

- User/session/token IDs use UUIDs.
- Player and club IDs are integers from the data bundle.
- Every table has `created_at`; mutable tables have `updated_at`.
- Indexes cover unique auth lookups, session ownership/expiry, ledger aggregation, and
  leaderboard snapshot periods.
- `points_ledger` has no update/delete path in application code.

## 5. game-core Contract

Each ranked game exports:

```ts
buildPuzzle(seed: number, settings: GameSettings): Puzzle
verifyAnswer(game: GameKey, puzzle: Puzzle, answer: Answer): boolean
scoreResult(game: GameKey, puzzle: Puzzle, answers: Answer[]): ScoreBreakdown
```

All randomness comes from the seeded PRNG. No `fetch`, `localStorage`, translation
lookups, or `Math.random()` are allowed. The package exposes one registry so the backend
can dispatch by game key. The bundle is identified by `dataVersion: "v1"`.

## 6. Module Breakdown And Dependencies

Implementation order:

1. `packages/game-core`
2. Prisma schema/migration
3. Backend foundation (`config`, `db`, `redis`, `logger`, errors, i18n, security)
4. Auth
5. Users
6. Sessions
7. Leaderboards
8. Frontend integration
9. Hardening and documentation

Dependencies:

- Sessions depend on auth, users, game-core, ledger and Redis.
- Leaderboards depend on ledger, users, teams and Redis.
- Auth depends on foundation only.
- Frontend integration depends on auth, sessions, and leaderboard endpoints.

## 7. Phase 1 Implementation Sequence

1. Scaffold workspaces, Docker, env templates, CI, lint/format.
2. Build and test game-core for all 11 ranked games.
3. Add Prisma models and the initial migration.
4. Add Fastify foundation: config, plugins, request context, error mapping, i18n.
5. Implement auth with cookies, bearer tokens, refresh rotation, Google OAuth, email
   verification, and password reset.
6. Implement `/me` endpoints, settings, guest import, export, and soft delete.
7. Implement session create/finish/events, timing checks, daily limits, flagging,
   ledger, stats, and leaderboard projection updates.
8. Implement leaderboard endpoints, Redis rebuild, and the weekly/monthly snapshot job.
9. Add minimal frontend API/auth/account/ranked-session files without changing design.
10. Finish documentation, run lint/typecheck/tests/build, and write the Phase 1 report.

## 8. Testing Strategy

- Unit tests per game: seed reproducibility, expected scores, invalid answers.
- Integration tests: register, verify, login, refresh rotation, logout, guest import,
  session lifecycle, double-finish, expiry, invalid answers, and leaderboard rebuild.
- Tests use a dedicated Postgres schema and Redis database index. Docker Compose provides
  both services locally.
- CI runs lint, typecheck, test, and build for backend and game-core. The frontend keeps
  its own build step.

## 9. Deferred Phases

- Phase 2: daily XOX, daily Wordle, GOAT voting/ranking, contact form, homepage stats.
- Phase 3: versioned data releases, image pipeline, admin panel, market values.
- Phase 4: Socket.IO duels, Elo, mobile Bearer auth, FCM push.

## 10. Risks And Exit Checklist

Risks:

- The missing specification means exact table details and some scoring edge cases are
  assumptions documented above.
- The current frontend games have their own generation code. Phase 1 adds the shared
  contract and integration scaffolding; each game UI should be migrated to the shared
  builder as ranked mode is enabled per game.
- Redis projections are derived data. A rebuild path and snapshot job reduce risk.

Exit checklist:

- [ ] Workspace, Docker Compose, CI
- [ ] Prisma schema and migration
- [ ] game-core for 11 games with tests
- [ ] Auth, users, sessions, leaderboards
- [ ] OpenAPI at `/docs`
- [ ] `.env.example` and `.env` key templates
- [ ] README with setup and decisions
- [ ] Lint, typecheck, tests, build clean
- [ ] Phase 1 report
