FROM node:22-bookworm-slim AS dependencies
COPY --from=oven/bun:1.3.14-slim /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile --production --filter @latveria/api --filter @latveria/shared

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 SERVE_WEB=false
WORKDIR /app
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=dependencies --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies --chown=node:node /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node packages/shared/package.json ./packages/shared/package.json
COPY --chown=node:node packages/shared/src ./packages/shared/src
COPY --chown=node:node apps/api/package.json ./apps/api/package.json
COPY --chown=node:node apps/api/src ./apps/api/src
COPY --chown=node:node apps/api/scripts ./apps/api/scripts
COPY --chown=node:node apps/api/drizzle ./apps/api/drizzle
WORKDIR /app/apps/api
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "src/index.ts"]
