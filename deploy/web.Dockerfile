# Builds the Vite frontend and serves it with nginx.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY futgrid_app/package.json futgrid_app/package.json
COPY backend/package.json backend/package.json
COPY packages/game-core/package.json packages/game-core/package.json
RUN npm ci --workspace futgrid_app --include-workspace-root
COPY futgrid_app futgrid_app
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN npm run build --workspace futgrid_app

FROM nginx:1.27-alpine
COPY --from=build /app/futgrid_app/dist /usr/share/nginx/html
