# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim

WORKDIR /app

# better-sqlite3 在 slim 镜像中可能需要编译工具（Debian 12 GLIBC 足够新，通常很快）
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json .npmrc ./

RUN npm ci --omit=dev

COPY backend ./backend
COPY public ./public

RUN mkdir -p data logs \
  && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://127.0.0.1:3000/api/status || exit 1

CMD ["node", "backend/src/index.js"]
