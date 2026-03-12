#!/bin/sh
set -e

until npx prisma db push; do
  sleep 2
done

npm run db:seed
node src/server.js
