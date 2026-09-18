# Guia Final de Execucao Local do Portfolio

Este guia fecha a visao operacional dos tres repositorios do portfolio. Cada
projeto continua executavel de forma independente, e a demonstracao integrada
usa contratos pequenos: headers de correlacao, OTLP, Prometheus e export JSON.

## Pre-requisitos

- Docker, Docker Compose e Colima ativos quando uma stack Docker for usada.
- Node.js via `nvm`: Node 22 para `operational-observability-platform` e Node 24
  para `OptiFlow`.
- Go toolchain para `sales-event-project`.
- Portas locais livres conforme a tabela de portas abaixo.

Antes de iniciar uma demonstracao, confirme que os tres repositorios estao em
`main` e sem mudancas locais inesperadas:

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
git status --short --branch

cd /Users/varnerdamasceno/github-varner/operational-observability-platform
git status --short --branch

cd /Users/varnerdamasceno/github-varner/OptiFlow
git status --short --branch
```

## Tempos Esperados

| Etapa | Tempo esperado em maquina aquecida | Observacao |
| --- | --- | --- |
| Colima iniciar | 30s a 2min | Pode passar disso apos reboot ou atualizacao do Docker. |
| Plataforma de observabilidade | 1min a 3min | Grafana e Tempo costumam ser os ultimos a ficar prontos. |
| `sales-event-project` com build | 1min a 4min | A primeira execucao baixa imagens e compila os binarios Go. |
| `OptiFlow` API local | 5s a 15s | Sem dependencias externas em runtime. |
| Smoke integrado | 2min a 5min | Depende do tempo de scrape do Prometheus. |

## Portas

| Porta | Projeto | Componente |
| --- | --- | --- |
| `3000` | `OptiFlow` | API, interface e `/metrics` |
| `3001` | `operational-observability-platform` | Grafana |
| `3100` | `operational-observability-platform` | Loki |
| `3200` | `operational-observability-platform` | Tempo |
| `4317` | `operational-observability-platform` | OTLP gRPC |
| `4318` | `operational-observability-platform` | OTLP HTTP |
| `5432` | sales ou plataforma | PostgreSQL local; rode uma stack por vez se houver conflito |
| `5672` | `sales-event-project` | RabbitMQ AMQP |
| `8080` | `sales-event-project` | API HTTP |
| `9090` | plataforma ou sales local | Prometheus; na demo integrada use o da plataforma |
| `9091` | `sales-event-project` | Worker metrics |
| `9092` | `sales-event-project` | Email retry worker metrics |
| `15672` | `sales-event-project` | RabbitMQ Management |

## Execucao Independente

### sales-event-project

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
make test
make test-integration
make lint
docker network create operational-observability-network || true
docker compose up --build
```

Servicos principais:

- API: `http://localhost:8080`
- RabbitMQ Management: `http://localhost:15672` (`guest` / `guest`)
- Grafana local do projeto: `http://localhost:3000` (`admin` / `admin`)
- Prometheus local do projeto: `http://localhost:9090`

Para encerrar:

```bash
docker compose down
```

### operational-observability-platform

```bash
cd /Users/varnerdamasceno/github-varner/operational-observability-platform
cp .env.example .env
nvm use
npm ci
docker compose up -d --wait
npm run db:migrate
npm run validate:observability
npm run smoke:observability
npm run check
```

Servicos principais:

- Grafana: `http://localhost:3001` (`admin` / `admin`)
- Prometheus: `http://localhost:9090`
- Tempo: `http://localhost:3200`
- Loki: `http://localhost:3100`
- OTLP HTTP: `http://localhost:4318`

Para encerrar:

```bash
docker compose down
```

### OptiFlow

```bash
cd /Users/varnerdamasceno/github-varner/OptiFlow
nvm use
npm test
npm run demo:local
npm run api
```

Servicos principais:

- API e interface: `http://127.0.0.1:3000`
- Metricas Prometheus: `http://127.0.0.1:3000/metrics`

Para validar a fixture integrada de vendas:

```bash
npm run sales-event:import
npm run scenario:sales-event
```

## Demonstracao Integrada

### 1. Subir a plataforma

```bash
cd /Users/varnerdamasceno/github-varner/operational-observability-platform
nvm use
docker compose up -d --wait
npm run validate:observability
```

Resultado esperado:

- Grafana abre em `http://localhost:3001`.
- Prometheus responde em `http://localhost:9090`.
- A rede Docker `operational-observability-network` existe para receber sinais
  do `sales-event-project`.

### 2. Subir o sales-event-project conectado ao Collector

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
OTEL_SERVICE_NAMESPACE=portfolio \
docker compose up --build postgres rabbitmq migrate api worker email-retry-worker
```

Servicos OTEL esperados:

- `sales-event-api`
- `sales-event-worker`
- `sales-event-email-retry-worker`

### 3. Gerar uma jornada de venda

```bash
curl -i -X POST http://localhost:8080/sales \
  -H 'Content-Type: application/json' \
  -H 'X-Request-ID: req-demo-sale-001' \
  -H 'X-Correlation-ID: corr-demo-sale-001' \
  -H 'X-Transaction-ID: sale-demo-001' \
  -d '{
    "salesEventId": "11111111-1111-1111-1111-111111111111",
    "customerId": "customer-001",
    "customerName": "Ada Lovelace",
    "customerEmail": "ada@example.com",
    "items": [
      {
        "ticketId": "22222222-2222-2222-2222-222222222222",
        "quantity": 2,
        "unitPrice": 10000
      }
    ]
  }'
```

No Grafana da plataforma, use o dashboard
`Operational Observability - Sales Event Journey` para acompanhar venda,
pagamento, outbox, RabbitMQ, worker, ticket, email, check-in e falhas.

### 4. Exportar historico de vendas para o OptiFlow

Com o banco do `sales-event-project` rodando:

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
go run ./cmd/optiflow-export \
  -sales-event-id 11111111-1111-1111-1111-111111111111 \
  -output /tmp/optiflow-sales-history.json
```

Importe o dataset no `OptiFlow`:

```bash
cd /Users/varnerdamasceno/github-varner/OptiFlow
nvm use
node scripts/import-sales-event-scenario.js \
  /tmp/optiflow-sales-history.json \
  data/scenarios/sales-event-fulfillment.json
npm run scenario:sales-event
```

### 5. Subir o OptiFlow para scrape da plataforma

```bash
cd /Users/varnerdamasceno/github-varner/OptiFlow
nvm use
OPTIFLOW_API_HOST=0.0.0.0 \
OPTIFLOW_API_PORT=3000 \
OPTIFLOW_SERVICE_NAME=optiflow-api \
OPTIFLOW_ENVIRONMENT=local \
npm run api
```

Depois de criar uma execucao pela API ou interface, valide no Prometheus da
plataforma:

```bash
curl --get \
  --data-urlencode 'query=up{job="optiflow-api"}' \
  http://localhost:9090/api/v1/query

curl --get \
  --data-urlencode 'query=optiflow_optimization_plan_cost{service="optiflow-api",environment="local"}' \
  http://localhost:9090/api/v1/query
```

No Grafana, abra `Operational Observability - OptiFlow Execution`.

## Variaveis Principais

| Variavel | Projeto | Uso |
| --- | --- | --- |
| `OTEL_ENABLED` | sales, plataforma | Habilita exportacao OTLP quando suportado. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | sales, plataforma | Endpoint do Collector. Na rede integrada: `http://otel-collector:4318`. |
| `OTEL_SERVICE_NAMESPACE` | sales | Namespace comum, use `portfolio`. |
| `OPTIFLOW_API_HOST` | OptiFlow | Use `0.0.0.0` quando o Prometheus em Docker precisar acessar o host. |
| `OPTIFLOW_API_PORT` | OptiFlow | Porta da API, padrao `3000`. |
| `OPTIFLOW_SERVICE_NAME` | OptiFlow | Label `service`, use `optiflow-api` na demo integrada. |
| `OPTIFLOW_ENVIRONMENT` | OptiFlow | Label `environment`, use `local` na demo integrada. |
| `OPTIFLOW_HISTORY_FILE` | OptiFlow | Arquivo local de historico das execucoes. |

## Problemas Conhecidos

- `sales-event-project` e `operational-observability-platform` publicam
  PostgreSQL em `5432`; suba uma stack por vez ou ajuste portas se precisar das
  duas bases expostas no host ao mesmo tempo.
- `sales-event-project` e `OptiFlow` usam `3000` em contextos diferentes: o
  Grafana local do sales e a API do OptiFlow. Na demo integrada, use o Grafana
  da plataforma em `3001`.
- O Prometheus da plataforma acessa o OptiFlow por
  `host.docker.internal:3000`; por isso a API do OptiFlow deve escutar em
  `0.0.0.0`.
- Grafana pode levar mais tempo que os demais containers para provisionar
  dashboards. Se uma busca falhar logo apos o `up`, aguarde alguns segundos e
  repita.
- Ao terminar testes integrados, limpe os containers com `docker compose down`
  no repositorio em uso e pare o runtime se nao for continuar: `colima stop`.
