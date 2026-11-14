# Test Locally First

The local files are already filled:

- `backend/.env` — local PostgreSQL/Redis, development cookies, local secrets
- `futgrid_app/.env` — `VITE_API_URL=http://localhost:3000/v1`
- `backend/.env.production.example` — Railway + Neon + Upstash template
- `futgrid_app/.env.production.example` — Cloudflare Pages template

## 1. Start PostgreSQL and Redis

```bash
cd /home/abdullahtnz/Desktop/futgrid/backend
docker compose up -d
docker compose ps
```

Expected ports:

- PostgreSQL: `5433`
- Redis: `6380`

## 2. Apply database migrations

```bash
cd /home/abdullahtnz/Desktop/futgrid/backend
npx prisma migrate deploy
npx prisma generate
```

## 3. Start the backend

```bash
cd /home/abdullahtnz/Desktop/futgrid
npm run dev --workspace backend
```

Check:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/stats
```

API docs: `http://localhost:3000/docs`

## 4. Start the frontend

In a second terminal:

```bash
cd /home/abdullahtnz/Desktop/futgrid/futgrid_app
npm run dev
```

Open `http://localhost:5173`.

## 5. Test checklist

Accounts:

1. Open `/hesab`.
2. Register an account.
3. Open `backend/.mail-outbox/`, find the newest HTML file, and use its verification link.
4. Log in and confirm `/me` data appears.

Games and ranking:

1. Play Futbol X0X in random mode.
2. Finish the game.
3. Check `http://localhost:3000/v1/leaderboard?period=week&limit=10`.
4. Log in first if you want the verified-user leaderboard entry.

Daily:

1. Test `GET http://localhost:3000/v1/daily/xox?difficulty=normal` with a guest header.
2. Test `GET http://localhost:3000/v1/daily/wordle?difficulty=normal`.
3. Daily stats: `http://localhost:3000/v1/daily/xox/stats`.

Contact and stats:

1. Use the homepage contact form.
2. Check `http://localhost:3000/v1/stats`.
3. Contact email is written to `backend/.mail-outbox/`.

GOAT:

1. Complete a GOAT bracket.
2. Check:

```bash
curl 'http://localhost:3000/v1/goat/ranking?size=16'
```

Admin:

You can use the browser UI at `http://localhost:5173/admin` after promoting your account.

1. Register and verify an account.
2. Promote it:

```bash
docker exec -it futgrid-postgres psql -U futgrid -d futgrid \
  -c "UPDATE users SET role='admin' WHERE email='YOUR_EMAIL';"
```

3. Restart the backend if needed.
4. Log in and open `http://localhost:3000/docs`.
5. Call `GET /v1/admin/auth/setup`.
6. Add the secret to Google Authenticator/Authy.
7. Call `POST /v1/admin/auth/verify` with the 6-digit code.
8. Add `X-Admin-TOTP: <code>` to admin requests.

Data and media:

1. Call `POST /v1/admin/data-releases/build`.
2. Call `POST /v1/admin/data-releases/:id/publish`.
3. Confirm `cdn-data/<version>/manifest.json` exists.
4. Optional: upload a test image through `POST /v1/admin/media`.

Duels and invite links:

The backend can generate a room code and invite link. Test it from two terminals.

Terminal 1, create a room:

```bash
cd /home/abdullahtnz/Desktop/futgrid/backend
npm run duel:create -- --game xox
```

It prints something like:

```text
Room code: ABC123
Invite link: http://localhost:5173/oyunlar/futbol-x0x?otaq=ABC123
```

Terminal 2, simulate the friend joining:

```bash
cd /home/abdullahtnz/Desktop/futgrid/backend
npm run duel:join -- ABC123
```

When the second player joins, both terminals print `game:state` with
`"status": "playing"`.

If you want to test against a different API or frontend URL:

```bash
npm run duel:create -- --game xox --url http://localhost:3000 --app http://localhost:5173
```

The website now also supports online friend rooms for XOX, Ortaq Oyunçu, Yüksək/Aşağı and İki hərf.

For XOX:

1. Open `/oyunlar/futbol-x0x`.
2. Choose `Dostla`.
3. The site creates a room and shows the invite link.
4. Send the link to a friend. Opening it joins the room automatically.
5. When both players are in, the XOX board becomes playable.

For the other online games:

- Ortaq Oyunçu: choose `Dostla`.
- Yüksək/Aşağı: open settings and click `Dostla onlayn`.
- İki hərf: choose `Dostla` from the mode screen.

The terminal commands above are still useful for debugging the Socket.IO server.

## 6. Run automated checks

```bash
cd /home/abdullahtnz/Desktop/futgrid
npm run lint
npm run typecheck
npm run test
npm run build
```

## 7. Switch to production later

Do not overwrite the local `.env` until local testing is finished. When ready:

1. Use `backend/.env.production.example` as the Railway environment template.
2. Use `futgrid_app/.env.production.example` for the Cloudflare Pages environment.
3. Fill the real Neon, Upstash, Resend, R2, Google, Sentry, and FCM values.
4. Run `npx prisma migrate deploy` against Neon once.
5. Deploy the API to Railway and attach `api.futgrid.az`.
6. Deploy `futgrid_app/dist` to Cloudflare Pages.
7. Set the production `VITE_API_URL` in Pages.

If you test production from the same computer, keep a backup of the local `.env` first:

```bash
cp backend/.env backend/.env.local.backup
cp futgrid_app/.env futgrid_app/.env.local.backup
```
