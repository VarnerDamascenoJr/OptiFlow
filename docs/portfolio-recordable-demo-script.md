# Roteiro Gravavel de Demonstracao do Portfolio

Este roteiro foi pensado para uma gravacao de 5 a 10 minutos. Ele mostra os
tres projetos como sistemas independentes que se conectam por contratos
operacionais pequenos: correlacao, telemetria, export de dados e metricas.

## Objetivo da Gravacao

Mensagem central:

```text
processar uma operacao real -> observar o comportamento -> transformar dados em
decisao operacional
```

Competencias demonstradas:

- Backend assicrono confiavel com RabbitMQ, PostgreSQL, outbox, retry e
  webhooks.
- Observabilidade operacional com logs, metricas, traces, dashboards, SLOs e
  investigacao.
- Otimizacao e decisao operacional com cenarios, estrategias, simulacao, risco
  e metricas Prometheus.

## Preparacao Fora da Gravacao

Use o guia final de execucao local:
[portfolio-local-execution.md](portfolio-local-execution.md).

Antes de apertar gravar:

```bash
cd /Users/varnerdamasceno/github-varner/operational-observability-platform
docker compose up -d --wait
npm run validate:observability

cd /Users/varnerdamasceno/github-varner/sales-event-project
OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
OTEL_SERVICE_NAMESPACE=portfolio \
docker compose up --build postgres rabbitmq migrate api worker email-retry-worker

cd /Users/varnerdamasceno/github-varner/OptiFlow
nvm use
OPTIFLOW_API_HOST=0.0.0.0 \
OPTIFLOW_API_PORT=3000 \
OPTIFLOW_SERVICE_NAME=optiflow-api \
OPTIFLOW_ENVIRONMENT=local \
npm run api
```

Deixe abertas estas telas:

- Grafana da plataforma: `http://localhost:3001`
- Dashboard `Operational Observability - Sales Event Journey`
- Dashboard `Operational Observability - OptiFlow Execution`
- Interface do OptiFlow: `http://127.0.0.1:3000`
- Terminal com comandos curl prontos

Se a porta `3000` ja estiver ocupada na maquina de ensaio, use outra porta
para o `OptiFlow`, por exemplo `OPTIFLOW_API_PORT=3300`, e ajuste
temporariamente o target `optiflow-api` do Prometheus para
`host.docker.internal:3300`.

## Linha do Tempo

| Tempo | Cena | Mensagem |
| --- | --- | --- |
| 0:00-0:45 | Contexto | Tres projetos independentes, uma narrativa operacional. |
| 0:45-2:30 | Venda bem-sucedida | O backend processa a jornada real com fila, outbox, ticket e email. |
| 2:30-4:30 | Observabilidade | A jornada aparece como metricas, logs e traces correlacionados. |
| 4:30-6:30 | Falha investigada | Uma falha controlada vira sinal investigavel, nao misterio. |
| 6:30-8:30 | OptiFlow | Dados operacionais viram cenario e uma decisao comparavel. |
| 8:30-9:30 | Fechamento | Decisoes melhores nascem de operacoes bem medidas. |

## Cena 1: Contexto

Fala sugerida:

> "Este portfolio mostra tres camadas de um sistema operacional moderno. O
> `sales-event-project` processa uma venda real. A plataforma de observabilidade
> mede e investiga o comportamento. O `OptiFlow` usa dados dessa operacao para
> comparar planos e apoiar decisao."

Tela:

- Abrir [portfolio-architecture-diagrams.md](portfolio-architecture-diagrams.md)
  ou mostrar rapidamente os tres repositorios lado a lado.

Evidencia esperada:

- Os nomes dos tres projetos e suas responsabilidades ficam claros antes de
  entrar nos comandos.

## Cena 2: Venda Bem-sucedida

Comando:

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

Fala sugerida:

> "A API aceita a venda, preserva IDs de correlacao e publica o evento para o
> worker. A partir daqui, o processamento acontece de forma assincrona."

Tela:

- Terminal com resposta `201` ou `202` e `saleId`.
- Logs do `sales-event-project` mostrando `correlation_id`.

Evidencia esperada:

- `saleId` retornado.
- Logs da API ou worker com `req-demo-sale-001`, `corr-demo-sale-001` ou
  `sale-demo-001`.

## Cena 3: Observabilidade da Jornada

Tela:

- Grafana `Operational Observability - Sales Event Journey`.
- Explore do Loki filtrando por `correlation_id`.
- Tempo com trace do servico `sales-event-api`.

Consultas uteis:

```text
{service_name=~"sales-event-api|sales-event-worker"} | json | correlation_id="corr-demo-sale-001"
```

```text
up{job=~"sales-event-api|sales-event-worker|sales-event-email-retry-worker"}
```

Fala sugerida:

> "O ponto importante nao e so ter dashboard. E conseguir sair de uma venda
> especifica para logs, traces e metricas usando os mesmos identificadores."

Evidencia esperada:

- Dashboard com paineis de venda, pagamento, outbox, worker, ticket e email.
- Loki retornando logs da mesma jornada.
- Prometheus com targets do sales em `up`.

## Cena 4: Falha Investigada

Use uma falha curta e visual. A opcao mais rapida para gravacao e consultar a
jornada de falha ja exposta no dashboard ou disparar um pagamento duplicado no
roteiro de falhas do `sales-event-project`.

Comando opcional:

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
bash scripts/run-failure-scenarios.sh duplicate-payment
```

Fala sugerida:

> "Agora eu provoco uma falha controlada. O objetivo nao e evitar toda falha; e
> garantir que ela apareca com contexto suficiente para uma investigacao curta."

Tela:

- Painel de falhas no dashboard de venda.
- Logs filtrados pelo identificador da jornada.
- Se disponivel, incidente ou roteiro de investigacao da plataforma.

Evidencia esperada:

- Falha ou duplicidade visivel como metrica/log.
- Investigacao aponta para a etapa afetada sem ler o codigo.

## Cena 5: Dados Operacionais Viram Cenario

Comando:

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
go run ./cmd/optiflow-export \
  -sales-event-id 11111111-1111-1111-1111-111111111111 \
  -output /tmp/optiflow-sales-history.json

cd /Users/varnerdamasceno/github-varner/OptiFlow
nvm use
node scripts/import-sales-event-scenario.js \
  /tmp/optiflow-sales-history.json \
  data/scenarios/sales-event-fulfillment.json
npm run scenario:sales-event
```

Fala sugerida:

> "A integracao entre projetos nao e acoplamento direto. O sales exporta um
> historico operacional versionado, e o OptiFlow transforma isso em um cenario
> de atendimento."

Evidencia esperada:

- Export `sales-event-optiflow-export.v1`.
- Cenario `sales-event-fulfillment.json` regenerado.
- Execucao do OptiFlow retornando custo, distancia, atraso e pedidos nao
  alocados.

## Cena 6: Comparar e Decidir

Comandos:

```bash
cd /Users/varnerdamasceno/github-varner/OptiFlow
npm run benchmark:compare
npm run scenario:small:simulate
npm run scenario:small:risk
```

Tela:

- Saida do benchmark comparando estrategias.
- Interface do OptiFlow com resultado da execucao.
- Grafana `Operational Observability - OptiFlow Execution`.

Fala sugerida:

> "Aqui o projeto deixa de ser apenas execucao de algoritmo. Ele compara planos,
> mostra custo e atraso, avalia variacao por simulacao e expoe a propria
> execucao como operacao observavel."

Evidencia esperada:

- Resultado comparavel entre estrategias.
- Metricas `optiflow_optimization_plan_cost`,
  `optiflow_optimization_plan_distance` e
  `optiflow_optimization_plan_late_minutes` no Prometheus.
- Dashboard do OptiFlow com execucao por status, custo, distancia e fila.

## Fechamento

Fala sugerida:

> "A historia completa e: eu processo uma operacao real, observo essa operacao
> com contexto suficiente para investigar falhas, reaproveito os dados para
> planejar melhor e exponho a decisao tambem como operacao mensuravel."

Pontos finais:

- O `sales-event-project` demonstra confiabilidade de backend.
- A plataforma demonstra investigacao e operacao.
- O `OptiFlow` demonstra decisao mensuravel.
- A integracao e leve: telemetria, export JSON e metricas.

## Checklist de Ensaio

- [x] Cronometrar a gravacao e cortar telas que passem de 10 minutos.
- [x] Confirmar que a venda retorna `saleId`.
- [x] Confirmar que o dashboard de vendas mostra sinais atualizados.
- [x] Confirmar que a falha escolhida aparece no dashboard ou nos logs.
- [x] Confirmar que o export do sales gera JSON valido.
- [x] Confirmar que o OptiFlow executa o cenario importado.
- [x] Confirmar que o Prometheus da plataforma coleta `optiflow-api`.
- [x] Encerrar stacks com `docker compose down` nos repositorios usados.
- [x] Parar Colima se a sessao acabou: `colima stop`.

## Resultado do Ensaio de 2026-09-21

- Ensaio tecnico completo executado com a stack da plataforma, `sales-event-project`
  em projeto Compose temporario e `OptiFlow` na porta `3300`.
- Venda bem-sucedida validada com `saleId` e status final `COMPLETED`.
- Falha investigavel validada por replay idempotente de webhook de pagamento,
  com `payment_webhook_replays_total{provider="p5_3_rehearsal"} = 1`.
- Export Sales -> OptiFlow gerou JSON `sales-event-optiflow-export.v1` com
  2 vendas `COMPLETED`, 2 itens e total `20000`.
- Execucao HTTP do `OptiFlow` terminou `SUCCEEDED`; Prometheus coletou
  `optiflow_optimization_plan_cost = 162` em `host.docker.internal:3300`.
- Evidencia:
  `/Users/varnerdamasceno/github-varner/evidence/p5.3-recordable-demo-rehearsal-2026-09-21`.
