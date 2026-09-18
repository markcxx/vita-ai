# syntax=docker/dockerfile:1.7

FROM node:26-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@10.29.2

FROM base AS deps
WORKDIR /workspace
RUN apk add --no-cache g++ make python3
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/frontend/node_modules ./frontend/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend ./frontend
WORKDIR /workspace/frontend
ARG APP_NAME=VitaAI
ENV APP_NAME=$APP_NAME
RUN AUTH_SECRET=build-only-placeholder-not-used-at-runtime-0000000000 \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    APP_URL=http://localhost:3000 pnpm build

FROM node:26-alpine AS runner
WORKDIR /app/frontend

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV HOME=/tmp
# dumb-init forwards termination signals so Docker can stop Next.js cleanly.
RUN apk add --no-cache \
      ca-certificates \
      dumb-init

COPY --from=builder --chown=node:node /workspace/frontend/.next/standalone /app
COPY --from=builder --chown=node:node /workspace/frontend/public /app/frontend/public
COPY --from=builder --chown=node:node /workspace/frontend/.next/static /app/frontend/.next/static

USER node

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--use-env-proxy", "server.js"]
