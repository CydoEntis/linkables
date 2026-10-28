# API and metadata worker in one long-running container (ADR-0005).
# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24-slim

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
# The API runs its TypeScript through tsx, a dev dependency, so dev deps stay.
RUN pnpm install --frozen-lockfile --filter api...

COPY packages/shared packages/shared
COPY apps/api apps/api
COPY LICENSE /app/LICENSE
RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/linkables.db
USER node
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node_modules/.bin/tsx", "src/server.ts"]
