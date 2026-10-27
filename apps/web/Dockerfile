FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY apps/extension/package.json apps/extension/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter web... --filter extension...
COPY packages/shared packages/shared
COPY apps/web apps/web
COPY apps/extension apps/extension
RUN pnpm --filter web build && pnpm --filter extension build && pnpm --filter extension release \
    && pnpm --filter extension release:firefox && pnpm --filter extension release:firefox:source \
    && mkdir -p apps/web/dist/downloads \
    && cp apps/extension/release/linkables-chrome-[0-9]*.zip apps/web/dist/downloads/linkables-chrome.zip \
    && cp apps/extension/release/linkables-firefox-source-*.zip apps/web/dist/downloads/linkables-firefox-source.zip

FROM caddy:2.10-alpine
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
COPY LICENSE /srv/LICENSE.txt
EXPOSE 8080
