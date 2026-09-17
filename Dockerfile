FROM node:24.21.0-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV OPTIFLOW_API_HOST=0.0.0.0
ENV OPTIFLOW_API_PORT=3000
ENV OPTIFLOW_HISTORY_FILE=/data/optimization-history.json

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY data ./data
COPY docs ./docs
COPY public ./public
COPY scripts ./scripts
COPY src ./src

RUN groupadd --system optiflow \
  && useradd --system --gid optiflow --home-dir /app optiflow \
  && mkdir -p /data \
  && chown -R optiflow:optiflow /data

USER optiflow

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "api"]
