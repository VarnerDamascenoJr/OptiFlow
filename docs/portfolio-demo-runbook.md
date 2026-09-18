# Roteiro de Demonstracao do Portfolio

Este roteiro conecta os tres projetos do portfolio sem transformar os
repositorios em um monolito. A historia demonstravel e:

```text
funcionar -> medir -> comparar -> explicar -> otimizar
```

Use este documento como ponto de retomada entre sessoes. O roteiro privilegia
evidencias simples: comando executado, endpoint respondendo, metrica/log
observavel ou resultado JSON comparavel.

## Projetos

| Projeto | Diretorio local | Papel na demo | Comando base |
| --- | --- | --- | --- |
| `sales-event-project` | `../sales-event-project` | Processar uma venda real com API, RabbitMQ, worker, PostgreSQL e outbox | `make test`, `make test-integration`, `make lint` |
| `operational-observability-platform` | `../operational-observability-platform` | Validar a fundacao de observabilidade: Collector, Prometheus, Tempo, Loki, Grafana e API de controle | `npm run check`, `npm run validate:observability`, `npm run smoke:observability` |
| `OptiFlow` | `.` | Comparar uma decisao operacional deterministica e expor metadata rastreavel | `npm test`, `npm run scenario:small` |

## Guia final

O guia operacional consolidado, com setup por projeto, portas, variaveis, tempo
esperado e problemas conhecidos, esta em
[portfolio-local-execution.md](portfolio-local-execution.md).

Os diagramas finais da arquitetura e dos fluxos estao em
[portfolio-architecture-diagrams.md](portfolio-architecture-diagrams.md).

## Pre-check

Execute antes de gravar ou demonstrar:

```bash
cd ../sales-event-project
git switch main
git pull --ff-only

cd ../operational-observability-platform
git switch main
git pull --ff-only

cd ../OptiFlow
git switch main
git pull --ff-only
```

Resultado esperado:

- Os tres repositorios estao na branch `main`.
- O pull termina em `Already up to date` ou fast-forward.
- Nao existem mudancas locais nao explicadas em `git status --short`.

## Etapa 1: Funcionar

Objetivo: mostrar que o fluxo de negocio real funciona.

Projeto principal: `sales-event-project`.

```bash
cd ../sales-event-project
make test
make test-integration
```

Fluxo demonstrado:

1. API aceita `POST /sales`.
2. API publica `SALE_CREATED` no RabbitMQ.
3. Worker consome a mensagem.
4. Worker reserva estoque e cria venda pendente de pagamento.
5. Webhook de pagamento conclui a venda.
6. Outbox publica `SALE_COMPLETED`.
7. Worker emite tickets e registra entrega.
8. Check-in protege contra uso duplicado.

Evidencias esperadas:

- `make test` passa.
- `make test-integration` passa.
- Logs de API/worker mostram `sale_id`, status e campos de correlacao quando
  aplicavel.
- Metricas de API e worker ficam disponiveis em `/metrics` durante a stack.

## Etapa 2: Medir

Objetivo: validar que a base de observabilidade local recebe e consulta sinais.

Projeto principal: `operational-observability-platform`.

```bash
cd ../operational-observability-platform
cp .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run validate:observability
npm run smoke:observability
npm run check
```

Fluxo demonstrado:

1. PostgreSQL sobe para estado operacional da plataforma.
2. Migrations criam o schema inicial.
3. Collector, Prometheus, Tempo, Loki e Grafana sobem localmente.
4. Smoke test envia telemetria OTLP.
5. Tempo, Loki e Prometheus confirmam ingestao.
6. API `GET /health` devolve IDs de correlacao.

Evidencias esperadas:

- Grafana: `http://localhost:3001`.
- Prometheus: `http://localhost:9090`.
- Tempo: `http://localhost:3200`.
- Loki: `http://localhost:3100`.
- `GET /health` inclui `x-request-id`, `x-correlation-id` e
  `x-transaction-id`.

## Etapa 3: Comparar

Objetivo: mostrar que o OptiFlow produz uma decisao operacional auditavel.

Projeto principal: `OptiFlow`.

```bash
cd ../OptiFlow
nvm use
npm test
OPTIFLOW_REQUEST_ID=req_demo \
OPTIFLOW_CORRELATION_ID=corr_demo \
OPTIFLOW_TRANSACTION_ID=delivery_wave_demo \
OPTIFLOW_OPTIMIZATION_RUN_ID=run_demo \
OPTIFLOW_SERVICE_NAME=optiflow-core \
OPTIFLOW_ENVIRONMENT=local \
npm run scenario:small
```

Fluxo demonstrado:

1. Cenario versionado e validado.
2. Heuristica `nearest-neighbor-capacity` calcula rotas.
3. Motor retorna pedidos atendidos e nao alocados.
4. Resultado inclui distancia, custo, atraso e utilizacao.
5. Resultado preserva IDs de execucao para correlacao futura.

Evidencias esperadas:

- `npm test` passa.
- O JSON de resultado inclui `metadata.requestId`,
  `metadata.correlationId`, `metadata.transactionId`,
  `metadata.optimizationRunId`, `metadata.service` e
  `metadata.environment`.
- O resultado inclui `metrics.totalCost`, `metrics.totalDistance`,
  `metrics.totalLateMinutes`, `metrics.unassignedOrders` e
  `metrics.vehicleUtilization`.

## Etapa 4: Explicar

Objetivo: transformar os sinais e resultados em narrativa tecnica.

Use estes pontos:

- O `sales-event-project` prova processamento confiavel de negocio:
  validacao, fila, worker, outbox, retry, pagamento, ticket e check-in.
- A `operational-observability-platform` prova a base para investigar sistemas:
  logs, metricas, traces, Grafana e controle inicial em PostgreSQL.
- O `OptiFlow` prova decisao operacional: cenario, heuristica, metricas,
  metadata rastreavel e comparacao futura com solver.

Campos que conectam a narrativa:

| Campo | Onde aparece hoje | Uso |
| --- | --- | --- |
| `request_id` | HTTP/logs da plataforma, HTTP/eventos do `sales-event-project`, metadata do `OptiFlow` | Identificar uma tentativa de requisicao ou execucao local |
| `correlation_id` | Contrato compartilhado, HTTP/eventos/logs, metadata do `OptiFlow` | Acompanhar uma jornada entre servicos |
| `transaction_id` | Venda, incidente futuro ou execucao do OptiFlow | Amarrar a entidade principal da investigacao |
| `optimization_run_id` | Resultado do OptiFlow | Rastrear uma execucao de otimizacao |

## Etapa 5: Otimizar

Objetivo: indicar a proxima evolucao concreta.

Proxima entrega recomendada depois deste roteiro:

1. Validar a correlacao ponta a ponta em `sales-event-project` entre API,
   RabbitMQ, worker, outbox, ticket, email e check-in.
2. Criar evidencia no Tempo/Grafana usando a plataforma operacional.
3. Voltar ao `OptiFlow` para fechar formulacao matematica e benchmarks antes
   de integrar solver.

## Limitacoes atuais

- Os projetos continuam independentes; a integracao usa telemetria, Prometheus
  e export JSON em vez de dependencias diretas entre repositorios.
- `sales-event-project` e `operational-observability-platform` publicam
  PostgreSQL em `5432`; para demonstracao integrada, suba somente os servicos
  necessarios do sales junto da plataforma.
- O Prometheus da plataforma coleta o OptiFlow em `host.docker.internal:3000`;
  por isso a API do OptiFlow deve escutar em `0.0.0.0` nessa etapa.

## Checklist de ensaio

- [ ] Rodar os comandos de pre-check nos tres repositorios.
- [ ] Rodar `make test`, `make test-integration` e `make lint` no
  `sales-event-project`.
- [ ] Rodar `npm run check`, `npm run validate:observability` e
  `npm run smoke:observability` na plataforma operacional.
- [ ] Rodar `npm test` e `npm run scenario:small` no `OptiFlow`.
- [ ] Capturar a saida relevante de cada etapa.
- [ ] Registrar ajustes de porta, ambiente ou tempo de inicializacao no guia
  final de execucao local.
