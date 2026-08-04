#!/bin/sh
set -e
echo "Waiting for database..."
node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  for (let i = 0; i < 30; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('DB ready');
      process.exit(0);
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error('DB not ready');
  process.exit(1);
})();
NODE

npx prisma db push
if [ "${RUN_SEED:-true}" = "true" ]; then
  npx tsx prisma/seed.ts || true
fi
exec node server.js
