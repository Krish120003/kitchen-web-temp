########################
#         DEPS         #
########################

# Install dependencies only when needed
FROM node:18-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install Prisma Client - remove if not using Prisma
COPY prisma ./

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

########################
#        BUILDER       #
########################

# Rebuild the source code only when needed
FROM node:18-alpine AS builder
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLIENTVAR
ARG SKIP_ENV_VALIDATION
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN corepack enable pnpm && SKIP_ENV_VALIDATION=1 pnpm run build

# Generate Prisma client after build
RUN corepack enable pnpm && pnpm exec prisma generate

########################
#        RUNNER        #
########################

# Production image, copy all the files and run next
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files and migrations for running migrations at startup
COPY --from=builder /app/prisma ./prisma

# Install required dependencies for Prisma in production
RUN corepack enable pnpm
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm add prisma @prisma/client --prod

# Generate Prisma client
RUN pnpm exec prisma generate

# Copy startup script
COPY start.sh ./
RUN chmod +x start.sh

# Create the /data directory and set appropriate permissions
RUN mkdir -p /data/images && chown -R nextjs:nodejs /data

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["./start.sh"] 