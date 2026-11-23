FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json* ./
COPY backend/package.json backend/package.json
COPY packages/game-core/package.json packages/game-core/package.json
COPY futgrid_app/package.json futgrid_app/package.json
RUN npm ci --workspace @futgrid/backend --workspace @futgrid/game-core --include-workspace-root

FROM deps AS build
COPY packages/game-core packages/game-core
COPY backend backend
RUN npm run build --workspace @futgrid/game-core && npm run build --workspace @futgrid/backend

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh
COPY --from=build /app/packages/game-core/package.json ./packages/game-core/package.json
COPY --from=build /app/packages/game-core/dist ./packages/game-core/dist
COPY --from=build /app/packages/game-core/data ./packages/game-core/data
WORKDIR /app
EXPOSE 3000
CMD ["./backend/docker-entrypoint.sh"]
