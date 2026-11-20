# FutGrid Phases 1–4 — Complete Setup Guide

This is the single file for everything you need to do after the build. Follow it in order.
The backend is in `backend/`, shared game rules in `packages/game-core/`, and the existing
frontend remains in `futgrid_app/`.

## 0. Requirements

- Node.js 20+
- npm 10+
- Docker
- `openssl` (for local secrets)
- Optional: Cloudflare R2, Resend, Google OAuth, API-Football, Firebase/FCM accounts

## 1. Install dependencies and start local services

```bash
cd /home/abdullahtnz/Desktop/futgrid
npm install

cd backend
docker compose up -d
```

Docker Compose exposes:

- PostgreSQL on `localhost:5433`
- Redis on `localhost:6380`

These ports avoid conflicts with services already using `5432`/`6379` on this machine.

## 2. Generate required secrets

```bash
openssl rand -hex 32
```

Run this three times. Use the outputs for `JWT_ACCESS_SECRET`, `TOKEN_PEPPER`, and
`IP_HASH_SALT`.

Do not reuse a secret.

## 3. Fill `backend/.env`

The file already contains only names. Set the following values.

Required local values:

```dotenv
NODE_ENV=development
HOST=0.0.0.0
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=public
REDIS_URL=redis://localhost:6380/0
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
JWT_ACCESS_SECRET=<first openssl output>
TOKEN_PEPPER=<second openssl output>
IP_HASH_SALT=<third openssl output>
COOKIE_DOMAIN=
COOKIE_SECURE=false
CORS_ORIGINS=http://localhost:5173,https://futgrid.az,https://www.futgrid.az,https://staging.futgrid.az,capacitor://localhost,https://localhost
APP_URL=http://localhost:5173
API_URL=http://localhost:3000
DATA_DIR=../packages/game-core/data
DATA_VERSION=v1
SWAGGER_ENABLED=true
GAME_SESSION_TTL_MINUTES=120
DAILY_RANKED_LIMIT=5
TEAM_LEADERBOARD_TOP=5
RATE_LIMIT_ENABLED=true
TRUST_PROXY=true
LOG_PRETTY=false
CDN_DATA_DIR=../cdn-data
CDN_MEDIA_DIR=../cdn-media
CDN_BASE_URL=http://localhost:3000/cdn-data
MEDIA_BASE_URL=http://localhost:3000/media
ADMIN_TOTP_ISSUER=FutGrid
MEDIA_MAX_BYTES=10000000
MEDIA_MAX_WIDTH=640
```

Optional services — leave empty locally unless you are configuring them:

```dotenv
RESEND_API_KEY=
EMAIL_FROM=FutGrid <info@futgrid.az>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/v1/auth/google/callback
SENTRY_DSN=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
API_FOOTBALL_KEY=
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
TRANSFERMARKT_CSV_URL=
FCM_SERVICE_ACCOUNT_JSON=
```

Notes:

- Without `RESEND_API_KEY`, development email is written to `backend/.mail-outbox/`.
- Without R2 values, data/media files are stored in `cdn-data/` and `cdn-media/` and served
  locally at `/cdn-data` and `/media`.
- `FCM_SERVICE_ACCOUNT_JSON` must be one-line JSON if used. It is only needed for real
  mobile push delivery.
- `API_FOOTBALL_KEY` and `TRANSFERMARKT_CSV_URL` are optional hooks. The current pipeline
  builds from the bundled `v1` JSON files.

## 4. Fill `futgrid_app/.env`

```dotenv
VITE_API_URL=http://localhost:3000/v1
```

For production use:

```dotenv
VITE_API_URL=https://api.futgrid.az/v1
VITE_SOCKET_URL=https://api.futgrid.az
```

## 5. Apply all database migrations

All four phase migrations are already generated. Run:

```bash
cd /home/abdullahtnz/Desktop/futgrid/backend
npx prisma migrate deploy
npx prisma generate
```

## 6. Start the backend

```bash
cd /home/abdullahtnz/Desktop/futgrid
npm run dev --workspace backend
```

Health: `http://localhost:3000/health`

Swagger/OpenAPI: `http://localhost:3000/docs`

## 7. Start the frontend

```bash
cd /home/abdullahtnz/Desktop/futgrid/futgrid_app
npm run dev
```

The account page is at `/hesab`.

## 8. Phase 1 verification — accounts, sessions, ranking

1. Open `/hesab`, register, then check `backend/.mail-outbox/` for the verification link.
2. Verify the email, log in, and confirm `/me` loads.
3. Guest play works with the automatic `X-Guest-Id` header.
4. Verify endpoints:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/stats
curl 'http://localhost:3000/v1/leaderboard?period=week&limit=10'
```

Phase 1 decisions:

- Account deletion is a soft delete; leaderboard shows `Deleted user`.
- Ranked daily limit is five sessions per game per day.
- Auction win flags are accepted from the client in Phase 1; other games are verified
  server-side.
- The ranked game screens still need to be switched to the shared server-seed path. The
  API client, auth provider, account page, and `useRankedSession` hook are ready.

## 9. Phase 2 verification — daily games, GOAT, contact, stats

No new environment variables are required.

Daily puzzles are generated on request and by cron at 00:00 Asia/Baku. Old puzzles close
at 00:05. GOAT ranking recomputes every 10 minutes.

Test endpoints:

```bash
curl -H "X-Guest-Id: 11111111-1111-4111-8111-111111111111" \
  'http://localhost:3000/v1/daily/xox?difficulty=normal'

curl -H "X-Guest-Id: 11111111-1111-4111-8111-111111111111" \
  'http://localhost:3000/v1/daily/wordle?difficulty=normal'

curl 'http://localhost:3000/v1/daily/xox/stats'
curl 'http://localhost:3000/v1/goat/ranking?size=128'
curl 'http://localhost:3000/v1/stats'
```

Home-page integration added:

- Contact form posts to `POST /v1/contact`.
- Homepage statistic cards read `GET /v1/stats`.
- GOAT saves results with the `picks` field required by the backend.

Daily rules:

- One attempt per user/guest per puzzle.
- Daily XOX rarity is computed from selections/correct answers in that cell.
- Daily Wordle never returns the answer until the attempt finishes.

## 10. Phase 3 verification — data, media, admin

### 10.1 Build and publish the first data release

Start with Swagger at `/docs` or use the admin flow below.

Endpoints:

```text
POST /v1/admin/data-releases/build
GET  /v1/admin/data-releases/:id
POST /v1/admin/data-releases/:id/publish
POST /v1/admin/data-releases/:id/rollback
```

Build writes an immutable bundle to `cdn-data/<version>/` and a root `current.json`.
Publish also syncs the relational player/club/coach/country/match tables and updates the
current pointer.

Nightly `data:sync` runs at 03:00 Asia/Baku.

Market-value CSV upload:

```bash
curl -X POST http://localhost:3000/v1/admin/market-values \
  -H "Content-Type: application/json" \
  -H "Cookie: <admin cookies>" \
  -H "Origin: http://localhost:5173" \
  -H "X-Admin-TOTP: <current code>" \
  -d '{"csv":"player_id,market_value_eur\n2,210000000"}'
```

### 10.2 Create your admin account and enable TOTP

1. Register and verify a normal account.
2. Promote it in PostgreSQL:

```bash
docker exec -it futgrid-postgres psql -U futgrid -d futgrid \
  -c "UPDATE users SET role='admin' WHERE email='YOUR_EMAIL';"
```

3. Log in as that user.
4. Call `GET /v1/admin/auth/setup` with the login cookies and

```text
Origin: http://localhost:5173
```

5. Scan the returned `otpauthUrl` in Google Authenticator/Authy, or enter the `secret`.
6. Call `POST /v1/admin/auth/verify` with:

```json
{ "token": "123456" }
```

7. Every admin request after that requires:

```text
X-Admin-TOTP: <current 6-digit code>
```

Mutation requests also require the allowed `Origin` header because they use cookies.

### 10.3 Media pipeline

```text
POST /v1/admin/media
GET  /v1/admin/media
```

Body:

```json
{
  "entityType": "player",
  "entityId": "2",
  "kind": "portrait",
  "sourceUrl": "https://example.com/photo.jpg",
  "license": "CC BY-SA 4.0",
  "author": "Author Name"
}
```

Wikimedia sources require `license` and `author`. Images are converted to WebP, hashed, and
stored under `cdn-media/` unless R2 is configured.

### 10.4 Admin modules available

- Overview and audit log
- Users: search, block/unblock, role change, revoke sessions, view sessions
- Results: view flagged sessions, revoke points
- Contact messages: list, update status
- Daily puzzles: list, edit JSON, regenerate
- Players/clubs: search, hide, rename, change photo/logo
- Data releases: build, report, publish, rollback
- Market values: CSV apply
- GOAT roster: view
- Game catalog: enable/disable, new badge, order
- Media: list/process

Known Phase 3 boundaries:

- External API-Football/Transfermarkt pulls are configuration hooks; the working pipeline
  uses the bundled `v1` JSON.
- An admin UI page is not added; use Swagger or the API.
- Rollback switches the CDN pointer; it does not automatically re-sync relational tables
  from the old bundle.
- The “Image sources” frontend page is not added.

## 11. Phase 4 verification — duels and mobile

### 11.1 Online duels

The website now has online friend-room UIs for:

- XOX: `/oyunlar/futbol-x0x` -> `Dostla`
- Ortaq Oyunçu: `/oyunlar/ortaq-oyuncu` -> `Dostla`
- Yüksək/Aşağı: settings -> `Dostla onlayn`
- İki hərf: `/oyunlar/iki-herf` -> `Dostla`

Each uses a create-room or join-by-numeric-ID flow. No invite URL is required.

The admin website UI is at `/admin`. Promote an account first, then set up TOTP there.

Socket.IO is mounted at:

```text
http://localhost:3000/socket.io
```

Client auth options:

```js
io("http://localhost:3000", { auth: { token: accessToken } });
// or for guests:
io("http://localhost:3000", { auth: { guestId: "11111111-1111-4111-8111-111111111111" } });
```

Client events:

- `room:create` `{ game }`
- `room:join` `{ code }`
- `game:move` `{ code, ... }`
- `game:rematch` `{ code }`

Server events:

- `room:state`
- `game:state`
- `game:result`
- `error`

Implemented server-authoritative duel games:

- XOX
- Yüksək/Aşağı
- İki hərf

Other duel games (Ortaq Oyunçu and Açıq Artırma) return `GAME_NOT_AVAILABLE`.

Behavior:

- Six-character room code.
- Disconnect grace period: 30 seconds, then technical loss.
- Elo stored in `user_ratings`, start 1000, K=16.
- Match history stored in `duel_matches`.

### 11.2 Mobile bearer auth and push

Mobile login already works on the same REST endpoints:

```text
POST /v1/auth/login
Header: X-Client: mobile
```

The response includes `accessToken` and `refreshToken`. Use:

```text
Authorization: Bearer <accessToken>
```

Push token registration:

```text
POST /v1/me/push-tokens
DELETE /v1/me/push-tokens
GET /v1/me/ratings
GET /v1/me/duels
```

For real FCM delivery, set `FCM_SERVICE_ACCOUNT_JSON` to the one-line Firebase service
account JSON. Without it, tokens are stored but no push is sent.

Known Phase 4 boundaries:

- Online XOX has a web UI. Higher/Lower and Two Letters still use the Socket.IO
  protocol only, without a dedicated online room UI.
- Ortaq Oyunçu and Açıq Artırma online duel modes are not implemented.
- FCM delivery needs Firebase credentials.

## 12. Run all checks

```bash
cd /home/abdullahtnz/Desktop/futgrid
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected coverage:

- 48 `game-core` tests
- Backend integration tests across auth, sessions, daily games, GOAT, contact, stats,
  admin/TOTP, data release build, media validation, duels, and push tokens

## 13. Production checklist

1. Set `NODE_ENV=production`.
2. Use strong values for `JWT_ACCESS_SECRET`, `TOKEN_PEPPER`, `IP_HASH_SALT`.
3. Set `COOKIE_SECURE=true` and your real `COOKIE_DOMAIN`.
4. Set `DATABASE_URL` to Neon/PostgreSQL and `REDIS_URL` to Upstash/Redis.
5. Set `CORS_ORIGINS`, `APP_URL`, and `API_URL` to production domains.
6. Set `CDN_BASE_URL` and `MEDIA_BASE_URL` to CDN URLs.
7. Fill R2 credentials if using Cloudflare R2.
8. Fill Resend, Google OAuth, Sentry, and FCM values as needed.
9. Run:

```bash
npx prisma migrate deploy
npm run build
```

10. Start the API with `npm run start --workspace backend`.
11. Put the API behind HTTPS and a reverse proxy that forwards `X-Forwarded-For`.
12. Run the frontend build and deploy `futgrid_app/dist` to Cloudflare Pages.

## 14. Cron schedule summary

All cron jobs use `Asia/Baku`.

- Weekly leaderboard snapshot: Monday 00:00
- Monthly leaderboard snapshot: 1st of month 00:00
- Daily puzzle generation: 00:00
- Daily puzzle close: 00:05
- GOAT recompute: every 10 minutes
- Data sync: 03:00 daily

## 15. Email, OAuth, and secrets notes

- Never commit `backend/.env` or `futgrid_app/.env`; both are ignored.
- `.env.example` contains names only.
- Development email is written to `backend/.mail-outbox/` and logs only the path.
- Google login requires a Google OAuth web client; redirect URI must match
  `GOOGLE_REDIRECT_URI`.
- Admin TOTP is mandatory for every `/v1/admin/*` operation except initial setup/verify.

## 16. Production environment values

Use these values as the production template. Replace `<...>` placeholders with real
credentials.

### Railway/Fly.io API container

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgresql://<NEON_USER>:<NEON_PASSWORD>@<NEON_HOST>/<NEON_DB>?sslmode=require&schema=public
REDIS_URL=rediss://default:<UPSTASH_PASSWORD>@<UPSTASH_HOST>:<UPSTASH_TLS_PORT>
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=30
JWT_ACCESS_SECRET=<openssl rand -hex 32>
TOKEN_PEPPER=<openssl rand -hex 32>
IP_HASH_SALT=<openssl rand -hex 32>
COOKIE_DOMAIN=.futgrid.az
COOKIE_SECURE=true
CORS_ORIGINS=https://futgrid.az,https://www.futgrid.az,https://staging.futgrid.az,capacitor://localhost,https://localhost
APP_URL=https://futgrid.az
API_URL=https://api.futgrid.az
DATA_DIR=../packages/game-core/data
DATA_VERSION=v1
RESEND_API_KEY=re_<RESEND_KEY>
EMAIL_FROM=FutGrid <info@futgrid.az>
GOOGLE_CLIENT_ID=<GOOGLE_CLIENT_ID>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>
GOOGLE_REDIRECT_URI=https://api.futgrid.az/v1/auth/google/callback
SENTRY_DSN=https://<SENTRY_KEY>@<SENTRY_HOST>/<SENTRY_PROJECT_ID>
SWAGGER_ENABLED=false
GAME_SESSION_TTL_MINUTES=120
DAILY_RANKED_LIMIT=5
TEAM_LEADERBOARD_TOP=5
RATE_LIMIT_ENABLED=true
TRUST_PROXY=true
LOG_PRETTY=false
CDN_DATA_DIR=/app/cdn-data
CDN_MEDIA_DIR=/app/cdn-media
CDN_BASE_URL=https://api.futgrid.az/cdn-data
MEDIA_BASE_URL=https://api.futgrid.az/media
R2_ACCOUNT_ID=<CLOUDFLARE_ACCOUNT_ID>
R2_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
R2_BUCKET=futgrid-assets
R2_PUBLIC_URL=https://cdn.futgrid.az
API_FOOTBALL_KEY=<API_FOOTBALL_KEY>
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io
TRANSFERMARKT_CSV_URL=<OPTIONAL_CSV_URL>
ADMIN_TOTP_ISSUER=FutGrid
MEDIA_MAX_BYTES=10000000
MEDIA_MAX_WIDTH=640
FCM_SERVICE_ACCOUNT_JSON=<ONE_LINE_FIREBASE_SERVICE_ACCOUNT_JSON>
```

### Cloudflare Pages frontend

Set this environment variable in the Pages project:

```dotenv
VITE_API_URL=https://api.futgrid.az/v1
```

Build command:

```bash
npm ci
npm run build --workspace futgrid_app
```

Output directory:

```text
futgrid_app/dist
```

### DNS and cookies

- `api.futgrid.az` → Railway/Fly.io API
- `futgrid.az` and `www.futgrid.az` → Cloudflare Pages
- `cdn.futgrid.az` → R2 public bucket/custom domain
- `COOKIE_DOMAIN=.futgrid.az` lets the API set cookies shared by the site subdomains.
- `COOKIE_SECURE=true` is required in production.
- Keep `SWAGGER_ENABLED=false` in production.

### Production data/bootstrap order

1. Deploy the API and run `npx prisma migrate deploy`.
2. Log in with a real account, promote it to admin, and enable TOTP.
3. Build and publish the first data release.
4. Upload at least one media asset if you use CDN images.
5. Confirm `https://api.futgrid.az/health`.
6. Deploy Cloudflare Pages with `VITE_API_URL`.
7. Test register → email verify → login → session finish → leaderboard.
8. Put Neon backups and Upstash persistence/alerts in place.
9. Add Railway/Fly health checks, Sentry alerts, and a daily PostgreSQL backup.

### Ranked-game integration status

These existing game screens now open server sessions and submit answers to the ranked
API without visual changes:

- Futbol X0X (single-player random mode)
- Ortaq Oyunçu (single-player)
- Yüksək/Aşağı
- Futbol Wordle (endless mode)
- Karyera yolu
- 5 klub
- Klubları sırala
- Piramida
- Heyəti xatırla (single-team mode)

Still local-only scoring:

- Açıq Artırma (the auction needs a server-authoritative bid simulation)
- İki hərf bot mode (server pair generation needs to replace the bot's local letter picker)
- Daily Wordle now uses the backend daily guess API.
- Daily XOX still uses its existing local daily flow; the backend daily XOX APIs are
  available through Swagger and the admin panel.

The live homepage leaderboard now reads from the ranked API and falls back to the sample
list only when the API is unavailable.

To publish, these remaining local-only modes do not block deployment. They simply do not
write ranked points until their UI is migrated.

## 17. Budget-friendly hosting options

Prices are approximate and can change; verify current pricing before ordering.

### Option A — Cheapest practical: one VPS (recommended for budget)

Run the API, PostgreSQL, and Redis on one small Linux VPS with Docker Compose and Caddy
for HTTPS.

Example providers:

- Hetzner Cloud CX22: about €4–5/month
- Contabo VPS S: about $5–6/month
- DigitalOcean Basic Droplet: about $6/month
- Oracle Cloud Free Tier: $0 if you qualify for Always Free

Also free/cheap:

- Cloudflare DNS/proxy: free
- Cloudflare Pages frontend: free
- Resend email: free up to about 3,000 emails/month
- Cloudflare R2: free tier for small storage
- Sentry: free developer tier
- Domain: about $10–15/year

Total realistic starting cost: about $5–8/month plus the domain.

Tradeoff: you manage PostgreSQL backups, Redis persistence, OS updates, and restarts
yourself. This is the cheapest reliable option.

### Option B — Easiest managed split: Railway + Neon + Upstash

- Railway Hobby: about $5/month of usage included
- Neon PostgreSQL: free tier for small databases
- Upstash Redis: free tier, then pay-as-you-go
- Cloudflare Pages: free
- R2: free tier
- Resend: free tier

Total starting cost: about $5–10/month.

Tradeoff: easiest to deploy and least maintenance, but usage-based costs can grow.

### Option C — Fly.io + Neon + Upstash

- Fly.io shared-cpu-1x small machine: roughly $2–4/month depending on memory/usage
- Neon free tier
- Upstash free/cheap
- Cloudflare Pages free

Total starting cost: about $3–7/month.

Tradeoff: more configuration than Railway, cheaper at low traffic.

### Option D — Render

- Render Starter web service: about $7/month
- Neon/Upstash free tiers
- Cloudflare Pages free

Total starting cost: about $7–10/month.

Tradeoff: simple managed deploy; the free web-service tier sleeps and is not suitable for
a public API.

### Option E — All-managed premium

Railway/Render + managed Postgres + managed Redis + R2 + Resend + Sentry. About
$15–35/month at low traffic. Not the best budget choice.

### Recommendation

For the lowest reliable monthly cost, use:

- One Hetzner/Contabo VPS for API + PostgreSQL + Redis
- Caddy for automatic HTTPS
- Cloudflare Pages for the frontend
- Cloudflare R2 for data/media
- Resend free tier for email

Budget: roughly $5–8/month.

For the least maintenance, use Railway + Neon + Upstash: roughly $5–10/month.

Whichever option you choose, keep PostgreSQL backups in a separate location from the VPS.

## 18. Profile, usernames, avatars and new online games

### Profile
- Website: `/hesab`
- Change display name with the existing profile form.
- Change username with `PATCH /v1/me/username`.
- Change password with `POST /v1/me/password`.
- Upload profile photo with `POST /v1/me/avatar`.
- Remove profile photo with `DELETE /v1/me/avatar`.
- Forgot-password link is now on the login form.
- Password changes do not revoke other sessions.
- Usernames have no cooldown and are not reserved after a change.

Avatar storage:
- Development: `cdn-media/`
- Production: R2 if configured, otherwise local storage with a Railway volume.
- Max 5 MB, JPEG/PNG/WebP, re-encoded to WebP.

### Usernames in rooms and leaderboard
Rooms, leaderboard and duel results now include:
- display name
- `@username`
- avatar URL
- initials fallback

The fake homepage leaderboard names were removed. If the API has no ranked users, the
site shows an empty leaderboard message.

### Online friend games
Available from the website:
- Futbol X0X
- Ortaq Oyunçu
- Yüksək/Aşağı
- İki hərf
- 20 sual
- Kimdir Bu?
- Açıq Artırma

Each room has:
- numeric 6-digit room ID
- create-room or join-by-ID flow
- no invite URL required
- server-returned player identity
- display name + username + avatar
- reconnect and rematch support

Açıq Artırma online:
- 2–4 players
- host starts the auction
- 5 slots, 40 budget
- server-owned timer and bids
- highest bid wins the lot
- highest team rating wins

### Tests
Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected: 48 game-core tests and 24 backend tests.
