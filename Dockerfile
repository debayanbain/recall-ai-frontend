# syntax=docker/dockerfile:1
#
# RecallAI web -- production image.
#
# pnpm, not npm: package.json pins packageManager pnpm@10.21.0 and the lockfile is
# pnpm-lock.yaml. npm install in this tree fails outright.
#
# Requires `output: "standalone"` in next.config.ts -- that is what produces
# .next/standalone/server.js, a server carrying only the modules the app actually
# imports instead of the whole node_modules tree.
#
# Runs as uid 1001. Pin the same value in the Deployment:
#   securityContext: { runAsNonRoot: true, runAsUser: 1001, allowPrivilegeEscalation: false }
#
# No HEALTHCHECK: containerd ignores it. Use a readiness probe on / in the Deployment.

############################
# Stage 1 -- deps
############################
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && pnpm install --frozen-lockfile

############################
# Stage 2 -- build
############################
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# The ONE build-time variable, and it is public by definition -- NEXT_PUBLIC_* is
# inlined into the client bundle, so a secret passed here ships to every browser.
# Empty is correct: lib/api.ts then emits relative URLs, which the Ingress routes to
# the API on the same origin. A cross-origin value makes the session cookie
# third-party and Chrome drops it -- login succeeds, then every request is anonymous.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN pnpm build

############################
# Stage 3 -- runtime
############################
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 -G nodejs nextjs

# standalone brings its own trimmed node_modules and server.js. static/ and public/ are
# the two things it does NOT include and the server expects beside it.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
