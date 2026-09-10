# Mapa dos Projetos do Portfolio

Este documento resume o estado atual dos tres projetos usados na narrativa do
portfolio. Ele nao e um backlog de tarefas. A funcao dele e ajudar a entender o
que ja existe, o que ainda falta e em qual ordem vale acelerar.

## Narrativa Geral

Os tres projetos devem continuar separados e executaveis de forma independente.
A narrativa compartilhada e:

```text
funcionar -> medir -> comparar -> explicar -> otimizar
```

Cada repositorio cobre uma parte diferente dessa historia:

| Projeto | Papel principal | Estado atual |
| --- | --- | --- |
| `sales-event-project` | Sistema de negocio assicrono e confiavel | Mais maduro; fluxo completo com API, fila, worker, banco, outbox, retry e observabilidade basica |
| `operational-observability-platform` | Plataforma para medir, correlacionar e investigar sistemas distribuidos | Fundacao criada; stack local de telemetria pronta; falta aplicacao instrumentada e modelo operacional |
| `OptiFlow` | Motor de decisao e otimizacao operacional | MVP deterministico iniciado; heuristica e metricas prontas; falta solver, backend, persistencia e comparacao |

## Estado de Integracao

### Ja integrado tecnicamente

Hoje as integracoes tecnicas existem dentro de cada repositorio, nao entre os
repositorios.

No `sales-event-project`:

- API Gin integrada com RabbitMQ.
- Worker Go integrado com RabbitMQ e PostgreSQL.
- Migrations versionadas integradas ao Docker Compose.
- Fluxo de pagamento integrado com webhook assinado.
- Outbox integrada ao worker para publicacao confiavel.
- Emissao de tickets com QR Code integrada ao fluxo de venda concluida.
- Retry de email integrado ao worker.
- Retencao de dados temporarios integrada ao worker.
- Prometheus, Loki, Promtail e Grafana integrados ao ambiente local.
- IDs de correlacao em HTTP e eventos: `X-Request-ID`, `X-Correlation-ID`,
  `X-Transaction-ID` e metadata em `SALE_CREATED`.
- Headers AMQP de correlacao e contexto W3C de trace em publicacoes RabbitMQ.
- OpenTelemetry opcional para API e worker, com nomes de servico distintos.
- Teste de integracao cobre venda, reserva, pagamento, emissao de ticket e check-in.

No `operational-observability-platform`:

- Fastify integrado com testes unitarios e e2e.
- Middleware de correlacao HTTP com geracao, preservacao e normalizacao de
  `request_id`, `correlation_id` e `transaction_id`.
- Logs estruturados com campos de correlacao.
- Primeira migration, runner de migrations e camada PostgreSQL inicial.
- Docker Compose integrado com PostgreSQL, OpenTelemetry Collector, Prometheus,
  Tempo, Loki e Grafana.
- Grafana provisionado com datasources.
- Scripts de validacao e smoke test da stack de observabilidade.

No `OptiFlow`:

- Validador de cenario integrado ao motor.
- Heuristica `nearest-neighbor-capacity` integrada ao calculo de rotas.
- Calculo de metricas integrado ao resultado do plano.
- Metadata de execucao com `requestId`, `correlationId`, `transactionId`,
  `optimizationRunId`, `service` e `environment`.
- Cenario pequeno versionado para execucao reproduzivel.
- Testes cobrindo validacao, rota deterministica, metricas e pesos de custo.

### Ja integrado conceitualmente

- O README do `OptiFlow` ja posiciona os tres projetos como portfolio
  complementar.
- Existe contrato compartilhado de correlacao em
  [portfolio-correlation-conventions.md](portfolio-correlation-conventions.md).
- O `sales-event-project` pode fornecer eventos, pedidos e historico operacional.
- A `operational-observability-platform` pode correlacionar metricas, logs e
  traces dos sistemas.
- O `OptiFlow` pode consumir dados operacionais e devolver recomendacoes.

### Ainda nao integrado entre repositorios

- O `sales-event-project` ainda nao envia traces OpenTelemetry para a plataforma
  de observabilidade em uma demonstracao integrada validada.
- O contexto de correlacao ja e publicado por RabbitMQ, mas ainda precisa ser
  validado ponta a ponta entre API, broker, worker, logs e eventos derivados.
- A plataforma de observabilidade ainda nao possui dashboard especifico para a
  jornada de venda.
- O `OptiFlow` ainda nao consome dados reais do `sales-event-project`.
- O `OptiFlow` ainda nao envia metricas ou resultados para a plataforma de
  observabilidade.
- O contrato compartilhado ainda precisa ser exercitado em uma demonstracao
  integrada com evidencia no Grafana.

## Sales Event Project

### O que ja foi implementado

- Backend Go com Gin.
- API HTTP para criacao de vendas, intencoes de pagamento, webhooks de pagamento
  e email, consulta de vendas e check-in.
- RabbitMQ como broker de eventos.
- Worker Go para processar `SALE_CREATED` e `SALE_COMPLETED`.
- PostgreSQL com migrations e seed local.
- Reserva de ingressos e controle de estoque.
- Criacao de payment intent.
- Confirmacao de pagamento por webhook assinado.
- Registro de eventos de dominio: `SALE_CREATED`, `SALE_COMPLETED` e
  `SALE_FAILED`.
- Outbox pattern com estados `PENDING`, `FAILED`, `PUBLISHED` e `DEAD_LETTER`.
- Retry da outbox com backoff.
- Emissao de tickets unicos com QR Code.
- Envio de email com fallback por log quando SMTP nao esta configurado.
- Retry de email com limite de tentativas.
- Eventos de email para entregue, aberto, clicado e bounce.
- Check-in com protecao contra uso duplicado do mesmo ticket.
- API keys locais por papel: admin, support, check-in e payment provider.
- Rate limit nos endpoints publicos.
- Metricas Prometheus para API, pagamentos, eventos, worker e tickets.
- Logs estruturados com redacao de campos sensiveis.
- IDs de correlacao em HTTP, contexto de publicacao RabbitMQ e metadata no
  evento `SALE_CREATED`.
- OpenTelemetry opcional para API e worker, com propagacao de trace por
  RabbitMQ e persistencia de `trace_context` na outbox.
- Loki, Promtail e Grafana no ambiente local.
- Testes unitarios e teste de integracao ponta a ponta com Docker Compose.

### O que ainda precisa ser implementado ou fortalecido

- Separar o retry de notificacoes em worker proprio.
- Validar a correlacao completa entre venda, pagamento, outbox, ticket, email e
  check-in.
- Completar spans de negocio e evidencia OpenTelemetry no Tempo/Grafana.
- Garantir que consumidores restaurem metadados de negocio recebidos por
  RabbitMQ nos logs e eventos derivados.
- Criar cenarios controlados de falha para demonstracao: pagamento duplicado,
  consumidor atrasado, falha persistente de email e publicacao com retry.
- Documentar um roteiro de demonstracao operacional.
- Preparar dashboards com foco em jornada de negocio, nao apenas metricas
  tecnicas.

### Papel na aceleracao

Este deve ser o primeiro projeto a consolidar. Ele e a fonte mais concreta da
narrativa, porque ja demonstra processamento assicrono real com confiabilidade.

## Operational Observability Platform

### O que ja foi implementado

- Projeto Node.js/TypeScript com Fastify.
- Endpoint `GET /health`.
- Configuracao de lint, formatacao, testes unitarios, testes e2e e build.
- Docker Compose com PostgreSQL, OpenTelemetry Collector, Prometheus, Tempo,
  Loki e Grafana.
- Portas locais vinculadas a `127.0.0.1`.
- Retencao local de telemetria em 24 horas.
- Datasources do Grafana provisionados.
- Scripts `validate:observability` e `smoke:observability`.
- Primeira migration, runner de migrations e camada inicial de acesso ao
  PostgreSQL.
- Middleware HTTP de correlacao com `request_id`, `correlation_id` e
  `transaction_id`.
- Logs estruturados com campos de correlacao e testes para propagacao de IDs.
- Checklist operacional com fases claras para evolucao.

### O que ainda precisa ser implementado ou fortalecido

- Validar health/e2e com estado real do PostgreSQL antes de fechar P2.1.
- Incluir `trace_id` nos logs quando a instrumentacao OpenTelemetry da API
  entrar.
- API ou modulo de demonstracao que produza telemetria real.
- Instrumentacao HTTP com OpenTelemetry.
- Metricas RED: rate, errors e duration.
- Traces enviados ao Collector.
- Logs JSON com `trace_id`, `request_id` e identificador de transacao.
- Fluxo assincrono demonstravel.
- Dashboards tecnicos e de negocio.
- Modelo de SLO, SLI e error budget no PostgreSQL.
- Alertas baseados em sintomas.
- Modelo de incidentes, evidencias, hipoteses e linha do tempo.
- Integracao com `sales-event-project`.

### Papel na aceleracao

Este deve vir depois da consolidacao do `sales-event-project`. A prioridade nao
e criar muitas features de plataforma agora, e sim instrumentar um fluxo real e
mostrar investigacao ponta a ponta.

## OptiFlow

### O que ja foi implementado

- Projeto Node.js 24 sem dependencias externas.
- Dominio inicial definido: distribuicao de entregas.
- Modelo de dominio documentado.
- Cenario pequeno reproduzivel em JSON.
- Funcao publica `solveScenario`.
- Validacao estrutural de cenarios.
- Validacao de localidades, veiculos, pedidos, janelas de tempo, capacidade e
  matriz de distancia.
- Heuristica deterministica `nearest-neighbor-capacity`.
- Geracao de rotas por veiculo com paradas de inicio, pedidos e retorno.
- Calculo de chegada, inicio de servico, saida, carga acumulada e atraso.
- Lista de pedidos nao alocados.
- Metricas de pedidos atendidos, demanda, distancia, atraso, custo e utilizacao
  dos veiculos.
- Metadata de execucao rastreavel com `requestId`, `correlationId`,
  `transactionId`, `optimizationRunId`, `service` e `environment`.
- Testes com `node --test`.
- Script para executar o cenario pequeno.
- Documentos de decisoes e notas de tecnologia.

### O que ainda precisa ser implementado ou fortalecido

- Fechar a formulacao matematica do problema.
- Integrar OR-Tools ou outro solver adequado.
- Comparar heuristica versus solver com os mesmos cenarios.
- Implementar restricoes configuraveis alem de capacidade basica.
- Persistir cenarios, execucoes e resultados.
- Criar API para criar, validar e consultar cenarios.
- Criar processamento assincrono de execucoes de otimizacao.
- Expor status e resultado das execucoes.
- Adicionar tratamento de falhas, tentativas e limites de execucao.
- Criar interface para editar, duplicar e comparar cenarios.
- Definir variaveis incertas para simulacao: demanda, tempo de viagem,
  cancelamento ou capacidade.
- Implementar estatisticas descritivas, Monte Carlo, percentis e analise de
  sensibilidade.
- Avaliar decisao orientada a risco com CVaR.
- Preparar Docker, CI e demonstracao.

### Papel na aceleracao

Este projeto deve ser acelerado depois que houver clareza sobre duas coisas:

1. O motor deterministico esta correto o suficiente para servir de base.
2. A comparacao entre estrategias gera uma conclusao mensuravel.

Sem isso, a API, a fila e a interface podem crescer em cima de um nucleo ainda
fraco. O valor do `OptiFlow` esta na decisao explicavel, nao apenas na execucao
de um algoritmo.

## Ordem Recomendada de Execucao

### Etapa 1: consolidar o sistema real

Projeto principal: `sales-event-project`.

Objetivo: transformar o fluxo de venda em uma demonstracao robusta de sistema
assincrono confiavel.

Resultado esperado:

- Fluxo ponta a ponta facil de rodar.
- Falhas e retries demonstraveis.
- Metricas e logs suficientes para investigacao.
- README e docs explicando confiabilidade, outbox e eventos.

### Etapa 2: observar o sistema real

Projeto principal: `operational-observability-platform`.

Objetivo: conectar a observabilidade a um fluxo que ja existe.

Resultado esperado:

- Convencao de correlacao definida.
- Traces, metricas e logs de uma jornada real.
- Dashboard da jornada de venda.
- Primeiros SLOs simples.

### Etapa 3: fortalecer o motor de decisao

Projeto principal: `OptiFlow`.

Objetivo: sair de heuristica isolada para comparacao justificavel entre
estrategias.

Resultado esperado:

- Modelo matematico documentado.
- Solver integrado.
- Comparacao heuristica versus solver.
- Metricas de ganho, custo, distancia, atraso e utilizacao.

### Etapa 4: criar integracao leve entre os projetos

Objetivo: demonstrar que os projetos conversam sem virarem um monolito.

Integracoes recomendadas:

- `sales-event-project` exporta eventos e metricas com correlation IDs.
- `operational-observability-platform` recebe e correlaciona a jornada.
- `OptiFlow` consome um dataset exportado ou sintetico inspirado no fluxo real.
- `OptiFlow` gera uma recomendacao ou comparacao de estrategia.

Nesta etapa, prefira arquivos exportados, contratos pequenos e HTTP simples. Nao
crie dependencia forte entre repositorios antes de a narrativa estar clara.

### Etapa 5: fechar a narrativa de portfolio

Objetivo: tornar a apresentacao clara para quem olha os repositorios.

Resultado esperado:

- Cada README explica o papel independente do projeto.
- Cada README aponta para a narrativa compartilhada.
- Existe um roteiro de demo com ordem:

```text
processar evento -> observar comportamento -> comparar cenarios -> justificar decisao
```

## Proxima Melhor Acao

A proxima melhor acao e fazer uma rodada curta de consolidacao no
`sales-event-project`, porque ele ja tem o maior numero de pecas implementadas e
gera material real para os outros dois projetos.

Depois disso, a segunda acao deve ser instrumentar esse fluxo na
`operational-observability-platform`.

O `OptiFlow` deve ser acelerado na sequencia, com foco primeiro em comparacao
deterministica entre heuristica e solver. A parte estatistica e a otimizacao sob
incerteza devem entrar depois que a base deterministica estiver confiavel.
