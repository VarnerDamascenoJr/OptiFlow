# Diagramas Finais do Portfolio

Estes diagramas explicam as responsabilidades dos tres projetos sem exigir a
leitura do codigo. Eles usam Mermaid para permanecerem versionaveis em Markdown.

## Arquitetura por Projeto

### sales-event-project

```mermaid
flowchart LR
  client[Cliente ou operador] --> api[Gin API]
  api --> postgres[(PostgreSQL)]
  api --> rabbit[RabbitMQ]
  rabbit --> worker[Sales worker]
  worker --> postgres
  worker --> outbox[Outbox publisher]
  outbox --> rabbit
  worker --> email[Email delivery]
  retry[Email retry worker] --> postgres
  retry --> email
  api --> metrics[Prometheus metrics]
  worker --> metrics
  retry --> metrics
  api --> otel[OTLP traces and logs]
  worker --> otel
```

Responsabilidade: processar a venda de ponta a ponta com fila, outbox, retry,
ticket, email, check-in e sinais de operacao.

### operational-observability-platform

```mermaid
flowchart LR
  api[Control plane API] --> db[(PostgreSQL)]
  apps[Instrumented apps] --> collector[OpenTelemetry Collector]
  collector --> tempo[(Tempo)]
  collector --> loki[(Loki)]
  collector --> prom[Prometheus]
  prom --> grafana[Grafana]
  tempo --> grafana
  loki --> grafana
  api --> grafana
  prom --> alerts[Symptom alerts]
  api --> incidents[Incident model]
```

Responsabilidade: receber sinais, correlacionar logs/metricas/traces, expor
dashboards, SLOs, alertas e investigacao operacional.

### OptiFlow

```mermaid
flowchart LR
  scenario[Scenario JSON] --> validator[Scenario validator]
  salesExport[Sales export JSON] --> importer[Sales event importer]
  importer --> scenario
  validator --> engine[Optimization engine]
  engine --> heuristic[Nearest-neighbor capacity]
  engine --> exact[Exact enumeration for small scenarios]
  heuristic --> result[Plan result]
  exact --> result
  result --> history[(Local history)]
  api[HTTP API and UI] --> validator
  api --> engine
  api --> metrics[Prometheus metrics]
  api --> logs[JSON execution logs]
```

Responsabilidade: transformar cenarios operacionais em planos comparaveis,
com metricas de custo, distancia, atraso, demanda nao atendida e risco.

## Jornada de Venda Observavel

```mermaid
sequenceDiagram
  participant C as Cliente
  participant A as Sales API
  participant R as RabbitMQ
  participant W as Sales worker
  participant P as PostgreSQL
  participant O as Outbox
  participant E as Email retry worker
  participant T as Observability platform

  C->>A: POST /sales com correlation headers
  A->>P: grava venda em processamento
  A->>R: publica SALE_CREATED com headers AMQP e trace context
  A-->>T: metricas, logs e traces
  R->>W: entrega SALE_CREATED
  W->>P: reserva ingressos e cria pagamento pendente
  C->>A: webhook de pagamento aprovado
  A->>P: conclui venda e grava outbox SALE_COMPLETED
  O->>R: publica evento confirmado
  R->>W: entrega SALE_COMPLETED
  W->>P: emite tickets e registra email
  W-->>T: logs, metricas e traces correlacionados
  E->>P: reprocessa emails com falha
  E-->>T: metricas de retry e dead-letter
```

Leitura esperada: uma unica jornada pode ser investigada por `correlation_id`,
`transaction_id`, `trace_id` e labels de servico.

## Dados entre Venda, Observabilidade e Otimizacao

```mermaid
flowchart LR
  sale[Venda e tickets emitidos] --> salesDb[(sales-event PostgreSQL)]
  salesDb --> export[cmd/optiflow-export]
  export --> dataset[sales-event-optiflow-export.v1]
  dataset --> importer[OptiFlow importer]
  importer --> scenario[Sales fulfillment scenario]
  scenario --> run[Optimization run]
  run --> plan[Plan metrics and recommendations]
  run --> optMetrics[OptiFlow /metrics]
  sale --> telemetry[Logs, metrics and traces]
  telemetry --> platform[Operational observability platform]
  optMetrics --> platform
  platform --> dashboards[Sales journey and OptiFlow dashboards]
```

Leitura esperada: dados historicos de venda alimentam um cenario de decisao, e
os sinais de execucao permitem observar tanto o negocio quanto a otimizacao.

## Fluxo de Execucao do OptiFlow

```mermaid
sequenceDiagram
  participant U as Usuario ou demo
  participant API as OptiFlow API
  participant Q as In-memory queue
  participant E as Optimization engine
  participant H as History file
  participant M as Prometheus scrape
  participant L as JSON logs

  U->>API: POST /optimization-runs
  API->>Q: enfileira run com IDs de correlacao
  API-->>U: status queued
  Q->>E: executa estrategia
  E->>E: valida cenario e calcula plano
  E->>H: persiste resultado
  E-->>L: optimization_run_succeeded ou failed
  E-->>API: atualiza status
  M->>API: GET /metrics
  U->>API: GET /optimization-runs/{id}
  API-->>U: status, metricas e resultado
```

Leitura esperada: cada execucao possui IDs rastreaveis, resultado persistido,
logs estruturados e metricas Prometheus de baixa cardinalidade.

