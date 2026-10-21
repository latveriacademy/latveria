FROM oven/bun:1.3.14-slim AS dependencies
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/tex-worker/package.json ./apps/tex-worker/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile --production --filter @latveria/api --filter @latveria/shared

FROM oven/bun:1.3.14-slim AS runtime
ENV NODE_ENV=production PORT=3001 SERVE_WEB=false
WORKDIR /app
COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=dependencies --chown=bun:bun /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=dependencies --chown=bun:bun /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun packages/shared/package.json ./packages/shared/package.json
COPY --chown=bun:bun packages/shared/src ./packages/shared/src
COPY --chown=bun:bun apps/api/package.json ./apps/api/package.json
COPY --chown=bun:bun apps/api/src ./apps/api/src
COPY --chown=bun:bun apps/api/scripts ./apps/api/scripts
COPY --chown=bun:bun apps/api/drizzle ./apps/api/drizzle
WORKDIR /app/apps/api
USER bun
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD bun -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["bun", "src/index.ts"]
