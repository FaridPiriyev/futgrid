#!/bin/sh
set -e

echo "Running Prisma migrations..."
./node_modules/.bin/prisma migrate deploy --schema=./backend/prisma/schema.prisma || npx prisma migrate deploy --schema=./backend/prisma/schema.prisma

echo "Starting FutGrid API..."
exec node backend/dist/server.js
