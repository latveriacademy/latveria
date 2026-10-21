FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=3002
ENV NODE_ENV=production

# Install TeX Live scheme-full, converters, and utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-full \
    dvisvgm \
    ghostscript \
    poppler-utils \
    curl \
    ca-certificates \
    unzip \
  && rm -rf /var/lib/apt/lists/*

# Install Bun 1.3.14
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14" \
  && mv /root/.bun/bin/bun /usr/local/bin/bun \
  && rm -rf /root/.bun

# Create non-root user for isolated compilation execution
RUN useradd -m -s /bin/bash texuser \
  && mkdir -p /tmp/latveria-tex \
  && chown -R texuser:texuser /tmp/latveria-tex

WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/src ./packages/shared/src
COPY apps/tex-worker/package.json ./apps/tex-worker/package.json
COPY apps/tex-worker/src ./apps/tex-worker/src

RUN bun install --frozen-lockfile --production --filter @latveria/tex-worker --filter @latveria/shared

WORKDIR /app/apps/tex-worker
USER texuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:3002/health || exit 1

CMD ["bun", "src/index.ts"]
