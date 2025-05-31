#!/bin/sh
set -e

echo "Running Prisma migrations..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "Starting the application..."
exec node server.js 