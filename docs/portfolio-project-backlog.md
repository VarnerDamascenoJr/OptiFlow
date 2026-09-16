# Backlog dos Projetos do Portfolio

Este documento complementa [portfolio-project-map.md](portfolio-project-map.md).
O mapa explica o estado e a narrativa dos projetos. Este backlog organiza o que
falta entregar em atividades testaveis.

## Como usar

- Cada item deve terminar com uma evidencia executavel, observavel ou
  documentada.
- Um item so deve ser marcado como concluido quando o criterio de aceite e a
  verificacao estiverem satisfeitos.
- Itens ja concluidos permanecem descritos no mapa; aqui ficam as proximas
  entregas.

## Definicao de pronto

Uma atividade deste backlog esta pronta quando:

- O comportamento foi implementado no repositorio correto.
- Existem testes automatizados quando o comportamento puder regredir por codigo.
- Existe evidencia manual quando a entrega depender de dashboard, roteiro,
  telemetria ou demonstracao operacional.
- O README ou documento operacional foi atualizado quando a forma de executar ou
  demonstrar o projeto mudar.
- Os comandos de qualidade do projeto continuam passando.

Comandos base por repositorio:

| Projeto | Verificacao base |
| --- | --- |
| `sales-event-project` | `make test`, `make test-integration`, `make lint` |
| `operational-observability-platform` | `npm run check`, `npm run validate:observability`, `npm run smoke:observability` |
| `OptiFlow` | `npm test`, `npm run scenario:small` |

## Resumo rapido para novas sessoes

Use esta secao como ponto de retomada antes de escolher a proxima tarefa. O
backlog abaixo continua sendo a lista detalhada; este quadro mostra o progresso
ja auditado entre sessoes.

| Item | Estado | Evidencia atual | Proximo cuidado |
| --- | --- | --- | --- |
| P0.1 Convencoes compartilhadas de correlacao | Concluido | `docs/portfolio-correlation-conventions.md` define IDs, HTTP, RabbitMQ, logs, traces, metricas, eventos e jornadas. Os READMEs dos tres projetos apontam para esse contrato. | Manter o documento como fonte de verdade quando novos fluxos surgirem. |
| P0.2 Roteiro principal da narrativa | Documentado, pendente ensaio | `docs/portfolio-demo-runbook.md` define a narrativa executavel, comandos, fluxos e evidencias esperadas dos tres projetos. | Executar o roteiro completo em ambiente local reiniciado e registrar ajustes. |
| P1.2 Correlacao da jornada de venda | Concluido | `sales-event-project` gera/preserva `X-Request-ID`, `X-Correlation-ID` e `X-Transaction-ID` no `POST /sales`, propaga metadata por pagamento, outbox, ticket, email e check-in, e registra campos em logs estruturados. PR #6 merged. Validado com `make test`, `make test-integration` e `make lint` em 2026-09-16. | Manter os identificadores alinhados ao contrato compartilhado quando novos fluxos surgirem. |
| P1.3 Contexto por RabbitMQ | Concluido | `sales-event-project` injeta headers AMQP de correlacao, contexto W3C de trace e preserva metadados de negocio no consumo e em eventos derivados. Evidencia: `/Users/varnerdamasceno/github-varner/evidence/p1.3-rabbitmq-context-2026-09-11`. | Usar este contrato como base para a instrumentacao OpenTelemetry da P1.4. |
| P1.4 OpenTelemetry no `sales-event-project` | Concluido | API e worker exportam traces OTLP opcionais, propagam contexto por HTTP/RabbitMQ/outbox e possuem spans de negocio para venda, pagamento, outbox, ticket, email e check-in. Evidencia: `/Users/varnerdamasceno/github-varner/evidence/p1.4-opentelemetry-sales-2026-09-11`. | Usar os traces como base para P1.5/P1.7 e para a integracao P4.1 com dashboards da plataforma. |
| P1.5 Confiabilidade da publicacao RabbitMQ | Concluido | `sales-event-project` usa publisher confirms, `mandatory=true`, erro explicito para `nack`/mensagem nao roteavel e mantem retry/dead-letter da outbox. Verificacao: `make test` e `make test-integration` em 2026-09-12. | Usar a P1.6 como roteiro demonstravel dessas falhas. |
| P1.6 Cenarios controlados de falha | Concluido | `sales-event-project` tem `scripts/run-failure-scenarios.sh` e `docs/failure-scenarios.md` cobrindo pagamento duplicado, consumidor atrasado, falha persistente de email e outbox retry/dead-letter. Verificacao: roteiro completo executado em 2026-09-12; `make test`; `make lint`. | Usar os cenarios como entrada para dashboard da jornada de negocio na P1.7. |
| P1.7 Dashboard da jornada de negocio | Concluido | `sales-event-project` provisiona o dashboard Grafana `Sales Business Journey`, adiciona metricas para pagamento duplicado e check-in, e documenta o smoke em `docs/business-journey-dashboard.md`. Verificacao: dashboard encontrado no Grafana local; smoke com venda aprovada, pagamento duplicado, falha de outbox e check-in em 2026-09-12; `make test`; `make lint`. | Usar esta visao local como base para o dashboard consolidado da plataforma em P4.2. |
| P2.1 PostgreSQL na plataforma operacional | Concluido | `operational-observability-platform` tem migrations, runner, camada PostgreSQL, `.env.example`, health com banco real e e2e. PR #6 merged. Validado com `npm run check` em 2026-09-16. | Usar a base de persistencia para SLOs, incidentes e historico operacional. |
| P2.2 IDs e logs na plataforma operacional | Concluido | Fastify gera/preserva IDs, devolve headers, adiciona `request_id`, `correlation_id`, `transaction_id` e `trace_id` aos logs, com testes unitarios/e2e. PR #7 merged. Validado com `npm run check` em 2026-09-16. | Manter os campos compativeis com Loki, Tempo e o contrato compartilhado. |
| P3 OptiFlow deterministico | Em andamento avancado | Heuristica, metricas, cenario pequeno, metadata de execucao, testes e formulacao matematica inicial existem. | Iniciar benchmarks deterministicos e preparar comparacao com solver. |

## Prioridade P0: contrato comum do portfolio

### P0.1 Definir convencoes compartilhadas de correlacao

- [x] Criar documento de convencoes com `correlation_id`, `request_id`,
  `transaction_id`, nomes de servicos, nomes de eventos e labels de metricas.
- [x] Registrar exemplos para HTTP, RabbitMQ, logs, traces e metricas.
- [x] Definir como uma venda do `sales-event-project` vira uma transacao
  rastreavel na `operational-observability-platform`.
- [x] Definir como uma execucao do `OptiFlow` deve expor identificadores e
  metricas.

Criterio de aceite:

- Existe um documento versionado com exemplos de payload, headers e labels.
- Os tres projetos conseguem adotar a convencao sem depender tecnicamente uns
  dos outros.

Verificacao:

- [x] Revisao manual do documento.
- [x] Links adicionados nos READMEs dos tres projetos ou em seus docs operacionais.

Status:

- Concluido. O contrato vive em
  [portfolio-correlation-conventions.md](portfolio-correlation-conventions.md).

### P0.2 Criar roteiro principal da narrativa

- [x] Documentar a historia demonstravel: funcionar, medir, comparar, explicar
  e otimizar.
- [x] Definir qual comando inicia cada projeto.
- [x] Definir qual fluxo sera apresentado em cada etapa da demonstracao.
- [x] Definir quais metricas, logs, traces e resultados serao mostrados.

Criterio de aceite:

- Uma pessoa consegue seguir o roteiro localmente sem conhecer o codigo.
- O roteiro deixa claro o papel independente de cada projeto.

Verificacao:

- Executar o roteiro em maquina limpa ou ambiente local reiniciado.
- Registrar os comandos e resultados esperados no documento.

Status:

- Documentado, pendente ensaio. O roteiro executavel existe em
  [portfolio-demo-runbook.md](portfolio-demo-runbook.md), mas ainda falta
  executar a demonstracao completa em ambiente local reiniciado.

## Prioridade P1: consolidar o `sales-event-project`

Objetivo: transformar o fluxo de venda em uma demonstracao robusta de sistema
assincrono confiavel.

### P1.1 Separar retry de notificacoes em worker proprio

- [x] Criar processo, comando ou modo dedicado para retry de email.
- [x] Manter o worker de vendas focado em processamento de eventos de venda.
- [x] Garantir que o retry respeite backoff, limite de tentativas e
  `DEAD_LETTER`.
- [x] Atualizar Docker Compose e documentacao de execucao.

Criterio de aceite:

- O retry pode ser iniciado, parado e observado separadamente.
- Uma falha persistente de email nao bloqueia o processamento principal de
  vendas e tickets.

Verificacao:

- [x] Teste unitario para regras de retry e limite de tentativas.
- [x] Teste de integracao ou smoke test simulando email falho e retry.
- [x] `make test`
- [x] `make test-integration`

Status:

- Concluido. PR #4 (`feat: split email retry into dedicated worker`) e PR #5
  (`test: add email retry integration smoke`) foram mergeados. Validado em
  2026-09-16 com `make test`, `make test-integration` e `make lint`; a
  integracao confirmou falha persistente de email indo para `DEAD_LETTER`.

### P1.2 Fortalecer correlacao da jornada de venda

- [x] Gerar ou aceitar `correlation_id` no inicio do `POST /sales`.
- [x] Propagar `correlation_id` por venda, pagamento, outbox, ticket, email e
  check-in.
- [x] Persistir identificadores necessarios para investigacao historica.
- [x] Incluir os identificadores nos logs estruturados.

Criterio de aceite:

- Uma venda pode ser investigada de ponta a ponta usando um unico identificador.
- Logs de API e worker possuem campos consistentes para a mesma jornada.

Verificacao:

- [x] Testes unitarios para headers/payloads de correlacao.
- [x] Teste de integracao validando propagacao do identificador.
- [x] Consulta LogQL documentada filtrando uma venda pelo identificador.
- [x] `make test`
- [x] `make test-integration`

Status:

- Concluido. PR #6 (`feat: strengthen sale journey correlation`) foi mergeado.
  Validado em 2026-09-16 com `make test`, `make test-integration` e
  `make lint`.

### P1.3 Propagar contexto por eventos RabbitMQ

- [x] Adicionar metadados de correlacao nas mensagens RabbitMQ.
- [x] Garantir que API, outbox publisher e worker preservem os metadados.
- [x] Documentar o envelope ou headers usados nas mensagens.

Criterio de aceite:

- Eventos `SALE_CREATED` e `SALE_COMPLETED` carregam contexto suficiente para
  correlacao externa.
- O worker registra logs com o mesmo contexto recebido.

Verificacao:

- Teste unitario para publish/consume com metadados.
- Teste de integracao verificando contexto do fluxo assincrono.
- `make test`
- `make test-integration`
- Smoke manual com logs correlacionados em
  `/Users/varnerdamasceno/github-varner/evidence/p1.3-rabbitmq-context-2026-09-11`.

### P1.4 Adicionar OpenTelemetry na API e no worker

- [x] Instrumentar HTTP server da API.
- [x] Instrumentar processamento de mensagens no worker.
- [x] Criar spans para venda, pagamento, outbox, emissao de ticket e email.
- [x] Configurar exportacao OTLP por variaveis de ambiente.
- [x] Manter o projeto executavel sem Collector quando OTLP estiver desativado.

Criterio de aceite:

- A jornada de uma venda aparece como trace distribuido quando o Collector esta
  disponivel.
- A aplicacao continua funcionando em ambiente local basico sem telemetria
  externa.

Verificacao:

- [x] Testes unitarios para configuracao de tracing.
- [x] Smoke test com Collector recebendo traces.
- [x] Evidencia no Tempo/Grafana em
  `/Users/varnerdamasceno/github-varner/evidence/p1.4-opentelemetry-sales-2026-09-11`.
- [x] `make test`
- [x] `make test-integration`

Status:

- Concluido. A execucao manual gerou venda aprovada, pagamento via webhook,
  emissao de ticket, envio de email em modo log e check-in, com trace
  distribuido salvo em `tempo-trace.json`.

### P1.5 Fortalecer confiabilidade da publicacao RabbitMQ

- [x] Avaliar uso de publisher confirms para publicacoes criticas.
- [x] Avaliar uso de `mandatory=true` ou estrategia equivalente para detectar
  mensagem sem rota.
- [x] Garantir que evento sem rota nao seja marcado como `PUBLISHED` na outbox.
- [x] Criar tratamento explicito para routing key desconhecida.
- [x] Documentar o comportamento esperado para falha de broker, fila ausente e
  publicacao sem binding.

Criterio de aceite:

- A outbox so marca evento como publicado quando houver confirmacao suficiente
  de entrega ao broker.
- Uma falha de roteamento vira retry ou `DEAD_LETTER`, nao sucesso silencioso.

Verificacao:

- [x] Testes unitarios para erro de publicacao e routing key desconhecida.
- [x] Teste de integracao ou smoke test com binding ausente.
- [x] `make test`
- [x] `make test-integration`

Status:

- Concluido. `sales-event-project` publica com `mandatory=true`, aguarda
  publisher confirms, trata `basic.return`/`nack` como erro e deixa a outbox em
  fluxo de retry/dead-letter quando a publicacao nao e confirmada. Verificado em
  2026-09-12 com `make test` e `make test-integration`.

### P1.6 Criar cenarios controlados de falha

- [x] Criar script ou roteiro para pagamento duplicado.
- [x] Criar script ou roteiro para consumidor atrasado.
- [x] Criar script ou roteiro para falha persistente de email.
- [x] Criar script ou roteiro para publicacao da outbox com retry.
- [x] Registrar resultados esperados, metricas e logs de cada falha.

Criterio de aceite:

- Cada falha pode ser provocada de forma repetivel em ambiente local.
- Cada cenario mostra recuperacao, degradacao controlada ou estado final
  esperado.

Verificacao:

- [x] Scripts documentados executados localmente.
- [x] Evidencia em logs, metricas ou banco.
- [x] `make test-integration` para o fluxo principal continuar estavel.

Status:

- Concluido. `sales-event-project` recebeu `scripts/run-failure-scenarios.sh` e
  `docs/failure-scenarios.md`; o roteiro completo foi executado localmente em
  2026-09-12. A branch tambem manteve `make test` e `make lint` verdes.

### P1.7 Preparar dashboard da jornada de negocio

- [x] Criar painel de vendas criadas, pendentes, concluidas e falhas.
- [x] Criar painel de pagamentos aprovados, recusados e duplicados.
- [x] Criar painel de outbox por estado e tentativas.
- [x] Criar painel de tickets emitidos, emails enviados e check-ins.
- [x] Criar filtros por evento, status e janela de tempo.

Criterio de aceite:

- O dashboard permite explicar a jornada de venda sem consultar o codigo.
- O dashboard evidencia gargalos e falhas relevantes.

Verificacao:

- [x] Dashboard provisionado no Grafana.
- [x] Smoke manual apos gerar uma venda aprovada e uma falha.
- [x] Screenshot ou roteiro de demonstracao documentado.

Status:

- Concluido. `sales-event-project` recebeu
  `deployments/grafana/dashboards/sales-business-journey.json`,
  `docs/business-journey-dashboard.md`, a metrica
  `payment_webhook_replays_total` para duplicidade/idempotencia de pagamento e
  `check_ins_created_total` para check-ins concluidos. Verificacao local em
  2026-09-12: dashboard `sales-business-journey` encontrado pela API do
  Grafana, smoke com `duplicate-payment`, `outbox-retry` e check-in manual,
  `make test` e `make lint`.

## Prioridade P2: observar o sistema real

Projeto principal: `operational-observability-platform`.

Objetivo: conectar a plataforma de observabilidade a um fluxo real antes de
expandir funcionalidades de produto.

### P2.1 Criar primeira migration e camada PostgreSQL

- [x] Definir schema inicial para projetos, servicos e configuracoes
  operacionais.
- [x] Criar runner de migration ou escolher ferramenta simples para migrations.
- [x] Implementar camada de acesso ao PostgreSQL.
- [x] Adicionar `.env.example` com variaveis necessarias.

Criterio de aceite:

- A aplicacao sobe localmente, aplica ou valida migrations e acessa o banco.
- O health check consegue informar estado basico da API e do PostgreSQL.

Verificacao:

- [x] Testes unitarios para camada de acesso.
- [x] Teste e2e cobrindo health com banco disponivel.
- [x] `npm run check`

Status:

- Concluido. PR #6 (`feat: report PostgreSQL health`) foi mergeado. Validado em
  2026-09-16 com `npm run check`, incluindo migrations e e2e com PostgreSQL.

### P2.2 Implementar convencoes de logs e IDs

- [x] Criar middleware para `request_id`.
- [x] Aceitar `correlation_id` recebido por header.
- [x] Emitir logs JSON com `trace_id`, `request_id` e `transaction_id` quando
  aplicavel.
- [x] Documentar headers e campos de log.

Criterio de aceite:

- Toda requisicao HTTP tem identificador rastreavel.
- Logs da API permitem correlacao com trace e transacao.

Verificacao:

- [x] Testes unitarios para middleware.
- [x] Teste e2e validando headers de resposta.
- [x] Consulta Loki documentada.
- [x] `npm run check`

Status:

- Concluido. PR #7 (`feat: add trace id log correlation`) foi mergeado.
  Validado em 2026-09-16 com `npm run check`.

### P2.3 Criar API demonstradora instrumentada

- [x] Criar fluxo HTTP que simule uma transacao operacional.
- [x] Adicionar uma etapa assincrona demonstravel.
- [x] Simular dependencia lenta ou indisponivel.
- [x] Emitir metricas RED: rate, errors e duration.
- [x] Exportar traces para o Collector.

Criterio de aceite:

- Uma unica requisicao gera metrica, log e trace correlacionados.
- O fluxo inclui sucesso, erro e latencia controlada.

Verificacao:

- [x] Testes unitarios para handlers e simulacao.
- [x] Teste e2e para sucesso e erro.
- [x] `npm run check`
- [x] `npm run smoke:observability`

Status:

- Concluido. PR #8 (`feat: instrument demo transaction telemetry`) foi
  mergeado. Validado em 2026-09-16 com `npm run check` e
  `npm run smoke:observability`.

### P2.4 Criar dashboards tecnicos e de negocio

- [x] Criar dashboard tecnico por servico com throughput, erros e latencia.
- [x] Criar dashboard de negocio com transacoes, sucesso, falha e degradacao.
- [x] Adicionar filtros por servico, ambiente e periodo.
- [x] Criar links do Grafana para traces no Tempo.
- [x] Criar links de traces para logs no Loki.

Criterio de aceite:

- O dashboard permite sair de um aumento de erro para traces e logs relevantes.
- O dashboard mostra tanto sintomas tecnicos quanto impacto operacional.

Verificacao:

- [x] Dashboards provisionados.
- [x] `npm run validate:observability`
- [x] `npm run smoke:observability`
- [x] Roteiro manual de investigacao documentado.

Status:

- Concluido. PR #9 (`feat: provision observability dashboards`) foi mergeado.
  Validado em 2026-09-16 com `npm run validate:observability` e
  `npm run smoke:observability`.

### P2.5 Modelar SLO, SLI e error budget

- [x] Criar tabelas de SLOs, SLIs e janelas de avaliacao.
- [x] Criar API para cadastrar e consultar SLOs.
- [x] Calcular disponibilidade simples.
- [x] Calcular SLI de latencia.
- [x] Calcular consumo e saldo de error budget.
- [x] Expor estado do SLO por endpoint ou dashboard.

Criterio de aceite:

- Um servico demonstrador tem SLO configurado e estado calculado.
- Os calculos sao reproduziveis por testes.

Verificacao:

- [x] Testes unitarios para disponibilidade, latencia e error budget.
- [x] Teste e2e para cadastro e consulta de SLO.
- [x] `npm run check`

Status:

- Concluido. PR #10 (`feat: model slo error budgets`) foi mergeado. Validado em
  2026-09-16 com `npm run check`.

### P2.6 Criar alertas baseados em sintomas

- [x] Configurar regras Prometheus para erro alto.
- [x] Configurar regras Prometheus para latencia alta.
- [x] Configurar regra para consumo acelerado de error budget.
- [x] Documentar severidade, causa provavel e primeira acao de resposta.
- [x] Evitar alertas duplicados para o mesmo sintoma.

Criterio de aceite:

- Um erro controlado dispara alerta esperado.
- O alerta aponta para dashboard, trace ou runbook de investigacao.

Verificacao:

- [x] Regras validadas no Prometheus.
- [x] Smoke manual provocando erro ou latencia.
- [x] Roteiro de incidente documentado.

Status:

- Concluido. PR #11 (`feat: add symptom based alerts`) foi mergeado. Validado
  em 2026-09-16 com `npm run validate:observability`, que confirmou 3 regras de
  alerta, e `npm run smoke:observability`.

### P2.7 Modelar incidentes e investigacao guiada

- [x] Criar tabelas para incidentes, evidencias, hipoteses e linha do tempo.
- [x] Criar API para abrir, atualizar e encerrar incidentes.
- [x] Associar incidentes a alertas, servicos e SLOs afetados.
- [x] Registrar evidencias com links para dashboard, trace e logs.
- [x] Criar runbooks para erro alto, latencia alta e dependencia indisponivel.
- [x] Registrar causa raiz e acoes preventivas no encerramento.

Criterio de aceite:

- Um alerta pode virar incidente investigavel dentro da plataforma.
- A investigacao preserva sintomas, evidencias, hipoteses e decisao final.

Verificacao:

- [x] Testes unitarios para regras de estado do incidente.
- [x] Teste e2e para abrir, atualizar e encerrar incidente.
- [x] Roteiro manual de investigacao usando um alerta simulado.
- [x] `npm run check`

Status:

- Concluido na branch `p2.7-guided-incident-investigation` com commit
  `c52f304` (`feat: add guided incident investigation`). Validado em
  2026-09-16 com `npm run check`; o e2e confirmou o fluxo de incidente da
  abertura ate a resolucao. Atencao: nao ha PR associado a essa branch no GitHub
  no momento desta auditoria.

## Prioridade P3: fortalecer o `OptiFlow`

Objetivo: sair de heuristica isolada para comparacao justificavel entre
estrategias.

### P3.1 Fechar formulacao matematica

- [x] Documentar conjuntos, parametros, variaveis de decisao, funcao objetivo e
  restricoes.
- [x] Explicar diferenca entre restricoes duras e penalidades.
- [x] Mapear cada campo do JSON de cenario para a formulacao.
- [x] Registrar limitacoes conhecidas da primeira versao.

Criterio de aceite:

- A formulacao permite implementar um solver sem ambiguidade.
- Um cenario pequeno pode ser resolvido manualmente ou conferido por tabela.

Verificacao:

- [x] Revisao manual do documento.
- [x] Exemplo calculado usando `data/scenarios/small-delivery.json`.
- [x] `npm test`
- [x] `npm run scenario:small`

Status:

- Concluido. A formulacao deterministica inicial vive em
  [mathematical-formulation.md](mathematical-formulation.md) e documenta o
  modelo-alvo para solver, o mapeamento do JSON e o calculo manual do cenario
  `small-delivery-v1`.

### P3.2 Criar cenarios deterministicos de benchmark

- [x] Adicionar cenario minimo com solucao obvia.
- [x] Adicionar cenario com capacidade insuficiente.
- [x] Adicionar cenario com janelas de tempo que geram atraso.
- [x] Adicionar cenario com multiplos veiculos e trade-off de custo.
- [x] Documentar resultado esperado de cada cenario.

Criterio de aceite:

- Cada cenario testa uma propriedade especifica do motor.
- Os resultados sao estaveis e reproduziveis.

Verificacao:

- [x] Testes automatizados carregando todos os cenarios.
- [x] `npm test`
- [x] `npm run scenario:small`

Status:

- Concluido. Os benchmarks deterministicos vivem em `data/scenarios` com
  resultados esperados documentados em
  [benchmark-scenarios.md](benchmark-scenarios.md). A suite automatizada carrega
  todos os cenarios, valida entradas, executa a heuristica e confere metricas
  estaveis.

### P3.3 Integrar solver para comparacao

- [x] Escolher integracao com OR-Tools ou solver alternativo justificado.
- [x] Implementar estrategia de solver com a mesma entrada da heuristica.
- [x] Garantir timeout e resultado parcial ou erro controlado.
- [x] Preservar saida comum de `RoutePlan`.

Criterio de aceite:

- A heuristica e o solver rodam sobre o mesmo cenario.
- O solver respeita capacidade e estrutura basica das rotas.
- Falhas de solver retornam erro explicavel.

Verificacao:

- [x] Testes unitarios para adaptador do solver.
- [x] Testes de comparacao em cenario pequeno.
- [x] `npm test`
- [x] `npm run scenario:small`

Status:

- Concluido. A estrategia `exact-enumeration` foi adicionada como solver
  alternativo limitado e documentado em [solver-strategies.md](solver-strategies.md).
  Ela roda sobre o mesmo JSON da heuristica, preserva `RoutePlan`, melhora o
  custo do cenario pequeno de 792 para 744 e retorna erro explicavel quando o
  limite configurado e excedido.

### P3.4 Comparar heuristica versus solver

- [x] Criar funcao de comparacao entre planos.
- [x] Calcular ganho de custo, distancia, atraso, pedidos atendidos e utilizacao.
- [x] Criar script para rodar benchmark em cenarios versionados.
- [x] Exibir resultado em formato legivel para portfolio.

Criterio de aceite:

- A comparacao mostra quando o solver melhora, empata ou piora metricas.
- A saida explica trade-offs em vez de apenas declarar um vencedor.

Verificacao:

- [x] Testes unitarios para calculo de ganho e regressao de metricas.
- [x] Snapshot ou fixture textual do benchmark.
- [x] `npm test`

Status:

- Concluido. `compareStrategies` calcula deltas entre heuristica e solver, e o
  script `npm run benchmark:compare` gera uma saida legivel para portfolio sobre
  todos os cenarios versionados.

### P3.5 Implementar restricoes configuraveis

- [x] Definir schema para habilitar restricoes por cenario.
- [x] Implementar jornada maxima por veiculo.
- [x] Implementar janela de tempo como restricao dura opcional.
- [x] Implementar pedidos obrigatorios versus opcionais.
- [x] Garantir mensagens de validacao claras para restricoes invalidas.

Criterio de aceite:

- O mesmo cenario pode ser executado com restricoes diferentes.
- O resultado mostra quais pedidos ficaram inviaveis e por que.

Verificacao:

- [x] Testes de validacao de schema.
- [x] Testes de rotas com restricoes ligadas e desligadas.
- [x] `npm test`

Status:

- Concluido. `constraints` permite ativar deadlines duros, jornada maxima por
  recurso e demandas obrigatorias. O resultado agora inclui
  `unassignedOrderDetails` com motivo e obrigatoriedade para demandas inviaveis.

### P3.6 Persistir cenarios, execucoes e resultados

- [x] Escolher persistencia inicial alinhada ao backend futuro.
- [x] Modelar `scenario`, `optimization_run`, `route_plan` e metricas.
- [x] Registrar status, inicio, fim, estrategia, erro e duracao.
- [x] Criar fixtures ou migrations iniciais.

Criterio de aceite:

- Uma execucao pode ser recuperada depois de concluida.
- O historico preserva entrada, estrategia usada e resultado.

Verificacao:

- [x] Testes de repositorio para persistir e recuperar execucoes concluidas e
  falhas.
- [x] Script `npm run scenario:small:history` demonstrando criar, executar e
  consultar historico.

Status:

- Concluido. A persistencia inicial usa um arquivo JSON local versionado em
  `.optiflow/optimization-history.json`, com colecoes separadas para cenarios,
  execucoes, planos e metricas. A decisao esta documentada em
  [optimization-history.md](optimization-history.md).

### P3.7 Criar API de cenarios e execucoes

- [x] Criar endpoint para criar cenario.
- [x] Criar endpoint para validar cenario.
- [x] Criar endpoint para iniciar execucao.
- [x] Criar endpoint para consultar status e resultado.
- [x] Padronizar erros de validacao.

Criterio de aceite:

- Um cliente HTTP consegue criar, validar, executar e consultar um cenario.
- A API nao bloqueia indefinidamente em execucoes longas.

Verificacao:

- [x] Testes unitarios de handlers.
- [x] Testes e2e do fluxo principal.
- [x] Documentacao com exemplos `curl`.

Status:

- Concluido. A primeira API HTTP local usa `node:http`, cria e valida cenarios,
  executa otimizacoes de forma sincrona e consulta resultados persistidos no
  historico da P3.6. Execucao assincrona fica para P3.8.

### P3.8 Criar processamento assincrono de otimizacao

- [x] Escolher fila ou mecanismo local inicial.
- [x] Executar otimizacoes fora do request HTTP.
- [x] Implementar status `QUEUED`, `RUNNING`, `SUCCEEDED` e `FAILED`.
- [x] Implementar tentativas, timeout e limite de concorrencia.
- [x] Registrar erro explicavel quando a execucao falhar.

Criterio de aceite:

- Uma execucao longa nao derruba nem bloqueia a API.
- Falhas sao persistidas e consultaveis.

Verificacao:

- [x] Testes unitarios para maquina de estados.
- [x] Teste de integracao com job bem-sucedido e job falho.

Status:

- Concluido. A API agora enfileira execucoes em uma fila local em memoria,
  retorna `QUEUED` sem bloquear o request inicial e um worker in-process atualiza
  o historico para `RUNNING`, `SUCCEEDED` ou `FAILED`, com tentativas, timeout e
  limite de concorrencia configuraveis.

### P3.9 Preparar simulacao estatistica

- [ ] Definir variaveis incertas iniciais: tempo de viagem, demanda,
  cancelamento ou capacidade.
- [ ] Criar gerador sintetico com distribuicoes e parametros documentados.
- [ ] Implementar estatisticas descritivas por plano.
- [ ] Implementar Monte Carlo para avaliar plano fixo.
- [ ] Calcular media, mediana, P90/P95, pior caso observado e probabilidade de
  atraso.

Criterio de aceite:

- Um plano deterministico pode ser avaliado contra muitos cenarios amostrados.
- As premissas estatisticas ficam explicitas no resultado.

Verificacao:

- Testes unitarios com semente fixa.
- Testes de percentis e estatisticas descritivas.
- Script de simulacao reproduzivel.

### P3.10 Avaliar decisao orientada a risco com CVaR

- [ ] Definir metrica de risco inicial para custo, atraso ou pedidos nao
  atendidos.
- [ ] Implementar calculo de VaR e CVaR sobre resultados simulados.
- [ ] Comparar decisao por menor custo medio versus decisao por risco.
- [ ] Documentar quando uma solucao mais cara pode ser operacionalmente melhor.

Criterio de aceite:

- O `OptiFlow` consegue explicar uma recomendacao usando media e risco.
- O resultado mostra o trade-off entre eficiencia esperada e pior caso
  plausivel.

Verificacao:

- Testes unitarios para VaR e CVaR com dataset pequeno conhecido.
- Teste de comparacao entre duas estrategias simuladas.
- Script de simulacao reproduzivel.
- `npm test`

### P3.11 Criar interface para editar e comparar cenarios

- [ ] Definir experiencia principal para criar, editar e duplicar cenarios.
- [ ] Criar tela ou prototipo funcional para visualizar entradas do cenario.
- [ ] Exibir status de execucao e resultado do plano.
- [ ] Exibir comparacao entre heuristica e solver.
- [ ] Destacar custo, distancia, atraso, pedidos atendidos e utilizacao.

Criterio de aceite:

- Uma pessoa consegue entender e comparar dois cenarios sem ler JSON bruto.
- A interface mostra claramente entradas, resultado e trade-offs.

Verificacao:

- Testes de componentes ou fluxo principal da interface.
- Smoke manual criando ou carregando cenario e comparando resultados.
- Screenshot ou roteiro de demonstracao documentado.

### P3.12 Preparar Docker, CI e demonstracao do `OptiFlow`

- [ ] Criar Dockerfile ou Compose local para API, worker e banco quando essas
  camadas existirem.
- [ ] Configurar CI com testes e checks do projeto.
- [ ] Adicionar comando unico de demonstracao local.
- [ ] Documentar variaveis de ambiente, portas e problemas conhecidos.
- [ ] Garantir que a demo rode sem depender dos outros repositorios.

Criterio de aceite:

- O `OptiFlow` pode ser executado e validado por outra pessoa como projeto
  independente.
- O CI verifica o nucleo de otimizacao e os fluxos principais adicionados.

Verificacao:

- `npm test`
- `npm run scenario:small`
- Execucao local via Docker quando disponivel.
- Ultima execucao verde do CI.

## Prioridade P4: integracao entre os projetos

Objetivo: mostrar a narrativa completa sem transformar os repositorios em um
monolito.

### P4.1 Conectar traces do `sales-event-project` na plataforma

- [ ] Configurar `sales-event-project` para exportar OTLP para o Collector da
  plataforma.
- [ ] Garantir nomes de servico distintos para API e worker.
- [ ] Preservar correlacao entre HTTP, RabbitMQ e worker.
- [ ] Documentar setup local com os dois repositorios.

Criterio de aceite:

- Uma venda real aparece no Tempo/Grafana com spans de API e worker.
- Logs e metricas podem ser filtrados pelo mesmo identificador.

Verificacao:

- `make test-integration` no `sales-event-project`.
- `npm run smoke:observability` na plataforma.
- Roteiro manual com evidencia no Grafana.

### P4.2 Criar dashboard da jornada de venda na plataforma

- [ ] Criar dashboard consolidado para venda, pagamento, outbox, ticket, email e
  check-in.
- [ ] Adicionar links para logs e traces.
- [ ] Adicionar paineis para falhas controladas.
- [ ] Documentar investigacao de uma venda com problema.

Criterio de aceite:

- O dashboard permite responder onde a venda parou e qual sintoma ocorreu.
- O roteiro de incidente usa metricas, logs e traces.

Verificacao:

- Smoke manual com venda aprovada.
- Smoke manual com falha de email ou pagamento duplicado.
- Evidencia documentada no roteiro de demo.

### P4.3 Gerar dados do `sales-event-project` para o `OptiFlow`

- [ ] Definir formato de exportacao de pedidos ou historico operacional.
- [ ] Criar script de exportacao no `sales-event-project` ou fixture
  compartilhavel.
- [ ] Criar importador no `OptiFlow` para transformar dados em `Scenario`.
- [ ] Validar o cenario importado com o validador existente.

Criterio de aceite:

- Dados de vendas/pedidos podem virar um cenario reproduzivel no `OptiFlow`.
- O importador falha com mensagens claras quando o dado de origem estiver
  incompleto.

Verificacao:

- Teste unitario do mapeamento.
- Fixture de exportacao versionada.
- `npm test`
- `npm run scenario:small` ou script equivalente do cenario importado.

### P4.4 Expor metricas de execucao do `OptiFlow`

- [ ] Definir metricas de otimizacao: duracao, status, estrategia, custo,
  atraso, distancia e pedidos nao alocados.
- [ ] Expor metricas Prometheus ou OTLP.
- [ ] Incluir `optimization_run_id` e `correlation_id` nos logs.
- [ ] Criar painel inicial na plataforma.

Criterio de aceite:

- Uma execucao do `OptiFlow` pode ser observada como operacao.
- O resultado da otimizacao aparece junto de metricas tecnicas de execucao.

Verificacao:

- Testes de serializacao/exportacao de metricas.
- Smoke manual consultando metricas ou visualizando no Grafana.
- `npm test`

## Prioridade P5: entrega de portfolio

Objetivo: tornar os tres projetos demonstraveis por outra pessoa.

### P5.1 Criar documentacao final de execucao local

- [ ] Criar guia de setup por projeto.
- [ ] Criar guia de demonstracao integrada.
- [ ] Documentar portas, variaveis, comandos e problemas conhecidos.
- [ ] Indicar tempo esperado de subida da stack.

Criterio de aceite:

- Uma pessoa consegue rodar cada projeto isoladamente.
- Uma pessoa consegue rodar a demonstracao integrada seguindo o guia.

Verificacao:

- Execucao do guia em ambiente local reiniciado.
- Comandos base dos tres projetos passando.

### P5.2 Criar diagramas finais

- [ ] Criar diagrama de arquitetura por projeto.
- [ ] Criar diagrama da jornada de venda observavel.
- [ ] Criar diagrama de dados entre venda, observabilidade e otimizacao.
- [ ] Criar diagrama do fluxo de execucao do `OptiFlow`.

Criterio de aceite:

- Os diagramas explicam responsabilidades sem exigir leitura do codigo.
- Os diagramas estao linkados nos READMEs ou docs principais.

Verificacao:

- Revisao manual dos diagramas.
- Renderizacao local quando usar Mermaid ou ferramenta equivalente.

### P5.3 Criar roteiro de demo gravavel

- [ ] Escrever roteiro de 5 a 10 minutos.
- [ ] Incluir uma venda bem-sucedida.
- [ ] Incluir uma falha investigada com observabilidade.
- [ ] Incluir uma comparacao de otimizacao no `OptiFlow`.
- [ ] Incluir conclusao sobre decisoes melhores a partir dos dados.

Criterio de aceite:

- O roteiro demonstra competencias de backend, observabilidade e decisao
  operacional.
- Cada passo tem comando, tela ou evidencia esperada.

Verificacao:

- Ensaio local completo.
- Ajustes registrados apos o primeiro ensaio.

### P5.4 Preparar CI e badges consistentes

- [ ] Garantir CI do `sales-event-project`.
- [ ] Garantir CI da `operational-observability-platform`.
- [ ] Garantir CI do `OptiFlow`.
- [ ] Adicionar badges apenas quando refletirem checks reais.
- [ ] Padronizar comandos de qualidade nos READMEs.

Criterio de aceite:

- Cada repositorio tem validacao automatica minima.
- O README nao promete qualidade que o CI nao verifica.

Verificacao:

- Ultima execucao verde nos tres repositorios.
- Links dos workflows nos READMEs ou na pagina do repositorio.

## Ordem recomendada de ataque

1. P0.1 e P0.2 para fechar a linguagem comum do portfolio.
2. P1.2 e P1.3 antes de OpenTelemetry, porque tracing sem correlacao clara fica
   fragil.
3. P1.4 a P1.7 para consolidar a demonstracao de negocio real.
4. P2.1 a P2.4 para observar o fluxo real com metricas, logs e traces.
5. P2.5 a P2.7 para transformar observacao em SLO, alerta e investigacao.
6. P3.1 a P3.4 para provar valor do `OptiFlow` com comparacao mensuravel.
7. P3.5 a P3.12 para evoluir restricoes, persistencia, API, simulacao,
   interface e entrega independente.
8. P4.1 a P4.4 para costurar a narrativa entre repositorios.
9. P5.1 a P5.4 para transformar tudo em material de portfolio.
