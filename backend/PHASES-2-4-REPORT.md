# Phases 2–4 Report

## Phase 2 — Daily & Voting

Built:

- Daily XOX and daily Wordle generation for easy/normal/hard
- Daily attempts with resume state, one-attempt enforcement, answer counts, rarity, and streaks
- Daily stats endpoint with 60-second cache
- GOAT vote validation, last-counted-vote-per-day rule, per-IP daily limit, player/pair stats, Elo, and ranking cache
- Contact form storage, honeypot handling, rate limit, localization, and notification email
- Homepage stats endpoint with 10-minute cache
- Cron: daily generate 00:00 Baku, daily close 00:05 Baku, GOAT recompute every 10 minutes
- Frontend: contact form uses the API, homepage stats use `/stats`, GOAT saves `picks`
- Frontend ranked sessions: XOX, Ortaq, Higher/Lower, Wordle endless, Career, 5 Clubs,
  Club Order, Pyramid, and single-team Lineups submit server-verified sessions. Auction
  and the Two Letters bot mode remain local-only for now; daily game screens still use
  their existing local daily flows.

Deviations:

- Daily XOX counts a puzzle as solved at five or more correct cells.
- Contact notification email uses the configured mail transport; development writes to `.mail-outbox/`.

## Phase 3 — Data & Admin

Built:

- Prisma tables for players, clubs, stints, trophies, coaches, countries, famous matches, data overrides, releases, media, and audit log
- Versioned data bundle build with validation report, local CDN output, optional R2 upload, publish/rollback pointer
- Relational sync into PostgreSQL
- Nightly data sync cron at 03:00 Baku
- Market-value CSV upload that writes overrides and updates players
- WebP media pipeline with hash URLs, Wikimedia license/author enforcement, local serving, optional R2
- Admin TOTP setup/verify and mandatory TOTP on admin endpoints
- Admin modules: overview, users, results, contact messages, daily puzzles, players, clubs, releases, market values, GOAT roster, games, audit log, media

Deviations:

- No separate admin web UI was added; use Swagger or the API.
- External API-Football/Transfermarkt fetching is exposed as configuration hooks; the working pipeline builds from the bundled v1 JSON.
- Rollback repoints the CDN manifest but does not re-sync relational tables from the old bundle.
- The public “Image sources” page is not added.

## Phase 4 — Online & Mobile

Built:

- Socket.IO server with Redis adapter, room codes, room state, join/create/rematch, and 30-second disconnect loss
- Server-authoritative XOX, Higher/Lower, and Two Letters duels
- Elo ratings with K=16, match history, and per-game ratings
- Mobile Bearer login already supported by REST auth
- Push token registration/removal and Firebase Cloud Messaging delivery when credentials are configured
- User endpoints for ratings, duel history, and push tokens

Deviations:

- Ortaq Oyunçu and Açıq Artırma online duel modes are not implemented; they return `GAME_NOT_AVAILABLE`.
- No duel UI or mobile UI was added.
- FCM delivery is inactive until `FCM_SERVICE_ACCOUNT_JSON` is configured.

## Verification

- `npm run lint` passes with only pre-existing frontend hook warnings
- `npm run typecheck` passes
- `npm run test` passes: 48 game-core tests and 21 backend tests
- `npm run build` passes for game-core, backend, and frontend
