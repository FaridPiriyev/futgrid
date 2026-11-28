# FutGrid

Monorepo for the FutGrid website and API.

- `futgrid_app/` — existing React + Vite frontend
- `backend/` — Fastify + Prisma + Redis API (Phase 1)
- `packages/game-core/` — shared deterministic game rules

## Quick start

```bash
npm install
cd backend
docker compose up -d
# fill backend/.env and futgrid_app/.env
DATABASE_URL='postgresql://futgrid:futgrid@localhost:5433/futgrid?schema=public' \
  npm run prisma:deploy
npm run dev
```

See `SETUP-ALL-PHASES.md` for the complete Phase 1–4 setup, every environment value,
admin/TOTP setup, data and media setup, duels, mobile push, and production checklist.
See `backend/README.md` for backend details and `backend/PLAN.md` for the plan. Phase
reports are in `backend/PHASE1-REPORT.md` and `backend/PHASES-2-4-REPORT.md`.
See `deploy/README.md` for production server setup and automatic deployments.
