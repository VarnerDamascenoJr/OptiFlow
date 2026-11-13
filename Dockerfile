FROM node:24.21.0-bookworm-slim AS backend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.backend.json ./
COPY backend ./backend
COPY src ./src
RUN npm run build

FROM node:24.21.0-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV OPTIFLOW_API_HOST=0.0.0.0
ENV OPTIFLOW_API_PORT=3000
ENV OPTIFLOW_HISTORY_FILE=/data/optimization-history.json
ENV OPTIFLOW_PYTHON=/opt/optiflow-solver/bin/python

COPY requirements-solver.txt ./
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && python3 -m venv /opt/optiflow-solver \
  && /opt/optiflow-solver/bin/python -m pip install --no-cache-dir -r requirements-solver.txt \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY data ./data
COPY docs ./docs
COPY public ./public
COPY scripts ./scripts
COPY src ./src
COPY solver ./solver
COPY --from=backend-build /app/dist ./dist

RUN groupadd --system optiflow \
  && useradd --system --gid optiflow --home-dir /app optiflow \
  && mkdir -p /data \
  && chown -R optiflow:optiflow /data

USER optiflow

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "scripts/start-api.js"]
